use actix_web::{web, HttpRequest, HttpResponse, Result, Error};
use reqwest::Client;
use serde_json::Value;
use uuid::Uuid;
use common::{ContrivanceError, ApiResponse};
use tracing::{info, error, warn};

pub struct ProxyService {
    client: Client,
    auth_service_url: String,
    user_service_url: String,
    contrivance_service_url: String,
    salesforce_service_url: String,
}

impl ProxyService {
    pub fn new(
        client: Client,
        auth_service_url: String,
        user_service_url: String,
        contrivance_service_url: String,
        salesforce_service_url: String,
    ) -> Self {
        Self {
            client,
            auth_service_url,
            user_service_url,
            contrivance_service_url,
            salesforce_service_url,
        }
    }

    /// Convert actix-web HeaderMap to reqwest HeaderMap
    fn convert_headers(actix_headers: &actix_web::http::header::HeaderMap) -> reqwest::header::HeaderMap {
        let mut reqwest_headers = reqwest::header::HeaderMap::new();
        
        for (name, value) in actix_headers.iter() {
            if let (Ok(header_name), Ok(header_value)) = (
                reqwest::header::HeaderName::from_bytes(name.as_str().as_bytes()),
                reqwest::header::HeaderValue::from_bytes(value.as_bytes())
            ) {
                // Skip connection-related headers that shouldn't be forwarded
                let name_str = name.as_str().to_lowercase();
                if !["host", "connection", "content-length", "transfer-encoding"].contains(&name_str.as_str()) {
                    reqwest_headers.insert(header_name, header_value);
                }
            }
        }
        
        reqwest_headers
    }

    pub async fn proxy_request(
        &self,
        target_url: &str,
        method: reqwest::Method,
        path: &str,
        query: Option<&str>,
        headers: &actix_web::http::header::HeaderMap,
        body: Option<Value>,
    ) -> Result<HttpResponse, ContrivanceError> {
        let mut url = format!("{}{}", target_url, path);
        if let Some(query_string) = query {
            url = format!("{}?{}", url, query_string);
        }

        info!("Proxying {} request to: {}", method, url);

        let converted_headers = Self::convert_headers(headers);
        let mut request_builder = self.client.request(method, &url);

        // Forward converted headers
        for (name, value) in converted_headers.iter() {
            let header_name = name.as_str().to_lowercase();
            if !["host", "connection", "transfer-encoding", "content-length"].contains(&header_name.as_str()) {
                request_builder = request_builder.header(name, value);
            }
        }

        // Add body if present
        if let Some(json_body) = body {
            request_builder = request_builder.json(&json_body);
        }

        // Send request
        let response = request_builder
            .send()
            .await
            .map_err(|e| {
                error!("Proxy request failed: {}", e);
                ContrivanceError::internal("Failed to proxy request")
            })?;

        let status = response.status();
        let headers = response.headers().clone();
        
        // Get response body
        let body = response
            .bytes()
            .await
            .map_err(|e| {
                error!("Failed to read response body: {}", e);
                ContrivanceError::internal("Failed to read response")
            })?;

        // Build response
        let mut http_response = HttpResponse::build(status);

        // Forward response headers (excluding connection-related ones)
        for (name, value) in headers.iter() {
            let header_name = name.as_str().to_lowercase();
            if !["connection", "transfer-encoding"].contains(&header_name.as_str()) {
                http_response.insert_header((name, value));
            }
        }

        Ok(http_response.body(body))
    }
}

// Auth service proxy handler
pub async fn auth_proxy(
    req: HttpRequest,
    body: Option<web::Json<Value>>,
    proxy: web::Data<ProxyService>,
) -> Result<HttpResponse, Error> {
    let method = match req.method().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        _ => return Ok(HttpResponse::MethodNotAllowed().finish()),
    };

    let path = req.path().replace("/api/auth", "");
    let query = req.query_string();
    let query_option = if query.is_empty() { None } else { Some(query) };

    let result = proxy
        .proxy_request(
            &proxy.auth_service_url,
            method,
            &path,
            query_option,
            req.headers(),
            body.map(|b| b.into_inner()),
        )
        .await;

    match result {
        Ok(response) => Ok(response),
        Err(e) => Ok(HttpResponse::InternalServerError().json(ApiResponse::<()>::error(e.to_string()))),
    }
}

// User service proxy handler
pub async fn user_proxy(
    req: HttpRequest,
    body: Option<web::Json<Value>>,
    proxy: web::Data<ProxyService>,
) -> Result<HttpResponse, Error> {
    let method = match req.method().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        _ => return Ok(HttpResponse::MethodNotAllowed().finish()),
    };

    let path = req.path().replace("/api/users", "");
    let query = req.query_string();
    let query_option = if query.is_empty() { None } else { Some(query) };

    let result = proxy
        .proxy_request(
            &proxy.user_service_url,
            method,
            &path,
            query_option,
            req.headers(),
            body.map(|b| b.into_inner()),
        )
        .await;

    match result {
        Ok(response) => Ok(response),
        Err(e) => Ok(HttpResponse::InternalServerError().json(ApiResponse::<()>::error(e.to_string()))),
    }
}

// Contrivance service proxy handler
pub async fn contrivance_proxy(
    req: HttpRequest,
    body: Option<web::Json<Value>>,
    proxy: web::Data<ProxyService>,
) -> Result<HttpResponse, Error> {
    let method = match req.method().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        _ => return Ok(HttpResponse::MethodNotAllowed().finish()),
    };

    let path = req.path(); // Keep the full path including /api/spreadsheets
    let query = req.query_string();
    let query_option = if query.is_empty() { None } else { Some(query) };

    let result = proxy
        .proxy_request(
            &proxy.contrivance_service_url,
            method,
            &path,
            query_option,
            req.headers(),
            body.map(|b| b.into_inner()),
        )
        .await;

    match result {
        Ok(response) => Ok(response),
        Err(e) => Ok(HttpResponse::InternalServerError().json(ApiResponse::<()>::error(e.to_string()))),
    }
}

// Salesforce service proxy handler
pub async fn salesforce_proxy(
    req: HttpRequest,
    body: Option<web::Json<Value>>,
    proxy: web::Data<ProxyService>,
) -> Result<HttpResponse, Error> {
    let method = match req.method().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        _ => return Ok(HttpResponse::MethodNotAllowed().finish()),
    };

    let path = req.path().replace("/api/salesforce", "");
    let query = req.query_string();
    let query_option = if query.is_empty() { None } else { Some(query) };

    let result = proxy
        .proxy_request(
            &proxy.salesforce_service_url,
            method,
            &format!("/api/salesforce{}", path),
            query_option,
            req.headers(),
            body.map(|b| b.into_inner()),
        )
        .await;

    match result {
        Ok(response) => Ok(response),
        Err(e) => Ok(HttpResponse::InternalServerError().json(ApiResponse::<()>::error(e.to_string()))),
    }
}

// WebSocket proxy - redirect to contrivance service
pub async fn websocket_proxy(
    req: HttpRequest,
    path: web::Path<Uuid>,
    proxy: web::Data<ProxyService>,
) -> Result<HttpResponse, Error> {
    let spreadsheet_id = path.into_inner();
    let redirect_url = format!("{}/ws/spreadsheet/{}", proxy.contrivance_service_url, spreadsheet_id);
    
    warn!("WebSocket proxy redirecting to: {} (Note: This should be handled by a reverse proxy in production)", redirect_url);
    
    Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
        "WebSocket connections should be handled by reverse proxy. Use the contrivance service directly for WebSocket connections.".to_string()
    )))
}