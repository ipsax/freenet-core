use wasm_bindgen::{prelude::Closure, JsCast};
use web_sys::{ErrorEvent, MessageEvent};

use super::{client_events::ClientRequest, Error, HostResult};

type Connection = web_sys::WebSocket;

pub struct WebApi {
    conn: Connection,
    error_handler: Box<dyn FnMut(Error) + 'static>,
}

impl WebApi {
    pub fn start<ErrFn>(
        conn: Connection,
        mut result_handler: impl FnMut(HostResult) + 'static,
        error_handler: ErrFn,
        onopen_handler: impl FnOnce() + 'static,
    ) -> Self
    where
        ErrFn: FnMut(Error) + Clone + 'static,
    {
        let mut eh = error_handler.clone();
        let onmessage_callback = Closure::<dyn FnMut(_)>::new(move |e: MessageEvent| {
            let v: serde_json::Value = serde_wasm_bindgen::from_value(e.data()).unwrap();
            eh(Error::ConnectionError(serde_json::json!({
                "got data": format!("{:?}", v)
            })));
            let bytes: Vec<u8> = match serde_wasm_bindgen::from_value(e.data()) {
                Ok(val) => val,
                Err(err) => {
                    eh(Error::ConnectionError(serde_json::json!({
                        "error": format!("{err}"), "source": "host response raw bytes deser"
                    })));
                    return;
                }
            };
            let response: HostResult = match rmp_serde::from_slice(&bytes) {
                Ok(val) => val,
                Err(err) => {
                    eh(Error::ConnectionError(serde_json::json!({
                        "error": format!("{err}"), "source": "host response deser"
                    })));
                    return;
                }
            };
            result_handler(response);
        });
        conn.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
        onmessage_callback.forget();

        let mut eh = error_handler.clone();
        let onerror_callback = Closure::<dyn FnMut(_)>::new(move |e: ErrorEvent| {
            let error = format!(
                "error: {file}:{lineno}: {msg}",
                file = e.filename(),
                lineno = e.lineno(),
                msg = e.message()
            );
            eh(Error::ConnectionError(serde_json::json!({
                "error": error, "source": "exec error"
            })));
        });
        conn.set_onerror(Some(onerror_callback.as_ref().unchecked_ref()));
        onerror_callback.forget();

        let onopen_callback = Closure::<dyn FnOnce()>::once(move || {
            onopen_handler();
        });
        // conn.add_event_listener_with_callback("open", onopen_callback.as_ref().unchecked_ref());
        conn.set_onopen(Some(onopen_callback.as_ref().unchecked_ref()));
        onopen_callback.forget();

        let mut eh = error_handler.clone();
        let onclose_callback = Closure::<dyn FnOnce()>::once(move || {
            tracing::warn!("connection closed");
            eh(Error::ConnectionError(
                serde_json::json!({ "error": "connection closed", "source": "close" }),
            ));
        });
        conn.set_onclose(Some(onclose_callback.as_ref().unchecked_ref()));

        conn.set_binary_type(web_sys::BinaryType::Blob);
        WebApi {
            conn,
            error_handler: Box::new(error_handler),
        }
    }

    pub async fn send(&mut self, request: ClientRequest<'static>) -> Result<(), Error> {
        (self.error_handler)(Error::ConnectionError(serde_json::json!({
            "request": format!("{request:?}"),
            "action": "sending request"
        })));
        let send = rmp_serde::to_vec(&request)?;
        (self.error_handler)(Error::ConnectionError(serde_json::json!({
            "request": format!("{send:?}"),
            "action": "sending raw request"
        })));
        self.conn.send_with_u8_array(&send).map_err(|err| {
            let err: serde_json::Value = match serde_wasm_bindgen::from_value(err) {
                Ok(e) => e,
                Err(e) => {
                    let e = serde_json::json!({
                        "error": format!("{e}"),
                        "origin": "request serialization",
                        "request": format!("{request:?}"),
                    });
                    (self.error_handler)(Error::ConnectionError(e.clone()));
                    return Error::ConnectionError(e);
                }
            };
            (self.error_handler)(Error::ConnectionError(serde_json::json!({
                "error": err,
                "origin": "request sending",
                "request": format!("{request:?}"),
            })));
            Error::ConnectionError(err)
        })?;
        Ok(())
    }

    pub fn disconnect(self, cause: impl AsRef<str>) {
        let _ = self.conn.close_with_code_and_reason(1000, cause.as_ref());
    }
}
