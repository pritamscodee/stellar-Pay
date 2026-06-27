import type { BackendEvent, BackendHealth, SseStatus } from "../types";

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://stellar-pay-eia0.onrender.com";

export function subscribeToEvents(
  onEvent: (event: BackendEvent) => void,
  onStatusChange?: (status: SseStatus) => void
): () => void {
  let eventSource: EventSource | null = null;
  let closed = false;
  let retryDelay = 1000;

  function connect() {
    if (closed) return;

    eventSource?.close();
    eventSource = new EventSource(`${BACKEND_URL}/api/events`);
    onStatusChange?.("reconnecting");

    eventSource.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === "Vote") {
          onEvent({ type: "Vote", data: data.data });
        } else if (data.type === "PollCreated") {
          onEvent({ type: "PollCreated", data: data.data });
        } else if (data.type === "Ping") {
          onEvent({ type: "Ping" });
        }
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onopen = () => {
      retryDelay = 1000;
      onStatusChange?.("connected");
    };

    eventSource.onerror = () => {
      onStatusChange?.("disconnected");
      eventSource?.close();
      if (!closed) {
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    };
  }

  connect();

  return () => {
    closed = true;
    eventSource?.close();
    onStatusChange?.("disconnected");
  };
}

export async function checkBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function publishVoteEvent(
  pollId: string,
  voter: string,
  optionIndex: number,
  timestamp: number,
  txHash: string
) {
  const params = new URLSearchParams({
    event_type: "vote",
    poll_id: pollId,
    voter,
    option_index: optionIndex.toString(),
    timestamp: timestamp.toString(),
    tx_hash: txHash,
  });

  try {
    await fetch(`${BACKEND_URL}/api/publish?${params}`);
  } catch {
    // backend not available, ignore
  }
}

export async function publishPollCreatedEvent(
  pollId: string,
  question: string,
  creator: string,
  deadline: number,
  txHash: string
) {
  const params = new URLSearchParams({
    event_type: "poll_created",
    poll_id: pollId,
    question,
    creator,
    deadline: deadline.toString(),
    tx_hash: txHash,
  });

  try {
    await fetch(`${BACKEND_URL}/api/publish?${params}`);
  } catch {
    // backend not available, ignore
  }
}
