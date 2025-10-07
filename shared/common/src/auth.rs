use crate::errors::{ContrivanceError, ContrivanceResult};
use crate::models::{User, UserSession};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // Subject (user id)
    pub email: String,    // User email
    pub name: String,     // User name
    pub role: String,     // User role
    pub exp: usize,       // Expiration time
    pub iat: usize,       // Issued at
    pub jti: String,      // JWT ID (session id)
}

/// JWT token pair
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: chrono::DateTime<Utc>,
    pub refresh_expires_at: chrono::DateTime<Utc>,
}

/// JWT service for token management
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_token_duration: Duration,
    refresh_token_duration: Duration,
}

impl JwtService {
    /// Create a new JWT service with the given secret
    pub fn new(
        secret: &str,
        access_token_hours: Option<i64>,
        refresh_token_days: Option<i64>,
    ) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            access_token_duration: Duration::hours(access_token_hours.unwrap_or(1)),
            refresh_token_duration: Duration::days(refresh_token_days.unwrap_or(7)),
        }
    }

    /// Create access token for user
    pub fn create_access_token(&self, user: &User, session_id: Uuid) -> ContrivanceResult<String> {
        let now = Utc::now();
        let expires_at = now + self.access_token_duration;

        let claims = Claims {
            sub: user.id.to_string(),
            email: user.email.clone(),
            name: user.name.clone(),
            role: format!("{:?}", user.role).to_lowercase(),
            exp: expires_at.timestamp() as usize,
            iat: now.timestamp() as usize,
            jti: session_id.to_string(),
        };

        let header = Header::new(Algorithm::HS256);
        encode(&header, &claims, &self.encoding_key)
            .map_err(|e| ContrivanceError::internal(format!("Failed to create token: {}", e)))
    }

    /// Create refresh token for user
    pub fn create_refresh_token(&self, user: &User, session_id: Uuid) -> ContrivanceResult<String> {
        let now = Utc::now();
        let expires_at = now + self.refresh_token_duration;

        let claims = Claims {
            sub: user.id.to_string(),
            email: user.email.clone(),
            name: user.name.clone(),
            role: format!("{:?}", user.role).to_lowercase(),
            exp: expires_at.timestamp() as usize,
            iat: now.timestamp() as usize,
            jti: session_id.to_string(),
        };

        let header = Header::new(Algorithm::HS256);
        encode(&header, &claims, &self.encoding_key)
            .map_err(|e| ContrivanceError::internal(format!("Failed to create refresh token: {}", e)))
    }

    /// Create both access and refresh tokens
    pub fn create_token_pair(&self, user: &User, session_id: Uuid) -> ContrivanceResult<TokenPair> {
        let access_token = self.create_access_token(user, session_id)?;
        let refresh_token = self.create_refresh_token(user, session_id)?;

        Ok(TokenPair {
            access_token,
            refresh_token,
            expires_at: Utc::now() + self.access_token_duration,
            refresh_expires_at: Utc::now() + self.refresh_token_duration,
        })
    }

    /// Verify and decode token
    pub fn verify_token(&self, token: &str) -> ContrivanceResult<Claims> {
        let validation = Validation::new(Algorithm::HS256);
        
        decode::<Claims>(token, &self.decoding_key, &validation)
            .map(|token_data| token_data.claims)
            .map_err(ContrivanceError::from)
    }

    /// Extract user ID from token
    pub fn extract_user_id(&self, token: &str) -> ContrivanceResult<Uuid> {
        let claims = self.verify_token(token)?;
        Uuid::parse_str(&claims.sub)
            .map_err(|_| ContrivanceError::authentication("Invalid user ID in token"))
    }

    /// Extract session ID from token
    pub fn extract_session_id(&self, token: &str) -> ContrivanceResult<Uuid> {
        let claims = self.verify_token(token)?;
        Uuid::parse_str(&claims.jti)
            .map_err(|_| ContrivanceError::authentication("Invalid session ID in token"))
    }

    /// Check if token is expired
    pub fn is_token_expired(&self, token: &str) -> bool {
        match self.verify_token(token) {
            Ok(_) => false,
            Err(ContrivanceError::Authentication { message }) => {
                message.contains("expired") || message.contains("Token expired")
            }
            Err(_) => true,
        }
    }
}

/// Password hashing utilities
pub struct PasswordService;

impl PasswordService {
    /// Hash a password using bcrypt
    pub fn hash_password(password: &str) -> ContrivanceResult<String> {
        bcrypt::hash(password, bcrypt::DEFAULT_COST)
            .map_err(|e| ContrivanceError::internal(format!("Password hashing failed: {}", e)))
    }

    /// Verify a password against its hash
    pub fn verify_password(password: &str, hash: &str) -> ContrivanceResult<bool> {
        bcrypt::verify(password, hash)
            .map_err(|e| ContrivanceError::internal(format!("Password verification failed: {}", e)))
    }

    /// Generate a random password (for temporary passwords)
    pub fn generate_password(length: usize) -> String {
        use rand::Rng;
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let mut rng = rand::thread_rng();
        (0..length)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect()
    }

    /// Validate password strength
    pub fn validate_password_strength(password: &str) -> ContrivanceResult<()> {
        if password.len() < 8 {
            return Err(ContrivanceError::validation("Password must be at least 8 characters long"));
        }

        let has_uppercase = password.chars().any(|c| c.is_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| "!@#$%^&*(),.?\":{}|<>".contains(c));

        let criteria_met = [has_uppercase, has_lowercase, has_digit, has_special]
            .iter()
            .filter(|&&x| x)
            .count();

        if criteria_met < 3 {
            return Err(ContrivanceError::validation(
                "Password must contain at least 3 of: uppercase, lowercase, digit, special character"
            ));
        }

        Ok(())
    }
}

/// Authorization utilities
pub struct AuthorizationService;

impl AuthorizationService {
    /// Check if user has permission to access spreadsheet
    pub fn can_access_spreadsheet(
        user_id: Uuid,
        owner_id: Uuid,
        is_public: bool,
        collaborators: &[crate::models::SpreadsheetCollaborator],
    ) -> bool {
        // Owner can always access
        if user_id == owner_id {
            return true;
        }

        // Check if spreadsheet is public
        if is_public {
            return true;
        }

        // Check if user is a collaborator
        collaborators
            .iter()
            .any(|c| c.user_id == user_id && c.accepted_at.is_some())
    }

    /// Check if user can edit spreadsheet
    pub fn can_edit_spreadsheet(
        user_id: Uuid,
        owner_id: Uuid,
        collaborators: &[crate::models::SpreadsheetCollaborator],
    ) -> bool {
        // Owner can always edit
        if user_id == owner_id {
            return true;
        }

        // Check if user is a collaborator with edit or admin permissions
        collaborators.iter().any(|c| {
            c.user_id == user_id
                && c.accepted_at.is_some()
                && matches!(
                    c.permission_level,
                    crate::models::PermissionLevel::Edit | crate::models::PermissionLevel::Admin
                )
        })
    }

    /// Check if user can admin spreadsheet (manage collaborators, delete, etc.)
    pub fn can_admin_spreadsheet(
        user_id: Uuid,
        owner_id: Uuid,
        collaborators: &[crate::models::SpreadsheetCollaborator],
    ) -> bool {
        // Owner can always admin
        if user_id == owner_id {
            return true;
        }

        // Check if user is a collaborator with admin permissions
        collaborators.iter().any(|c| {
            c.user_id == user_id
                && c.accepted_at.is_some()
                && c.permission_level == crate::models::PermissionLevel::Admin
        })
    }
}

/// Session management utilities
pub struct SessionService;

impl SessionService {
    /// Generate session hash from token
    pub fn generate_session_hash(token: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Check if session is valid (not expired and not revoked)
    pub fn is_session_valid(session: &UserSession) -> bool {
        !session.is_revoked.unwrap_or(false) && Utc::now() < session.expires_at
    }

    /// Calculate session expiry time
    pub fn calculate_expiry(duration_hours: i64) -> chrono::DateTime<Utc> {
        Utc::now() + Duration::hours(duration_hours)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::UserRole;

    #[test]
    fn test_jwt_token_creation_and_verification() {
        let jwt_service = JwtService::new("test_secret", Some(1), Some(7));
        
        let user = User {
            id: Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hash".to_string(),
            name: "Test User".to_string(),
            role: UserRole::User,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_active: true,
            last_login: None,
        };

        let session_id = Uuid::new_v4();
        let token = jwt_service.create_access_token(&user, session_id).unwrap();
        let claims = jwt_service.verify_token(&token).unwrap();

        assert_eq!(claims.sub, user.id.to_string());
        assert_eq!(claims.email, user.email);
        assert_eq!(claims.jti, session_id.to_string());
    }

    #[test]
    fn test_password_hashing() {
        let password = "test_password123!";
        let hash = PasswordService::hash_password(password).unwrap();
        
        assert!(PasswordService::verify_password(password, &hash).unwrap());
        assert!(!PasswordService::verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_password_strength_validation() {
        assert!(PasswordService::validate_password_strength("weak").is_err());
        assert!(PasswordService::validate_password_strength("StrongPass123!").is_ok());
        assert!(PasswordService::validate_password_strength("NoNumbers!").is_err());
    }
}