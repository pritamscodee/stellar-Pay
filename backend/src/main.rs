use axum::{
    extract::State,
    http::{header::HeaderName, HeaderValue, Request, StatusCode},
    middleware::{self, Next},
    response::{sse::Event, IntoResponse, Response, Sse},
    routing::{get, post},
    Json, Router,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, VecDeque},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tokio::sync::broadcast;
use tower_http::{
    cors::CorsLayer,
    limit::RequestBodyLimitLayer,
    request_id::{MakeRequestId, PropagateRequestIdLayer, RequestId, SetRequestIdLayer},
    set_header::SetResponseHeaderLayer,
    timeout::RequestTimeoutLayer,
    trace::TraceLayer,
};
use tracing_subscriber;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VotePayload {
    pub poll_id: String,
    pub voter: String,
    pub option_index: u32,
    pub timestamp: u64,
    pub tx_hash: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PollCreatedPayload {
    pub poll_id: String,
    pub question: String,
    pub creator: String,
    pub deadline: u64,
    pub tx_hash: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum EventPayload {
    Vote(VotePayload),
    PollCreated(PollCreatedPayload),
    Ping,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ChatRequest {
    #[serde(deserialize_with = "deserialize_non_empty")]
    pub message: String,
}

fn deserialize_non_empty<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    if s.trim().is_empty() || s.len() > 2000 {
        return Err(serde::de::Error::custom("message must be 1-2000 characters"));
    }
    Ok(s)
}

#[derive(Clone, Debug, Serialize)]
pub struct ChatResponse {
    pub reply: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub feedback_saved: Option<serde_json::Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FeedbackEntry {
    pub rating: String,
    pub message: String,
    pub email: Option<String>,
    pub url: Option<String>,
    pub timestamp: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct FeedbackInput {
    #[serde(deserialize_with = "deserialize_rating")]
    pub rating: String,
    #[serde(deserialize_with = "deserialize_non_empty")]
    pub message: String,
    pub email: Option<String>,
}

fn deserialize_rating<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    match s.as_str() {
        "bug" | "idea" | "general" => Ok(s),
        _ => Err(serde::de::Error::custom("rating must be 'bug', 'idea', or 'general'")),
    }
}

struct RateLimiter {
    requests: Arc<Mutex<HashMap<String, VecDeque<Instant>>>>,
    max_requests: u64,
    window: Duration,
}

impl RateLimiter {
    fn new(max_requests: u64, window: Duration) -> Self {
        Self {
            requests: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window,
        }
    }

    fn check(&self, key: &str) -> Result<(), ()> {
        let mut map = self.requests.lock().unwrap();
        let now = Instant::now();
        let entries = map.entry(key.to_string()).or_insert_with(VecDeque::new);

        while let Some(&time) = entries.front() {
            if now.duration_since(time) > self.window {
                entries.pop_front();
            } else {
                break;
            }
        }

        if entries.len() as u64 >= self.max_requests {
            Err(())
        } else {
            entries.push_back(now);
            Ok(())
        }
    }
}

#[derive(Deserialize)]
pub struct PublishBody {
    pub event_type: String,
    pub poll_id: String,
    pub voter: Option<String>,
    pub option_index: Option<u32>,
    pub question: Option<String>,
    pub creator: Option<String>,
    pub deadline: Option<u64>,
    pub tx_hash: Option<String>,
    pub timestamp: Option<u64>,
}

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<EventPayload>,
    pub http_client: reqwest::Client,
    pub feedback: Arc<Mutex<VecDeque<FeedbackEntry>>>,
    pub rate_limiter: Arc<RateLimiter>,
    pub feedback_limiter: Arc<RateLimiter>,
    pub chat_limiter: Arc<RateLimiter>,
    pub publish_limiter: Arc<RateLimiter>,
}

const SYSTEM_PROMPT: &str = "You are StellarVote AI, a helpful assistant for the StellarVote dApp. \
Your role is to help users with questions about Stellar, Web3, Soroban smart contracts, \
and the StellarVote platform. Be concise, friendly, and informative. \
Keep responses brief (2-4 sentences). \
\
When a user provides feedback (bug report, feature idea, or general feedback), \
thank them and tell them their feedback has been recorded. Then output a single line \
starting with `[FEEDBACK_SAVED]` containing a JSON object with keys: rating (\"bug\"|\"idea\"|\"general\"), \
message (their feedback text). Only include this line if they explicitly gave feedback \
about the app. Example: [FEEDBACK_SAVED]{\"rating\":\"bug\",\"message\":\"The wallet disconnect button is hard to find.\"}";

struct TimestampMakeRequestId;

impl MakeRequestId for TimestampMakeRequestId {
    fn make_request_id<B>(&mut self, _request: &http::Request<B>) -> Option<RequestId> {
        let id = format!("req-{:016x}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        );
        HeaderValue::from_str(&id).ok().map(RequestId::new)
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let _mistral_key = std::env::var("MISTRAL_API_KEY")
        .expect("MISTRAL_API_KEY must be set");
    let _port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());

    let (tx, _) = broadcast::channel::<EventPayload>(100);
    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .unwrap();
    let feedback = Arc::new(Mutex::new(VecDeque::with_capacity(100)));

    let state = Arc::new(AppState {
        tx,
        http_client,
        feedback,
        rate_limiter: Arc::new(RateLimiter::new(100, Duration::from_secs(60))),
        feedback_limiter: Arc::new(RateLimiter::new(10, Duration::from_secs(60))),
        chat_limiter: Arc::new(RateLimiter::new(30, Duration::from_secs(60))),
        publish_limiter: Arc::new(RateLimiter::new(20, Duration::from_secs(60))),
    });

    let security_headers = vec![
        (
            HeaderName::from_static("x-content-type-options"),
            HeaderValue::from_static("nosniff"),
        ),
        (
            HeaderName::from_static("x-frame-options"),
            HeaderValue::from_static("DENY"),
        ),
        (
            HeaderName::from_static("x-xss-protection"),
            HeaderValue::from_static("0"),
        ),
        (
            HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ),
        (
            HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static("geolocation=(), microphone=(), camera=()"),
        ),
        (
            HeaderName::from_static("cross-origin-opener-policy"),
            HeaderValue::from_static("same-origin"),
        ),
        (
            HeaderName::from_static("cross-origin-resource-policy"),
            HeaderValue::from_static("same-origin"),
        ),
    ];

    let mut app = Router::new()
        .route("/health", get(health))
        .route("/api/events", get(sse_handler))
        .route("/api/publish", post(publish_handler))
        .route("/api/chat", post(chat_handler))
        .route("/api/feedback", post(submit_feedback).get(get_feedback))
        .layer(middleware::from_fn_with_state(state.clone(), global_rate_limit))
        .layer(CorsLayer::permissive())
        .with_state(state);

    for (name, value) in security_headers {
        app = app.layer(SetResponseHeaderLayer::overriding(name, value));
    }

    app = app
        .layer(PropagateRequestIdLayer::new(
            HeaderName::from_static("x-request-id"),
        ))
        .layer(SetRequestIdLayer::new(
            HeaderName::from_static("x-request-id"),
            TimestampMakeRequestId,
        ))
        .layer(TraceLayer::new_for_http())
        .layer(RequestBodyLimitLayer::new(1024 * 50))
        .layer(RequestTimeoutLayer::new(Duration::from_secs(30)));

    let addr = format!("0.0.0.0:{_port}");
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok", "service": "stellervote-backend" }))
}

async fn sse_handler(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, std::convert::Infallible>>> {
    let mut rx = state.tx.subscribe();

    let stream = async_stream::stream! {
        loop {
            match rx.recv().await {
                Ok(payload) => {
                    let data = serde_json::to_string(&payload).unwrap();
                    yield Ok(Event::default().data(data));
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    };

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keepalive"),
    )
}

async fn publish_handler(
    State(state): State<Arc<AppState>>,
    Json(body): Json<PublishBody>,
) -> impl IntoResponse {
    let payload = match body.event_type.as_str() {
        "vote" => {
            if body.poll_id.is_empty() || body.voter.as_deref().unwrap_or("").is_empty() {
                return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({
                    "error": "poll_id and voter are required for vote events"
                }))).into_response();
            }
            EventPayload::Vote(VotePayload {
                poll_id: body.poll_id,
                voter: body.voter.unwrap_or_default(),
                option_index: body.option_index.unwrap_or(0),
                timestamp: body.timestamp.unwrap_or_else(|| {
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs()
                }),
                tx_hash: body.tx_hash.unwrap_or_default(),
            })
        }
        "poll_created" => {
            if body.poll_id.is_empty() || body.question.as_deref().unwrap_or("").is_empty() {
                return (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({
                    "error": "poll_id and question are required for poll_created events"
                }))).into_response();
            }
            EventPayload::PollCreated(PollCreatedPayload {
                poll_id: body.poll_id,
                question: body.question.unwrap_or_default(),
                creator: body.creator.unwrap_or_default(),
                deadline: body.deadline.unwrap_or(0),
                tx_hash: body.tx_hash.unwrap_or_default(),
            })
        }
        _ => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "error": "invalid event type, must be 'vote' or 'poll_created'"
        }))).into_response(),
    };

    let _ = state.tx.send(payload);
    (StatusCode::OK, Json(serde_json::json!({ "status": "published" }))).into_response()
}

async fn submit_feedback(
    State(state): State<Arc<AppState>>,
    Json(input): Json<FeedbackInput>,
) -> impl IntoResponse {
    let entry = FeedbackEntry {
        rating: input.rating,
        message: input.message,
        email: input.email.filter(|e| e.contains('@') && e.len() <= 254),
        url: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    let mut store = state.feedback.lock().unwrap();
    if store.len() >= 100 {
        store.pop_front();
    }
    store.push_back(entry);
    (StatusCode::CREATED, Json(serde_json::json!({ "saved": true })))
}

async fn get_feedback(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let store = state.feedback.lock().unwrap();
    let items: Vec<FeedbackEntry> = store.iter().rev().cloned().collect();
    (StatusCode::OK, Json(items))
}

async fn chat_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ChatRequest>,
) -> Response {
    let api_key = match std::env::var("MISTRAL_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "chat service not configured"
            }))).into_response();
        }
    };

    let messages = vec![
        serde_json::json!({ "role": "system", "content": SYSTEM_PROMPT }),
        serde_json::json!({ "role": "user", "content": req.message }),
    ];

    let body = serde_json::json!({
        "model": "mistral-small-latest",
        "messages": messages,
        "max_tokens": 300,
        "temperature": 0.7,
    });

    match state
        .http_client
        .post("https://api.mistral.ai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
    {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let mut reply = json["choices"][0]["message"]["content"]
                    .as_str()
                    .unwrap_or("Sorry, I couldn't process that.")
                    .to_string();

                let mut feedback_saved: Option<serde_json::Value> = None;

                if let Some(fb_line) = reply.lines().find(|l| l.starts_with("[FEEDBACK_SAVED]")) {
                    let json_str = fb_line.trim_start_matches("[FEEDBACK_SAVED]");
                    if let Ok(fb) = serde_json::from_str::<serde_json::Value>(json_str) {
                        let entry = FeedbackEntry {
                            rating: fb["rating"].as_str().unwrap_or("general").to_string(),
                            message: fb["message"].as_str().unwrap_or_default().to_string(),
                            email: fb["email"].as_str()
                                .filter(|e| e.contains('@') && e.len() <= 254)
                                .map(|s| s.to_string()),
                            url: None,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                        };
                        if !entry.message.is_empty() {
                            let mut store = state.feedback.lock().unwrap();
                            if store.len() >= 100 { store.pop_front(); }
                            store.push_back(entry);
                            feedback_saved = Some(serde_json::json!({
                                "rating": entry.rating,
                                "message": entry.message,
                                "timestamp": entry.timestamp,
                            }));
                        }
                    }
                    reply = reply.lines()
                        .filter(|l| !l.starts_with("[FEEDBACK_SAVED]"))
                        .collect::<Vec<_>>()
                        .join("\n");
                }

                (StatusCode::OK, Json(ChatResponse { reply, feedback_saved })).into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "error": "failed to process AI response"
                }))).into_response()
            }
        }
        Err(_) => {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                "error": "AI service temporarily unavailable"
            }))).into_response()
        }
    }
}

async fn global_rate_limit<B>(
    State(state): State<Arc<AppState>>,
    req: Request<B>,
    next: Next<B>,
) -> Response {
    let ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    let path = req.uri().path().to_string();

    let limiter = if path.starts_with("/api/feedback") {
        &state.feedback_limiter
    } else if path.starts_with("/api/chat") {
        &state.chat_limiter
    } else if path.starts_with("/api/publish") {
        &state.publish_limiter
    } else {
        &state.rate_limiter
    };

    if limiter.check(ip).is_err() {
        return (StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({
            "error": "rate limit exceeded",
            "retry_after_secs": 60,
        }))).into_response();
    }

    next.run(req).await
}
