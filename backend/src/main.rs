use axum::{
    extract::State,
    http::StatusCode,
    response::{sse::Event, IntoResponse, Sse},
    routing::{get, post},
    Json, Router,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
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
    pub message: String,
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

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<EventPayload>,
    pub http_client: reqwest::Client,
    pub feedback: Arc<Mutex<VecDeque<FeedbackEntry>>>,
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

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let (tx, _) = broadcast::channel::<EventPayload>(100);
    let http_client = reqwest::Client::new();
    let feedback = Arc::new(Mutex::new(VecDeque::with_capacity(100)));
    let state = Arc::new(AppState { tx, http_client, feedback });

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/events", get(sse_handler))
        .route("/api/publish", get(publish_handler))
        .route("/api/chat", post(chat_handler))
        .route("/api/feedback", post(submit_feedback).get(get_feedback))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{port}");
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

#[derive(Deserialize)]
pub struct PublishQuery {
    event_type: String,
    poll_id: Option<String>,
    voter: Option<String>,
    option_index: Option<u32>,
    question: Option<String>,
    creator: Option<String>,
    deadline: Option<u64>,
    tx_hash: Option<String>,
    timestamp: Option<u64>,
}

async fn publish_handler(
    State(state): State<Arc<AppState>>,
    query: axum::extract::Query<PublishQuery>,
) -> impl IntoResponse {
    let q = query.0;
    let payload = match q.event_type.as_str() {
        "vote" => EventPayload::Vote(VotePayload {
            poll_id: q.poll_id.unwrap_or_default(),
            voter: q.voter.unwrap_or_default(),
            option_index: q.option_index.unwrap_or(0),
            timestamp: q.timestamp.unwrap_or(0),
            tx_hash: q.tx_hash.unwrap_or_default(),
        }),
        "poll_created" => EventPayload::PollCreated(PollCreatedPayload {
            poll_id: q.poll_id.unwrap_or_default(),
            question: q.question.unwrap_or_default(),
            creator: q.creator.unwrap_or_default(),
            deadline: q.deadline.unwrap_or(0),
            tx_hash: q.tx_hash.unwrap_or_default(),
        }),
        _ => return (StatusCode::BAD_REQUEST, "invalid event type").into_response(),
    };

    let _ = state.tx.send(payload);
    (StatusCode::OK, "published").into_response()
}

#[derive(Deserialize)]
pub struct FeedbackInput {
    rating: String,
    message: String,
    email: Option<String>,
}

async fn submit_feedback(
    State(state): State<Arc<AppState>>,
    Json(input): Json<FeedbackInput>,
) -> impl IntoResponse {
    let entry = FeedbackEntry {
        rating: input.rating,
        message: input.message,
        email: input.email,
        url: None,
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    let mut store = state.feedback.lock().unwrap();
    if store.len() >= 100 {
        store.pop_front();
    }
    store.push_back(entry.clone());
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
) -> impl IntoResponse {
    let api_key = match std::env::var("MISTRAL_API_KEY") {
        Ok(key) => key,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "MISTRAL_API_KEY not configured" })),
            )
                .into_response();
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
                            email: fb["email"].as_str().map(|s| s.to_string()),
                            url: None,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                        };
                        if !entry.message.is_empty() {
                            let mut store = state.feedback.lock().unwrap();
                            if store.len() >= 100 { store.pop_front(); }
                            store.push_back(entry.clone());
                            feedback_saved = Some(serde_json::json!({
                                "rating": entry.rating,
                                "message": entry.message,
                                "email": entry.email,
                                "timestamp": entry.timestamp,
                            }));
                        }
                    }
                    reply = reply.lines().filter(|l| !l.starts_with("[FEEDBACK_SAVED]")).collect::<Vec<_>>().join("\n");
                }

                (StatusCode::OK, Json(ChatResponse { reply, feedback_saved })).into_response()
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({ "error": "Failed to parse Mistral response" })),
                )
                    .into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("Mistral API error: {}", e) })),
        )
            .into_response(),
    }
}
