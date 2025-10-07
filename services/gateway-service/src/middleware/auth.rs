use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::{
    extractors::bearer::BearerAuth,
    middleware::HttpAuthentication,
};
use common::{ContrivanceError, JwtService};
use std::env;
use std::pin::Pin;
use futures_util::Future;

async fn jwt_validator(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let jwt_service = JwtService::new(&jwt_secret, None, None);

    match jwt_service.validate_token(credentials.token()) {
        Ok(claims) => {
            // Store user ID in request extensions for downstream services
            req.extensions_mut().insert(claims.sub);
            Ok(req)
        }
        Err(_) => {
            let error = ContrivanceError::unauthorized("Invalid token");
            Err((actix_web::Error::from(error), req))
        }
    }
}

pub fn auth_middleware() -> HttpAuthentication<BearerAuth, fn(ServiceRequest, BearerAuth) -> Pin<Box<dyn Future<Output = Result<ServiceRequest, (Error, ServiceRequest)>>>>> {
    HttpAuthentication::bearer(|req, credentials| {
        Box::pin(jwt_validator(req, credentials)) as Pin<Box<dyn Future<Output = Result<ServiceRequest, (Error, ServiceRequest)>>>>
    })
}