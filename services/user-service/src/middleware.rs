use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::extractors::bearer::{BearerAuth, Config};
use actix_web_httpauth::extractors::AuthenticationError;
use actix_web_httpauth::middleware::HttpAuthentication;
use std::future::{ready, Ready};
use common::ContrivanceError;

pub struct AuthMiddleware;

impl AuthMiddleware {
    pub fn validator(
        req: ServiceRequest,
        credentials: BearerAuth,
    ) -> Ready<Result<ServiceRequest, (Error, ServiceRequest)>> {
        // For simplicity, we'll just pass through the token
        // The actual validation happens in the service layer by calling auth-service
        req.extensions_mut().insert(credentials.token().to_string());
        ready(Ok(req))
    }

    pub fn bearer() -> HttpAuthentication<BearerAuth, fn(ServiceRequest, BearerAuth) -> Ready<Result<ServiceRequest, (Error, ServiceRequest)>>> {
        HttpAuthentication::bearer(Self::validator)
    }
}

/// Extract token from request (after authentication middleware)
pub fn extract_token(req: &ServiceRequest) -> Result<String, ContrivanceError> {
    let extensions = req.extensions();
    let token = extensions
        .get::<String>()
        .ok_or_else(|| ContrivanceError::authentication("No token found"))?;

    Ok(token.clone())
}