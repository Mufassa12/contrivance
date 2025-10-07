use actix_web::{web, HttpResponse, HttpRequest};
use uuid::Uuid;
use crate::{
    repository::ContrivanceRepository,
    websocket::ConnectionManager,
    middleware::auth::get_user_from_request,
};
use common::{
    ContrivanceResult, ContrivanceError, CreateTodoRequest, UpdateTodoRequest,
    ApiResponse, Todo, TodoStats,
};

pub struct TodoHandlers {
    repository: ContrivanceRepository,
    connection_manager: web::Data<ConnectionManager>,
}

impl TodoHandlers {
    pub fn new(repository: ContrivanceRepository, connection_manager: web::Data<ConnectionManager>) -> Self {
        Self {
            repository,
            connection_manager,
        }
    }

    /// Create a new todo
    pub async fn create_todo(
        &self,
        req: HttpRequest,
        payload: web::Json<CreateTodoRequest>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        
        let todo = self.repository
            .create_todo(&payload, user.id)
            .await?;

        Ok(HttpResponse::Created().json(ApiResponse::success(todo)))
    }

    /// Get todos for a spreadsheet (pipeline-level)
    pub async fn get_todos_by_spreadsheet(
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

        let todos = self.repository
            .get_todos_by_spreadsheet(spreadsheet_id, user.id)
            .await?;

        Ok(HttpResponse::Ok().json(ApiResponse::success(todos)))
    }

    /// Get todos for a specific row
    pub async fn get_todos_by_row(
        &self,
        req: HttpRequest,
        path: web::Path<(Uuid, Uuid)>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let (spreadsheet_id, row_id) = path.into_inner();

        // Check access permissions
        if !self.repository.can_user_access_spreadsheet(user.id, spreadsheet_id).await? {
            return Err(ContrivanceError::forbidden("Access denied to this spreadsheet"));
        }

        let todos = self.repository
            .get_todos_by_row(spreadsheet_id, row_id, user.id)
            .await?;

        Ok(HttpResponse::Ok().json(ApiResponse::success(todos)))
    }

    /// Get todo statistics for a spreadsheet
    pub async fn get_todo_stats(
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

        let stats = self.repository
            .get_todo_stats(spreadsheet_id, user.id)
            .await?;

        Ok(HttpResponse::Ok().json(ApiResponse::success(stats)))
    }

    /// Get a specific todo by ID
    pub async fn get_todo_by_id(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let todo_id = path.into_inner();

        let todo = self.repository
            .get_todo_by_id(todo_id, user.id)
            .await?;

        match todo {
            Some(todo) => Ok(HttpResponse::Ok().json(ApiResponse::success(todo))),
            None => Err(ContrivanceError::not_found("Todo not found")),
        }
    }

    /// Update a todo
    pub async fn update_todo(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
        payload: web::Json<UpdateTodoRequest>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let todo_id = path.into_inner();

        let todo = self.repository
            .update_todo(todo_id, &payload, user.id)
            .await?;

        match todo {
            Some(todo) => Ok(HttpResponse::Ok().json(ApiResponse::success(todo))),
            None => Err(ContrivanceError::not_found("Todo not found")),
        }
    }

    /// Delete a todo
    pub async fn delete_todo(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let todo_id = path.into_inner();

        let deleted = self.repository
            .delete_todo(todo_id, user.id)
            .await?;

        if deleted {
            Ok(HttpResponse::Ok().json(ApiResponse::success("Todo deleted successfully")))
        } else {
            Err(ContrivanceError::not_found("Todo not found"))
        }
    }

    /// Mark a todo as completed
    pub async fn complete_todo(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let todo_id = path.into_inner();

        let todo = self.repository
            .update_todo_completion(todo_id, true, user.id)
            .await?;

        match todo {
            Some(todo) => Ok(HttpResponse::Ok().json(ApiResponse::success(todo))),
            None => Err(ContrivanceError::not_found("Todo not found")),
        }
    }

    /// Mark a todo as not completed
    pub async fn uncomplete_todo(
        &self,
        req: HttpRequest,
        path: web::Path<Uuid>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let user = get_user_from_request(&req)?;
        let todo_id = path.into_inner();

        let todo = self.repository
            .update_todo_completion(todo_id, false, user.id)
            .await?;

        match todo {
            Some(todo) => Ok(HttpResponse::Ok().json(ApiResponse::success(todo))),
            None => Err(ContrivanceError::not_found("Todo not found")),
        }
    }
}