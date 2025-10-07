use actix_web::{web, HttpRequest, HttpResponse, Result};
use common::{ApiResponse, CreateUserRequest, LoginRequest, HttpUtils};
use crate::service::AuthService;
use tracing::{info, warn, error};

/// Register a new user
pub async fn register(
    auth_service: web::Data<AuthService>,
    request: web::Json<CreateUserRequest>,
) -> Result<HttpResponse> {
    info!("Registration attempt for email: {}", request.email);

    match auth_service.register(request.into_inner()).await {
        Ok(response) => {
            info!("User registered successfully: {}", response.user.email);
            Ok(HttpResponse::Created().json(ApiResponse::success(response)))
        }
        Err(err) => {
            warn!("Registration failed: {}", err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Login user
pub async fn login(
    auth_service: web::Data<AuthService>,
    request: web::Json<LoginRequest>,
) -> Result<HttpResponse> {
    let email = request.email.clone();
    info!("Login attempt for email: {}", email);

    match auth_service.login(request.into_inner()).await {
        Ok(response) => {
            info!("User logged in successfully: {}", response.user.email);
            Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
        }
        Err(err) => {
            warn!("Login failed for {}: {}", email, err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Refresh access token
pub async fn refresh_token(
    auth_service: web::Data<AuthService>,
    request: HttpRequest,
) -> Result<HttpResponse> {
    let auth_header = match request.headers().get("authorization") {
        Some(header) => match header.to_str() {
            Ok(header) => header,
            Err(_) => {
                return Ok(HttpResponse::BadRequest()
                    .json(ApiResponse::<()>::error("Invalid authorization header".to_string())));
            }
        },
        None => {
            return Ok(HttpResponse::BadRequest()
                .json(ApiResponse::<()>::error("Authorization header required".to_string())));
        }
    };

    let token = match HttpUtils::extract_bearer_token(auth_header) {
        Some(token) => token,
        None => {
            return Ok(HttpResponse::BadRequest()
                .json(ApiResponse::<()>::error("Bearer token required".to_string())));
        }
    };

    match auth_service.refresh_token(&token).await {
        Ok(response) => {
            info!("Token refreshed successfully for user: {}", response.user.email);
            Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
        }
        Err(err) => {
            warn!("Token refresh failed: {}", err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Validate access token
pub async fn validate_token(
    auth_service: web::Data<AuthService>,
    request: HttpRequest,
) -> Result<HttpResponse> {
    let auth_header = match request.headers().get("authorization") {
        Some(header) => match header.to_str() {
            Ok(header) => header,
            Err(_) => {
                return Ok(HttpResponse::BadRequest()
                    .json(ApiResponse::<()>::error("Invalid authorization header".to_string())));
            }
        },
        None => {
            return Ok(HttpResponse::BadRequest()
                .json(ApiResponse::<()>::error("Authorization header required".to_string())));
        }
    };

    let token = match HttpUtils::extract_bearer_token(auth_header) {
        Some(token) => token,
        None => {
            return Ok(HttpResponse::BadRequest()
                .json(ApiResponse::<()>::error("Bearer token required".to_string())));
        }
    };

    match auth_service.validate_token(&token).await {
        Ok(user) => {
            Ok(HttpResponse::Ok().json(ApiResponse::success(user)))
        }
        Err(err) => {
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Logout user
pub async fn logout(
    auth_service: web::Data<AuthService>,
    request: HttpRequest,
) -> Result<HttpResponse> {
    let auth_header = match request.headers().get("authorization") {
        Some(header) => match header.to_str() {
            Ok(header) => header,
            Err(_) => {
                return Ok(HttpResponse::BadRequest()
                    .json(ApiResponse::<()>::error("Invalid authorization header".to_string())));
            }
        },
        None => {
            return Ok(HttpResponse::BadRequest()
                .json(ApiResponse::<()>::error("Authorization header required".to_string())));
        }
    };

    let token = match HttpUtils::extract_bearer_token(auth_header) {
        Some(token) => token,
        None => {
            return Ok(HttpResponse::BadRequest()
                .json(ApiResponse::<()>::error("Bearer token required".to_string())));
        }
    };

    match auth_service.logout(&token).await {
        Ok(()) => {
            info!("User logged out successfully");
            Ok(HttpResponse::Ok().json(ApiResponse::success_with_message(
                (),
                "Logged out successfully".to_string(),
            )))
        }
        Err(err) => {
            warn!("Logout failed: {}", err);
            Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(err.status_code()).unwrap())
                .json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}

/// Health check endpoint
pub async fn health_check(auth_service: web::Data<AuthService>) -> Result<HttpResponse> {
    match auth_service.health_check().await {
        Ok(health) => Ok(HttpResponse::Ok().json(health)),
        Err(err) => {
            error!("Health check failed: {}", err);
            Ok(HttpResponse::ServiceUnavailable().json(ApiResponse::<()>::error(err.to_string())))
        }
    }
}