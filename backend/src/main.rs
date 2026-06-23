use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{sse::Event, IntoResponse, Sse},
    routing::get,
    Json, Router,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use std::{sync::Arc, time::Duration};
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

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<EventPayload>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let (tx, _) = broadcast::channel::<EventPayload>(100);
    let state = Arc::new(AppState { tx });

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/events", get(sse_handler))
        .route("/api/publish", get(publish_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{port}");
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok", "service": "stellerpay-backend" }))
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
    Query(q): Query<PublishQuery>,
) -> impl IntoResponse {
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
