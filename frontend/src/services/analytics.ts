import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

export function initAnalytics(): void {
  if (!POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    autocapture: true,
  });
}

export function capturePageView(): void {
  if (!POSTHOG_KEY) return;
  posthog.capture("$pageview");
}

export function captureEvent(name: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.capture(name, properties);
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

export function captureVote(address: string, optionIndex: number): void {
  captureEvent("vote_cast", {
    voter: address.slice(0, 8),
    option_index: optionIndex,
  });
}

export function capturePollCreated(address: string, question: string): void {
  captureEvent("poll_created", {
    creator: address.slice(0, 8),
    question: question.slice(0, 50),
  });
}

export function captureWalletConnected(address: string, walletName: string): void {
  captureEvent("wallet_connected", {
    address: address.slice(0, 8),
    wallet: walletName,
  });
}

export function captureFeedback(rating: string, message: string): void {
  captureEvent("feedback_submitted", {
    rating,
    message: message.slice(0, 200),
  });
}
