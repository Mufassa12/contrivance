use actix_web::{dev::ServiceRequest, Error, HttpMessage, web};
use actix_web_httpauth::extractors::bearer::{BearerAuth, Config};
use actix_web_httpauth::extractors::AuthenticationError;
use actix_web_httpauth::middleware::HttpAuthentication;
use std::future::{ready, Ready};
use common::{ContrivanceError, JwtService, Claims};

pub struct AuthMiddleware;

impl AuthMiddleware {
    pub fn validator(
        req: ServiceRequest,
        credentials: BearerAuth,
    ) -> Ready<Result<ServiceRequest, (Error, ServiceRequest)>> {
        let jwt_service = match req.app_data::<web::Data<JwtService>>() {
            Some(service) => service,
            None => {
                let config = Config::default()
                    .realm("Restricted area")
                    .scope("auth");
                return ready(Err((AuthenticationError::from(config).into(), req)));
            }
        };

        match jwt_service.validate_token(credentials.token()) {
            Ok(claims) => {
                // Add user information to request extensions
                req.extensions_mut().insert(claims);
                ready(Ok(req))
            }
            Err(_) => {
                let config = Config::default()
                    .realm("Restricted area")
                    .scope("auth");
                ready(Err((AuthenticationError::from(config).into(), req)))
            }
        }
    }

    pub fn bearer() -> HttpAuthentication<BearerAuth, fn(ServiceRequest, BearerAuth) -> Ready<Result<ServiceRequest, (Error, ServiceRequest)>>> {
        HttpAuthentication::bearer(Self::validator)
    }
}

/// Extract user ID from request (after authentication middleware)
pub fn extract_user_id(req: &ServiceRequest) -> Result<uuid::Uuid, ContrivanceError> {
    let extensions = req.extensions();
    let claims = extensions
        .get::<Claims>()
        .ok_or_else(|| ContrivanceError::authentication("No authentication claims found"))?;

    uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| ContrivanceError::authentication("Invalid user ID in token"))
}