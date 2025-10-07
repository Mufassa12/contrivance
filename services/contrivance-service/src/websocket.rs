use actix::prelude::*;
use actix_web_actors::ws;
use common::WebSocketMessage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use tracing::{info, warn, error};

/// WebSocket connection manager
pub struct ConnectionManager {
    // Map of spreadsheet_id -> list of connection actors
    connections: HashMap<Uuid, Vec<Addr<WebSocketConnection>>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: HashMap::new(),
        }
    }

    /// Add connection to a spreadsheet
    pub fn add_connection(&mut self, spreadsheet_id: Uuid, addr: Addr<WebSocketConnection>) {
        let connections = self.connections.entry(spreadsheet_id).or_insert_with(Vec::new);
        connections.push(addr);
        info!("Added connection to spreadsheet {}", spreadsheet_id);
    }

    /// Remove connection from a spreadsheet
    pub fn remove_connection(&mut self, spreadsheet_id: Uuid, addr: &Addr<WebSocketConnection>) {
        if let Some(connections) = self.connections.get_mut(&spreadsheet_id) {
            connections.retain(|conn| !conn.eq(addr));
            if connections.is_empty() {
                self.connections.remove(&spreadsheet_id);
            }
        }
    }

    /// Broadcast message to all connections of a spreadsheet
    pub async fn broadcast_to_spreadsheet(&self, spreadsheet_id: Uuid, message: WebSocketMessage) {
        if let Some(connections) = self.connections.get(&spreadsheet_id) {
            let message_json = match serde_json::to_string(&message) {
                Ok(json) => json,
                Err(e) => {
                    error!("Failed to serialize WebSocket message: {}", e);
                    return;
                }
            };

            for connection in connections {
                connection.do_send(SendMessage(message_json.clone()));
            }
        }
    }

    /// Get connection count for a spreadsheet
    pub fn get_connection_count(&self, spreadsheet_id: Uuid) -> usize {
        self.connections.get(&spreadsheet_id).map_or(0, |conns| conns.len())
    }
}

/// WebSocket connection actor
pub struct WebSocketConnection {
    pub user_id: Uuid,
    pub spreadsheet_id: Uuid,
    pub connection_manager: Arc<RwLock<ConnectionManager>>,
}

impl WebSocketConnection {
    pub fn new(
        user_id: Uuid,
        spreadsheet_id: Uuid,
        connection_manager: Arc<RwLock<ConnectionManager>>,
    ) -> Self {
        Self {
            user_id,
            spreadsheet_id,
            connection_manager,
        }
    }
}

impl Actor for WebSocketConnection {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        info!("WebSocket connection started for user {} in spreadsheet {}", 
              self.user_id, self.spreadsheet_id);
        
        // Add this connection to the manager
        let addr = ctx.address();
        let spreadsheet_id = self.spreadsheet_id;
        let connection_manager = self.connection_manager.clone();
        
        actix::spawn(async move {
            let mut manager = connection_manager.write().await;
            manager.add_connection(spreadsheet_id, addr);
        });
    }

    fn stopped(&mut self, ctx: &mut Self::Context) {
        info!("WebSocket connection stopped for user {} in spreadsheet {}", 
              self.user_id, self.spreadsheet_id);
        
        // Remove this connection from the manager
        let addr = ctx.address();
        let spreadsheet_id = self.spreadsheet_id;
        let connection_manager = self.connection_manager.clone();
        
        actix::spawn(async move {
            let mut manager = connection_manager.write().await;
            manager.remove_connection(spreadsheet_id, &addr);
        });
    }
}

/// Message to send to WebSocket connection
#[derive(Message)]
#[rtype(result = "()")]
pub struct SendMessage(pub String);

impl Handler<SendMessage> for WebSocketConnection {
    type Result = ();

    fn handle(&mut self, msg: SendMessage, ctx: &mut Self::Context) {
        ctx.text(msg.0);
    }
}

/// Handle WebSocket messages from client
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WebSocketConnection {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                // Handle pong
            }
            Ok(ws::Message::Text(text)) => {
                // Parse incoming message
                match serde_json::from_str::<WebSocketMessage>(&text) {
                    Ok(WebSocketMessage::Ping) => {
                        // Respond with pong
                        let pong_msg = WebSocketMessage::Pong;
                        if let Ok(json) = serde_json::to_string(&pong_msg) {
                            ctx.text(json);
                        }
                    }
                    Ok(message) => {
                        // Handle other message types
                        info!("Received WebSocket message: {:?}", message);
                        // Here you would typically process the message and potentially broadcast it
                    }
                    Err(e) => {
                        warn!("Failed to parse WebSocket message: {}", e);
                        let error_msg = WebSocketMessage::Error {
                            message: "Invalid message format".to_string(),
                            code: Some("INVALID_FORMAT".to_string()),
                        };
                        if let Ok(json) = serde_json::to_string(&error_msg) {
                            ctx.text(json);
                        }
                    }
                }
            }
            Ok(ws::Message::Binary(_)) => {
                warn!("Binary messages not supported");
            }
            Ok(ws::Message::Close(reason)) => {
                info!("WebSocket connection closed: {:?}", reason);
                ctx.stop();
            }
            Err(e) => {
                error!("WebSocket error: {}", e);
                ctx.stop();
            }
            _ => {}
        }
    }
}

/// Broadcast a message to all connections in a spreadsheet
pub async fn broadcast_message(
    connection_manager: Arc<RwLock<ConnectionManager>>,
    spreadsheet_id: Uuid,
    message: WebSocketMessage,
) {
    let manager = connection_manager.read().await;
    manager.broadcast_to_spreadsheet(spreadsheet_id, message).await;
}