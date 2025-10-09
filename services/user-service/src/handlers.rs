use actix_web::{web, HttpRequest, HttpResponse, Result};
use common::{ApiResponse, UpdateUserRequest, PaginationParams, HttpUtils};
use crate::service::UserService;
use uuid::Uuid;
use tracing::{info, warn, error};

/// Get current user profile
pub async fn get_current_user(
    user_service: web::Data<UserService>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let user_id = match extract_user_id_from_token(&user_service, &req).await {
        Ok(id) => id,
        Err(response) => return Ok(response),
    };

    match user_service.get_user(user_id, user_id).await {
        Ok(user) => {
            Ok(HttpResponse::Ok().json(ApiResponse::success(user)))
        }
        Err(err) => {
            warn!("Failed to get current user: {}", err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Get user by ID
pub async fn get_user(
    user_service: web::Data<UserService>,
    path: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    let requesting_user_id = match extract_user_id_from_token(&user_service, &req).await {
        Ok(id) => id,
        Err(response) => return Ok(response),
    };

    match user_service.get_user(user_id, requesting_user_id).await {
        Ok(user) => {
            Ok(HttpResponse::Ok().json(ApiResponse::success(user)))
        }
        Err(err) => {
            warn!("Failed to get user {}: {}", user_id, err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// List users with pagination
pub async fn list_users(
    user_service: web::Data<UserService>,
    query: web::Query<PaginationParams>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let requesting_user_id = match extract_user_id_from_token(&user_service, &req).await {
        Ok(id) => id,
        Err(response) => return Ok(response),
    };

    match user_service.list_users(query.into_inner(), requesting_user_id).await {
        Ok(users) => {
            Ok(HttpResponse::Ok().json(ApiResponse::success(users)))
        }
        Err(err) => {
            warn!("Failed to list users: {}", err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Update current user profile
pub async fn update_current_user(
    user_service: web::Data<UserService>,
    request: web::Json<UpdateUserRequest>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let user_id = match extract_user_id_from_token(&user_service, &req).await {
        Ok(id) => id,
        Err(response) => return Ok(response),
    };

    match user_service.update_user(user_id, request.into_inner(), user_id).await {
        Ok(user) => {
            info!("User {} updated their profile", user.id);
            Ok(HttpResponse::Ok().json(ApiResponse::success(user)))
        }
        Err(err) => {
            warn!("Failed to update current user: {}", err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Update user by ID
pub async fn update_user(
    user_service: web::Data<UserService>,
    path: web::Path<Uuid>,
    request: web::Json<UpdateUserRequest>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    let requesting_user_id = match extract_user_id_from_token(&user_service, &req).await {
        Ok(id) => id,
        Err(response) => return Ok(response),
    };

    match user_service.update_user(user_id, request.into_inner(), requesting_user_id).await {
        Ok(user) => {
            info!("User {} updated by {}", user_id, requesting_user_id);
            Ok(HttpResponse::Ok().json(ApiResponse::success(user)))
        }
        Err(err) => {
            warn!("Failed to update user {}: {}", user_id, err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Delete user by ID
pub async fn delete_user(
    user_service: web::Data<UserService>,
    path: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let user_id = path.into_inner();
    let requesting_user_id = match extract_user_id_from_token(&user_service, &req).await {
        Ok(id) => id,
        Err(response) => return Ok(response),
    };

    match user_service.delete_user(user_id, requesting_user_id).await {
        Ok(()) => {
            info!("User {} deleted by {}", user_id, requesting_user_id);
            Ok(HttpResponse::Ok().json(ApiResponse::success_with_message(
                (),
                "User deleted successfully".to_string(),
            )))
        }
        Err(err) => {
            warn!("Failed to delete user {}: {}", user_id, err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Simple ping endpoint for testing
pub async fn ping() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(serde_json::json!({"status": "ok", "service": "user-service"})))
}

/// Test list users endpoint without authentication
pub async fn test_list_users(
    query: web::Query<PaginationParams>,
) -> Result<HttpResponse> {
    let params = query.into_inner();
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "test endpoint working",
        "params": {
            "page": params.page,
            "limit": params.limit
        }
    })))
}

/// Health check endpoint
pub async fn health_check(user_service: web::Data<UserService>) -> Result<HttpResponse> {
    match user_service.health_check().await {
        Ok(health) => Ok(HttpResponse::Ok().json(health)),
        Err(err) => {
            error!("Health check failed: {}", err);
            Ok(HttpResponse::ServiceUnavailable().json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Helper function to extract user ID from token
async fn extract_user_id_from_token(
    user_service: &UserService,
    req: &HttpRequest,
) -> Result<Uuid, HttpResponse> {
    let auth_header = match req.headers().get("authorization") {
        Some(header) => match header.to_str() {
            Ok(header) => header,
            Err(_) => {
                return Err(HttpResponse::BadRequest()
                    .json(ApiResponse::<()>::error("Invalid authorization header".to_string())));
            }
        },
        None => {
            return Err(HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Authorization header required".to_string())));
        }
    };

    let token = match HttpUtils::extract_bearer_token(auth_header) {
        Some(token) => token,
        None => {
            return Err(HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Bearer token required".to_string())));
        }
    };

    match user_service.validate_token(&token).await {
        Ok(user) => Ok(user.id),
        Err(err) => {
            Err(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}