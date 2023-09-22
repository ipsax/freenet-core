//! Change from state_machine to a simple "Operation" trait

use std::pin::Pin;

use futures::Future;

use crate::{
    client_events::ClientId,
    message::{InnerMessage, Transaction},
    node::OpManager,
    operations::{OpError, OpInitialization, OperationResult},
};

pub(crate) trait Operation<CB>
where
    Self: Sized + TryInto<Self::Result>,
{
    type Message: InnerMessage;

    type Result;

    fn load_or_init(
        op_storage: &OpManager,
        msg: &Self::Message,
    ) -> Result<OpInitialization<Self>, OpError>;

    //     fn new(transaction: Transaction, builder: Self::Builder) -> Self;

    fn id(&self) -> &Transaction;

    #[allow(clippy::type_complexity)]
    fn process_message<'a>(
        self,
        conn_manager: &'a mut CB,
        op_storage: &'a OpManager,
        input: Self::Message,
        client_id: Option<ClientId>,
    ) -> Pin<Box<dyn Future<Output = Result<OperationResult, OpError>> + Send + 'a>>;
}
