use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::{ContrivanceError, ContrivanceResult};

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,      // User ID
    pub exp: usize,       // Expiration time
    pub iat: usize,       // Issued at
    pub jti: String,      // JWT ID (session ID)
    pub role: String,     // User role
}

/// JWT Service for handling token operations
#[derive(Clone)]
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    algorithm: Algorithm,
}

impl JwtService {
    /// Create a new JWT service with the given secret
    pub fn new(secret: &str, _jwt_expiration_hours: Option<i64>, _refresh_expiration_days: Option<i64>) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_ref()),
            decoding_key: DecodingKey::from_secret(secret.as_ref()),
            algorithm: Algorithm::HS256,
        }
    }

    /// Generate a JWT token for a user
    pub fn generate_token(
        &self,
        user_id: Uuid,
        session_id: Uuid,
        role: &str,
        expires_in_hours: i64,
    ) -> ContrivanceResult<String> {
        let now = Utc::now();
        let exp = now + Duration::hours(expires_in_hours);

        let claims = Claims {
            sub: user_id.to_string(),
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
            jti: session_id.to_string(),
            role: role.to_string(),
        };

        encode(&Header::new(self.algorithm), &claims, &self.encoding_key)
            .map_err(|e| ContrivanceError::authentication(&format!("Failed to generate token: {}", e)))
    }

    /// Validate and decode a JWT token
    pub fn validate_token(&self, token: &str) -> ContrivanceResult<Claims> {
        let mut validation = Validation::new(self.algorithm);
        validation.validate_exp = true;

        decode::<Claims>(token, &self.decoding_key, &validation)
            .map(|data| data.claims)
            .map_err(|e| ContrivanceError::authentication(&format!("Invalid token: {}", e)))
    }

    /// Extract user ID from token without full validation (for middleware)
    pub fn extract_user_id(&self, token: &str) -> ContrivanceResult<Uuid> {
        let claims = self.validate_token(token)?;
        Uuid::parse_str(&claims.sub)
            .map_err(|e| ContrivanceError::authentication(&format!("Invalid user ID in token: {}", e)))
    }

    /// Extract session ID from token
    pub fn extract_session_id(&self, token: &str) -> ContrivanceResult<Uuid> {
        let claims = self.validate_token(token)?;
        Uuid::parse_str(&claims.jti)
            .map_err(|e| ContrivanceError::authentication(&format!("Invalid session ID in token: {}", e)))
    }

    /// Check if token is expired
    pub fn is_token_expired(&self, token: &str) -> bool {
        match self.validate_token(token) {
            Ok(_) => false,
            Err(_) => true,
        }
    }

    /// Create a pair of access and refresh tokens
    pub fn create_token_pair(
        &self,
        user_id: Uuid,
        session_id: Uuid,
        role: &str,
    ) -> ContrivanceResult<(String, String)> {
        let access_token = self.generate_token(user_id, session_id, role, 1)?; // 1 hour
        let refresh_token = self.generate_token(user_id, session_id, role, 24 * 7)?; // 7 days
        Ok((access_token, refresh_token))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_service() {
        let jwt_service = JwtService::new("test_secret", None, None);
        let user_id = Uuid::new_v4();
        let session_id = Uuid::new_v4();

        // Generate token
        let token = jwt_service
            .generate_token(user_id, session_id, "user", 1)
            .unwrap();

        // Validate token
        let claims = jwt_service.validate_token(&token).unwrap();
        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.jti, session_id.to_string());
        assert_eq!(claims.role, "user");

        // Extract user ID
        let extracted_user_id = jwt_service.extract_user_id(&token).unwrap();
        assert_eq!(extracted_user_id, user_id);

        // Extract session ID  
        let extracted_session_id = jwt_service.extract_session_id(&token).unwrap();
        assert_eq!(extracted_session_id, session_id);
    }
}