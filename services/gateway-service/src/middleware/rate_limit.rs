use actix_web::{
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse, body::{MessageBody, BoxBody},
};
use futures_util::future::{ok, Ready};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
    task::{Context, Poll},
    pin::Pin,
    rc::Rc,
};
use futures_util::Future;
use common::ApiResponse;

pub struct RateLimitMiddleware {
    requests_per_window: usize,
    window_duration: Duration,
}

impl RateLimitMiddleware {
    pub fn new() -> Self {
        let requests = std::env::var("RATE_LIMIT_REQUESTS")
            .unwrap_or_else(|_| "100".to_string())
            .parse()
            .unwrap_or(100);
        
        let window_seconds = std::env::var("RATE_LIMIT_WINDOW_SECONDS")
            .unwrap_or_else(|_| "60".to_string())
            .parse::<u64>()
            .unwrap_or(60);

        Self {
            requests_per_window: requests,
            window_duration: Duration::from_secs(window_seconds),
        }
    }
}

impl Default for RateLimitMiddleware {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone)]
struct ClientInfo {
    count: usize,
    window_start: Instant,
}

type ClientMap = Arc<Mutex<HashMap<String, ClientInfo>>>;

impl<S, B> Transform<S, ServiceRequest> for RateLimitMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type InitError = ();
    type Transform = RateLimitService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(RateLimitService {
            service: Rc::new(service),
            requests_per_window: self.requests_per_window,
            window_duration: self.window_duration,
            clients: Arc::new(Mutex::new(HashMap::new())),
        })
    }
}

pub struct RateLimitService<S> {
    service: Rc<S>,
    requests_per_window: usize,
    window_duration: Duration,
    clients: ClientMap,
}

impl<S, B> Service<ServiceRequest> for RateLimitService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<BoxBody>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<ServiceResponse<BoxBody>, Error>>>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();
        let clients = self.clients.clone();
        let requests_per_window = self.requests_per_window;
        let window_duration = self.window_duration;

        Box::pin(async move {
            // Get client IP
            let client_ip = req
                .connection_info()
                .realip_remote_addr()
                .unwrap_or("unknown")
                .to_string();

            let now = Instant::now();
            let mut should_allow = true;

            // Check rate limit
            {
                let mut clients_guard = clients.lock().unwrap();
                
                match clients_guard.get_mut(&client_ip) {
                    Some(info) => {
                        // Check if we need to reset the window
                        if now.duration_since(info.window_start) >= window_duration {
                            info.count = 1;
                            info.window_start = now;
                        } else {
                            info.count += 1;
                            if info.count > requests_per_window {
                                should_allow = false;
                            }
                        }
                    }
                    None => {
                        clients_guard.insert(client_ip.clone(), ClientInfo {
                            count: 1,
                            window_start: now,
                        });
                    }
                }

                // Clean up old entries periodically
                clients_guard.retain(|_, info| {
                    now.duration_since(info.window_start) < window_duration * 2
                });
            }

            if !should_allow {
                let response = HttpResponse::TooManyRequests()
                    .json(ApiResponse::<()>::error("Rate limit exceeded".to_string()));
                
                return Ok(req.into_response(response).map_into_boxed_body());
            }

            // Continue with the request
            let res = service.call(req).await?;
            Ok(res.map_into_boxed_body())
        })
    }
}