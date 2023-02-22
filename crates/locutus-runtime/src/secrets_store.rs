use chacha20poly1305::{aead::Aead, Error as EncryptionError, XChaCha20Poly1305, XNonce};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::{collections::HashMap, fs, fs::File, iter::FromIterator, path::PathBuf, sync::Arc};

use crate::store::{StoreEntriesContainer, StoreFsManagement};
use crate::RuntimeResult;
use locutus_stdlib::prelude::*;

type SecretKey = [u8; 32];

#[derive(Serialize, Deserialize, Default)]
struct KeyToEncryptionMap(Vec<(ComponentKey, Vec<SecretKey>)>);

impl StoreEntriesContainer for KeyToEncryptionMap {
    type MemContainer = Arc<DashMap<ComponentKey, Vec<SecretKey>>>;
    type Key = ComponentKey;
    type Value = Vec<SecretKey>;

    fn update(self, container: &mut Self::MemContainer) {
        for (k, v) in self.0 {
            container.insert(k, v);
        }
    }

    fn replace(container: &Self::MemContainer) -> Self {
        KeyToEncryptionMap::from(&**container)
    }

    fn insert(container: &mut Self::MemContainer, key: Self::Key, value: Self::Value) {
        if let Some(element) = container.get(&key.clone()) {
            let mut secrets = element.value().clone();
            secrets.extend(value);
            container.insert(key, secrets);
        } else {
            container.insert(key, value);
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SecretStoreError {
    #[error("encryption error: {0}")]
    Encryption(EncryptionError),
    #[error(transparent)]
    IO(#[from] std::io::Error),
    #[error("missing cipher")]
    MissingCipher,
}

impl From<&DashMap<ComponentKey, Vec<SecretKey>>> for KeyToEncryptionMap {
    fn from(vals: &DashMap<ComponentKey, Vec<SecretKey>>) -> Self {
        let mut map = vec![];
        for r in vals.iter() {
            map.push((r.key().clone(), r.value().clone()));
        }
        Self(map)
    }
}

#[derive(Clone)]
struct Encryption {
    cipher: XChaCha20Poly1305,
    nonce: XNonce,
}

#[derive(Default)]
pub struct SecretsStore {
    base_path: PathBuf,
    ciphers: HashMap<ComponentKey, Encryption>,
    key_to_secret_part: Arc<DashMap<ComponentKey, Vec<SecretKey>>>,
}

static LOCK_FILE_PATH: once_cell::sync::OnceCell<PathBuf> = once_cell::sync::OnceCell::new();
static KEY_FILE_PATH: once_cell::sync::OnceCell<PathBuf> = once_cell::sync::OnceCell::new();

impl StoreFsManagement<KeyToEncryptionMap> for SecretsStore {}

impl SecretsStore {
    pub fn new(secrets_dir: PathBuf) -> RuntimeResult<Self> {
        let key_to_secret_part;
        let _ = LOCK_FILE_PATH.try_insert(secrets_dir.join("__LOCK"));
        let key_file = match KEY_FILE_PATH
            .try_insert(secrets_dir.join("KEY_DATA"))
            .map_err(|(e, _)| e)
        {
            Ok(f) => f,
            Err(f) => f,
        };
        if !key_file.exists() {
            std::fs::create_dir_all(&secrets_dir).map_err(|err| {
                tracing::error!("error creating component dir: {err}");
                err
            })?;
            key_to_secret_part = Arc::new(DashMap::new());
            File::create(secrets_dir.join("KEY_DATA"))?;
        } else {
            let map = Self::load_from_file(
                KEY_FILE_PATH.get().unwrap().as_path(),
                LOCK_FILE_PATH.get().unwrap().as_path(),
            )?;
            key_to_secret_part = Arc::new(DashMap::from_iter(map.0));
        }
        Self::watch_changes(
            key_to_secret_part.clone(),
            KEY_FILE_PATH.get().unwrap().as_path(),
            LOCK_FILE_PATH.get().unwrap().as_path(),
        )?;
        Ok(Self {
            base_path: secrets_dir,
            ciphers: HashMap::new(),
            key_to_secret_part,
        })
    }

    pub fn register_component(
        &mut self,
        component: ComponentKey,
        cipher: XChaCha20Poly1305,
        nonce: XNonce,
    ) -> Result<(), SecretStoreError> {
        // FIXME: store/initialize the cyphers from disc
        let encryption = Encryption { cipher, nonce };
        self.ciphers.insert(component, encryption);
        Ok(())
    }

    pub fn store_secret(
        &mut self,
        component: &ComponentKey,
        key: &SecretsId,
        plaintext: Vec<u8>,
    ) -> RuntimeResult<()> {
        let component_path = self.base_path.join(component.encode());
        let secret_file_path = component_path.join(key.encode());
        let secret_key = *key.code_hash();

        let encryption = self
            .ciphers
            .get(component)
            .ok_or(SecretStoreError::MissingCipher)?;
        let ciphertext = encryption
            .cipher
            .encrypt(&encryption.nonce, plaintext.as_ref())
            .map_err(SecretStoreError::Encryption)?;

        self.key_to_secret_part
            .insert(component.clone(), vec![secret_key]);

        fs::create_dir_all(&component_path)?;
        let mut file = File::create(secret_file_path)?;
        file.write_all(&ciphertext)?;
        Ok(())
    }

    pub fn remove_secret(
        &mut self,
        component: &ComponentKey,
        key: &SecretsId,
    ) -> Result<(), SecretStoreError> {
        let secret_path = self.base_path.join(component.encode()).join(key.encode());
        match fs::remove_file(secret_path) {
            Ok(_) => Ok(()),
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(err) => Err(err.into()),
        }
    }

    pub fn get_secret(
        &self,
        component: &ComponentKey,
        key: &SecretsId,
    ) -> Result<Vec<u8>, SecretStoreError> {
        let secret_path = self.base_path.join(component.encode()).join(key.encode());
        let encryption = self
            .ciphers
            .get(component)
            .ok_or(SecretStoreError::MissingCipher)?;
        let ciphertext = fs::read(secret_path)?;
        let plaintext = encryption
            .cipher
            .decrypt(&encryption.nonce, ciphertext.as_ref())
            .map_err(SecretStoreError::Encryption)?;
        Ok(plaintext)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use chacha20poly1305::aead::{AeadCore, KeyInit, OsRng};

    #[test]
    fn store_and_load() -> Result<(), Box<dyn std::error::Error>> {
        let secrets_dir = std::env::temp_dir()
            .join("locutus-test")
            .join("secrets-store-test");
        std::fs::create_dir_all(&secrets_dir)?;

        let mut store = SecretsStore::new(secrets_dir)?;

        let component = Component::from(vec![0, 1, 2]);

        let cipher = XChaCha20Poly1305::new(&XChaCha20Poly1305::generate_key(&mut OsRng));
        let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);
        let secret_id = SecretsId::new(vec![0, 1, 2]);
        let text = vec![0, 1, 2];

        store.register_component(component.key().clone(), cipher, nonce)?;
        store.store_secret(component.key(), &secret_id, text)?;
        let f = store.get_secret(component.key(), &secret_id);

        assert!(f.is_ok());
        Ok(())
    }
}