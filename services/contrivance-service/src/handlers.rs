use actix_web::{web, HttpResponse, HttpRequest};
use uuid::Uuid;
use crate::{
    repository::ContrivanceRepository,
    websocket::ConnectionManager,
    middleware::auth::get_user_from_request,
};
use common::WebSocketMessage;
use common::{
    CreateSpreadsheetRequest, UpdateSpreadsheetRequest,
    CreateRowRequest, UpdateRowRequest, PaginationParams, ApiResponse,
    ContrivanceError, CreateTodoRequest, UpdateTodoRequest,
};

pub struct ContrivanceHandlers {
    repository: ContrivanceRepository,
    connection_manager: web::Data<ConnectionManager>,
}

impl ContrivanceHandlers {
    pub fn new(repository: ContrivanceRepository, connection_manager: web::Data<ConnectionManager>) -> Self {
        Self {
            repository,
            connection_manager,
        }
    }

    /// Create a new spreadsheet
    pub async fn create_spreadsheet(
        &self,
        req: HttpRequest,
        payload: web::Json<CreateSpreadsheetRequest>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        
        // Log the incoming request for debugging
        tracing::info!("Creating spreadsheet with {} columns", 
            payload.columns.as_ref().map(|c| c.len()).unwrap_or(0));
        
        if let Some(columns) = &payload.columns {
            for (i, col) in columns.iter().enumerate() {
                tracing::info!("Column {}: name='{}', type={:?}, position={}", 
                    i, col.name, col.column_type, col.position);
            }
        }
        
        let spreadsheet = self.repository
            .create_spreadsheet(&payload, user.id)
            .await?;

        Ok(HttpResponse::Created().json(ApiResponse::success(spreadsheet)))
    }

    /// Get spreadsheet details
    pub async fn get_spreadsheet(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let spreadsheet_id = path.into_inner();

        // Check access permissions
        if !self.repository.can_user_access_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Access denied to this spreadsheet"));
        }

        let spreadsheet_details = self.repository
            .get_spreadsheet_details(spreadsheet_id)
            .await?;

        match spreadsheet_details {
            Some(details) => Ok(HttpResponse::Ok().json(ApiResponse::success(details))),
            None => Err(ContrivanceError::not_found("Spreadsheet not found")),
        }
    }

    /// List user's spreadsheets
    pub async fn list_spreadsheets(
        &self,
        req: HttpRequest,
        query: web::Query<PaginationParams>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        
        let spreadsheets = self.repository
            .list_spreadsheets(user.id, &query)
            .await?;

        Ok(HttpResponse::Ok().json(ApiResponse::success(spreadsheets)))
    }

    /// Update spreadsheet
    pub async fn update_spreadsheet(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
        payload: web::Json<UpdateSpreadsheetRequest>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let spreadsheet_id = path.into_inner();

        // Check edit permissions
        if !self.repository.can_user_edit_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Edit access denied to this spreadsheet"));
        }

        let spreadsheet = self.repository
            .update_spreadsheet(spreadsheet_id, &payload)
            .await?;

        // Notify collaborators of the update
        let message = WebSocketMessage::SpreadsheetUpdated {
            spreadsheet: spreadsheet.clone(),
            updated_by: user.id,
        };

        self.connection_manager
            .broadcast_to_spreadsheet(spreadsheet_id, message)
            .await;

        Ok(HttpResponse::Ok().json(ApiResponse::success(spreadsheet)))
    }

    /// Delete spreadsheet
    pub async fn delete_spreadsheet(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let spreadsheet_id = path.into_inner();

        // Check if user is owner
        let spreadsheet = self.repository
            .get_spreadsheet(spreadsheet_id)
            .await?
            .ok_or(ContrivanceError::not_found("Spreadsheet not found"))?;

        if spreadsheet.owner_id != user.id {
            return Err(ContrivanceError::forbidden("Only the owner can delete this spreadsheet"));
        }

        self.repository.delete_spreadsheet(spreadsheet_id).await?;

        // Notify all connected clients
        let message = WebSocketMessage::SpreadsheetDeleted {
            spreadsheet_id,
            deleted_by: user.id,
        };

        self.connection_manager
            .broadcast_to_spreadsheet(spreadsheet_id, message)
            .await;

        Ok(HttpResponse::NoContent().finish())
    }

    /// Get spreadsheet columns
    pub async fn get_columns(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let spreadsheet_id = path.into_inner();

        // Check access permissions
        if !self.repository.can_user_access_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Access denied to this spreadsheet"));
        }

        let columns = self.repository
            .get_spreadsheet_columns(spreadsheet_id)
            .await?;

        Ok(HttpResponse::Ok().json(ApiResponse::success(columns)))
    }

    /// Get spreadsheet rows
    pub async fn get_rows(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
        query: web::Query<PaginationParams>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let spreadsheet_id = path.into_inner();

        // Check access permissions
        if !self.repository.can_user_access_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Access denied to this spreadsheet"));
        }

        let rows = self.repository
            .get_spreadsheet_rows(spreadsheet_id, Some(&query))
            .await?;

        Ok(HttpResponse::Ok().json(ApiResponse::success(rows)))
    }

    /// Create a new row
    pub async fn create_row(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
        payload: web::Json<CreateRowRequest>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let spreadsheet_id = path.into_inner();

        // Check edit permissions
        if !self.repository.can_user_edit_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Edit access denied to this spreadsheet"));
        }

        let row = self.repository
            .create_row(spreadsheet_id, &payload, user.id)
            .await?;

        // Notify collaborators of the new row
        let message = WebSocketMessage::RowCreated {
            spreadsheet_id,
            row: row.clone(),
            created_by: user.id,
        };

        self.connection_manager
            .broadcast_to_spreadsheet(spreadsheet_id, message)
            .await;

        Ok(HttpResponse::Created().json(ApiResponse::success(row)))
    }

    /// Update a row
    pub async fn update_row(
        &self,
        req: HttpRequest,
        path: web::Path<(Uuid, Uuid)>,
        payload: web::Json<UpdateRowRequest>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let (spreadsheet_id, row_id) = path.into_inner();

        // Check edit permissions
        if !self.repository.can_user_edit_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Edit access denied to this spreadsheet"));
        }

        let row = self.repository
            .update_row(row_id, &payload, user.id)
            .await?;

        // Notify collaborators of the row update
        let message = WebSocketMessage::RowUpdated {
            spreadsheet_id,
            row: row.clone(),
            updated_by: user.id,
        };

        self.connection_manager
            .broadcast_to_spreadsheet(spreadsheet_id, message)
            .await;

        Ok(HttpResponse::Ok().json(ApiResponse::success(row)))
    }

    /// Delete a row
    pub async fn delete_row(
        &self,
        req: HttpRequest,
        path: web::Path<(Uuid, Uuid)>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let (spreadsheet_id, row_id) = path.into_inner();

        // Check edit permissions
        if !self.repository.can_user_edit_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Edit access denied to this spreadsheet"));
        }

        self.repository.delete_row(row_id).await?;

        // Notify collaborators of the row deletion
        let message = WebSocketMessage::RowDeleted {
            spreadsheet_id,
            row_id,
            deleted_by: user.id,
        };

        self.connection_manager
            .broadcast_to_spreadsheet(spreadsheet_id, message)
            .await;

        Ok(HttpResponse::NoContent().finish())
    }

    /// Get collaborators for a spreadsheet
    pub async fn get_collaborators(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let spreadsheet_id = path.into_inner();

        // Check access permissions
        if !self.repository.can_user_access_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Access denied to this spreadsheet"));
        }

        let collaborators = self.repository
            .get_collaborators_with_user_info(spreadsheet_id)
            .await?;

        Ok(HttpResponse::Ok().json(ApiResponse::success(collaborators)))
    }
}

// Function wrappers for actix-web handlers
pub async fn create_spreadsheet(
    req: HttpRequest,
    payload: web::Json<CreateSpreadsheetRequest>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    tracing::info!("Received create_spreadsheet request wrapper");
    data.create_spreadsheet(req, payload).await
}

pub async fn get_spreadsheet(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_spreadsheet(req, path).await
}

pub async fn list_spreadsheets(
    req: HttpRequest,
    query: web::Query<PaginationParams>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.list_spreadsheets(req, query).await
}

pub async fn update_spreadsheet(
    req: HttpRequest,
    path: web::Path<Uuid>,
    payload: web::Json<UpdateSpreadsheetRequest>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.update_spreadsheet(req, path, payload).await
}

pub async fn delete_spreadsheet(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.delete_spreadsheet(req, path).await
}

pub async fn get_columns(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_columns(req, path).await
}

pub async fn get_rows(
    req: HttpRequest,
    path: web::Path<Uuid>,
    query: web::Query<PaginationParams>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_rows(req, path, query).await
}

pub async fn create_row(
    req: HttpRequest,
    path: web::Path<Uuid>,
    payload: web::Json<CreateRowRequest>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.create_row(req, path, payload).await
}

pub async fn update_row(
    req: HttpRequest,
    path: web::Path<(Uuid, Uuid)>,
    payload: web::Json<UpdateRowRequest>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.update_row(req, path, payload).await
}

pub async fn delete_row(
    req: HttpRequest,
    path: web::Path<(Uuid, Uuid)>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.delete_row(req, path).await
}

pub async fn get_collaborators(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_collaborators(req, path).await
}

pub async fn get_spreadsheets(
    req: HttpRequest,
    query: web::Query<PaginationParams>,
    data: web::Data<ContrivanceHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.list_spreadsheets(req, query).await
}

// Todo handler functions with owner assignment support
pub async fn create_todo(
    req: HttpRequest,
    payload: web::Json<CreateTodoRequest>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.create_todo(req, payload).await
}

pub async fn get_todos(
    req: HttpRequest,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_todos(req).await
}

pub async fn get_todos_by_spreadsheet(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_todos_by_spreadsheet(req, path).await
}

pub async fn get_todos_by_row(
    req: HttpRequest,
    path: web::Path<(Uuid, Uuid)>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_todos_by_row(req, path).await
}

pub async fn get_todo_stats(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_todo_stats(req, path).await
}

pub async fn get_todo_by_id(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_todo_by_id(req, path).await
}

pub async fn update_todo(
    req: HttpRequest,
    path: web::Path<Uuid>,
    payload: web::Json<UpdateTodoRequest>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.update_todo(req, path, payload).await
}

pub async fn delete_todo(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.delete_todo(req, path).await
}

pub async fn complete_todo(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.complete_todo(req, path).await
}

pub async fn uncomplete_todo(
    req: HttpRequest,
    path: web::Path<Uuid>,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.uncomplete_todo(req, path).await
}

pub async fn get_users_for_assignment(
    req: HttpRequest,
    data: web::Data<crate::todo_handlers::TodoHandlers>,
) -> Result<HttpResponse, ContrivanceError> {
    data.get_users_for_assignment(req).await
}