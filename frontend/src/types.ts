export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  isAvailable: boolean;
  url: string;
}

export interface PollInfo {
  question: string;
  options: string[];
  deadline: number;
  owner: string;
  totalVotes: number;
}

export interface PollResults {
  votes: number[];
}

export interface TxStatus {
  status: "idle" | "pending" | "confirming" | "success" | "fail";
  hash?: string;
  error?: string;
}

export type FeedbackType = "success" | "error";

export interface Feedback {
  type: FeedbackType;
  message: string;
  txHash?: string;
}

export interface VoteEvent {
  pollId: string;
  voter: string;
  optionIndex: number;
  timestamp: number;
  txHash: string;
}

export interface PollCreatedEvent {
  pollId: string;
  question: string;
  creator: string;
  deadline: number;
  txHash: string;
}

export type BackendEvent =
  | { type: "Vote"; data: VoteEvent }
  | { type: "PollCreated"; data: PollCreatedEvent };

export type SseStatus = "connected" | "disconnected" | "reconnecting";
