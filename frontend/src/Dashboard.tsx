import { useState, useEffect, useCallback, useRef } from "react";
import { UserButton, useUser } from "@clerk/clerk-react";
import {
  initKit,
  openAuthModal,
  getAddress,
  disconnectWallet,
  getSupportedWallets,
  onWalletChange,
  WalletError,
  getWalletErrorLabel,
} from "./services/wallets";
import {
  createPoll,
  castVote,
  getPollInfo,
  getResults,
  hasVoted,
  waitForTxConfirmation,
  fetchBalance,
  truncateKey,
  buildExplorerUrl,
} from "./services/contract";
import {
  subscribeToEvents,
  publishVoteEvent,
  publishPollCreatedEvent,
} from "./services/backend";
import type { WalletInfo, PollInfo, Feedback, TxStatus, SseStatus } from "./types";

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "CDROSAGWRIQG5TSRF2FFFFXZD3RGPWDS6I3IWUTC67MELRRLZHNOE6ID";

const DEMO_POLL: PollInfo = {
  question: "What is the best blockchain?",
  options: ["Stellar", "Ethereum", "Solana", "Bitcoin"],
  deadline: Math.floor(Date.now() / 1000) + 86400 * 7,
  owner: "",
  totalVotes: 0,
};

export default function Dashboard() {
  const { user } = useUser();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>({ status: "idle" });

  const [poll, setPoll] = useState<PollInfo>(DEMO_POLL);
  const [pollResults, setPollResults] = useState<number[]>(DEMO_POLL.options.map(() => 0));
  const [pollLoading, setPollLoading] = useState(true);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);
  const [newDeadline, setNewDeadline] = useState(3);
  const [deadlineUnit, setDeadlineUnit] = useState<"days" | "hours">("days");
  const [liveEvents, setLiveEvents] = useState<Array<{ voter: string; option: number; time: Date }>>([]);
  const [sseStatus, setSseStatus] = useState<SseStatus>("disconnected");

  const refreshInterval = useRef<ReturnType<typeof setInterval>>(undefined);
  const actionLock = useRef(false);

  const refreshResults = useCallback(async () => {
    if (!CONTRACT_ID) return;
    const results = await getResults(CONTRACT_ID, poll.options.length);
    if (results) {
      setPollResults(results.votes);
    }
    const info = await getPollInfo(CONTRACT_ID);
    if (info) {
      setPoll((prev) => ({ ...prev, ...info }));
    }
    setPollLoading(false);
  }, [poll.options.length]);

  const loadBalance = useCallback(async (key: string) => {
    const result = await fetchBalance(key);
    if (!result.isError) {
      setBalance(parseFloat(result.balance).toFixed(2));
    }
  }, []);

  useEffect(() => {
    initKit("TESTNET");
    Promise.resolve(getSupportedWallets()).then((results: any[]) => {
      setWallets(
        results.map((w: any) => ({
          id: w.id,
          name: w.name,
          icon: w.icon,
          isAvailable: w.isAvailable,
          url: w.url,
        }))
      );
    });

    const unsubWallet = onWalletChange((address) => {
      if (address && address !== publicKey) {
        setPublicKey(address);
        setAlreadyVoted(false);
        setTxStatus({ status: "idle" });
        setFeedback({ type: "success", message: "Wallet switched. Refreshing data..." });
      } else if (!address) {
        setPublicKey(null);
      }
    });

    return () => {
      unsubWallet?.();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToEvents(
      (event) => {
        if (event.type === "Vote") {
          const { voter, optionIndex } = event.data;
          setLiveEvents((prev) =>
            [{ voter, option: optionIndex, time: new Date() }, ...prev].slice(0, 20)
          );
          setPollResults((prev) => {
            const copy = [...prev];
            if (copy[optionIndex] !== undefined) {
              copy[optionIndex]++;
            }
            return copy;
          });
          setPoll((prev) => ({ ...prev, totalVotes: prev.totalVotes + 1 }));
        } else if (event.type === "PollCreated") {
          setFeedback({
            type: "success",
            message: "New poll created! Refreshing data...",
          });
          refreshResults();
        }
      },
      (status) => setSseStatus(status)
    );
    return unsubscribe;
  }, [refreshResults]);

  useEffect(() => {
    if (!publicKey) return;
    checkAlreadyVoted();
    refreshResults();
    loadBalance(publicKey);
    refreshInterval.current = setInterval(refreshResults, 10000);
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [publicKey, refreshResults, loadBalance]);

  const checkAlreadyVoted = async () => {
    if (!publicKey) return;
    const voted = await hasVoted(CONTRACT_ID, publicKey);
    setAlreadyVoted(voted);
  };

  const handleConnect = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setIsConnecting(true);
    setFeedback(null);
    try {
      await openAuthModal();
      const address = await getAddress();
      if (!address) {
        throw new WalletError("WALLET_NOT_FOUND", "No address returned");
      }
      setPublicKey(address);
    } catch (e: any) {
      if (e instanceof WalletError) {
        setFeedback({ type: "error", message: getWalletErrorLabel(e.code) });
      } else {
        setFeedback({ type: "error", message: e?.message || "Failed to connect wallet" });
      }
    } finally {
      setIsConnecting(false);
      actionLock.current = false;
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setPublicKey(null);
    setBalance(null);
    setPollResults(DEMO_POLL.options.map(() => 0));
    setAlreadyVoted(false);
    setTxStatus({ status: "idle" });
    setFeedback(null);
    setLiveEvents([]);
  };

  const handleVote = async (optionIndex: number) => {
    if (!publicKey || alreadyVoted || actionLock.current) return;
    actionLock.current = true;
    setIsVoting(true);
    setFeedback(null);
    setTxStatus({ status: "pending" });

    const result = await castVote(publicKey, optionIndex, CONTRACT_ID);

    if (result.txHash) {
      setTxStatus({ status: "confirming", hash: result.txHash });

      const confirm = await waitForTxConfirmation(result.txHash);

      if (confirm.status === "confirmed") {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({
          type: "success",
          message: "Vote confirmed on ledger!",
          txHash: result.txHash,
        });
      } else {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({
          type: "success",
          message: "Vote submitted (awaiting confirmation)",
          txHash: result.txHash,
        });
      }
      setAlreadyVoted(true);

      publishVoteEvent(
        CONTRACT_ID,
        publicKey,
        optionIndex,
        Math.floor(Date.now() / 1000),
        result.txHash
      );

      setPollResults((prev) => {
        const copy = [...prev];
        copy[optionIndex] = (copy[optionIndex] || 0) + 1;
        return copy;
      });
      setPoll((prev) => ({ ...prev, totalVotes: prev.totalVotes + 1 }));
    } else {
      setTxStatus({ status: "fail", error: result.error });
      setFeedback({ type: "error", message: result.error || "Vote failed" });
    }

    setIsVoting(false);
    actionLock.current = false;
  };

  const handleCreatePoll = async () => {
    if (!publicKey || !newQuestion || newOptions.filter((o) => o.trim()).length < 2 || actionLock.current) return;
    actionLock.current = true;
    setIsCreating(true);
    setFeedback(null);
    setTxStatus({ status: "pending" });

    const multiplier = deadlineUnit === "days" ? 86400 : 3600;
    const deadline = Math.floor(Date.now() / 1000) + multiplier * newDeadline;
    const filteredOptions = newOptions.filter((o) => o.trim());

    const result = await createPoll(
      publicKey,
      newQuestion,
      filteredOptions,
      deadline,
      CONTRACT_ID
    );

    if (result.txHash) {
      setTxStatus({ status: "confirming", hash: result.txHash });

      const confirm = await waitForTxConfirmation(result.txHash);

      if (confirm.status === "confirmed") {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({
          type: "success",
          message: "Poll created and confirmed on ledger!",
          txHash: result.txHash,
        });
      } else {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({
          type: "success",
          message: "Poll created (awaiting confirmation)",
          txHash: result.txHash,
        });
      }

      publishPollCreatedEvent(
        CONTRACT_ID,
        newQuestion,
        publicKey,
        deadline,
        result.txHash
      );

      setPoll({
        question: newQuestion,
        options: filteredOptions,
        deadline,
        owner: publicKey,
        totalVotes: 0,
      });
      setPollResults(filteredOptions.map(() => 0));
      setShowCreatePoll(false);
      setNewQuestion("");
      setNewOptions(["", ""]);
      setNewDeadline(3);
    } else {
      setTxStatus({ status: "fail", error: result.error });
      setFeedback({ type: "error", message: result.error || "Failed to create poll" });
    }

    setIsCreating(false);
    actionLock.current = false;
  };

  const addOption = () => setNewOptions((prev) => [...prev, ""]);
  const updateOption = (index: number, value: string) =>
    setNewOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  const pollActive = poll.deadline > Math.floor(Date.now() / 1000);
  const totalVotes = pollResults.reduce((a, b) => a + b, 0);

  const sseColor =
    sseStatus === "connected"
      ? "bg-green"
      : sseStatus === "reconnecting"
      ? "bg-yellow-400"
      : "bg-error";

  const sseLabel =
    sseStatus === "connected"
      ? "Live"
      : sseStatus === "reconnecting"
      ? "Reconnecting..."
      : "Offline";

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
        <header className="bg-white border-b border-border-gray">
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-[-0.5px] text-near-black">
              <div className="w-8 h-8 bg-kraken-purple rounded-lg flex items-center justify-center text-white text-base shrink-0">
                ✦
              </div>
              StellarPay
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-silver-blue hidden md:inline">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg text-center">
            <div className="w-16 h-16 bg-kraken-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-7 h-7 text-kraken-purple"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                />
              </svg>
            </div>
            <h1 className="font-display text-[28px] md:text-3xl font-bold tracking-[-0.5px] leading-tight mb-2 text-near-black">
              Connect Your Wallet
            </h1>
            <p className="text-silver-blue text-base leading-snug max-w-sm mx-auto">
              Connect a Stellar wallet to vote on polls and interact with the
              contract.
            </p>
            <div className="mt-7 flex gap-3 flex-wrap justify-center">
              <button
                className="inline-flex items-center justify-center gap-1.5 px-5 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </button>
            </div>

            {feedback && (
              <div
                className={`mt-5 p-3.5 rounded-lg text-sm text-left flex items-start gap-2.5 ${
                  feedback.type === "success"
                    ? "bg-green/10 border border-green/30 text-green-dark"
                    : "bg-error-bg border border-error/20 text-error"
                }`}
              >
                <span className="shrink-0 text-lg leading-none mt-px">
                  {feedback.type === "success" ? "✓" : "✕"}
                </span>
                <div>
                  <div className="font-semibold">{feedback.message}</div>
                </div>
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-cool-gray mb-3">
                Supported Wallets
              </h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {wallets.slice(0, 6).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-border-gray rounded-lg text-sm"
                  >
                    <img src={w.icon} alt={w.name} className="w-5 h-5" />
                    <span className="text-near-black">{w.name}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        w.isAvailable ? "bg-green" : "bg-gray-300"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-border-gray">
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-12 flex items-center justify-center text-xs text-silver-blue">
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-kraken-purple no-underline hover:underline"
            >
              Stellar Network
            </a>
            <span className="mx-2">·</span>
            Testnet · Soroban Contract
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      <header className="bg-white border-b border-border-gray sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-[-0.5px] text-near-black">
            <div className="w-8 h-8 bg-kraken-purple rounded-lg flex items-center justify-center text-white text-base shrink-0">
              ✦
            </div>
            StellarPay
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-silver-blue">
              <span className={`w-2 h-2 rounded-full inline-block ${sseColor}`} />
              <span className="hidden sm:inline">{sseLabel}</span>
            </div>
            <span className="text-sm text-silver-blue hidden md:inline">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white border border-border-gray rounded-[12px] p-5 md:p-6 shadow-card">
            <div className="font-ui text-xs font-bold uppercase tracking-[0.04em] text-cool-gray mb-3.5">
              Wallet
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-silver-blue text-sm">Connected</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green inline-block shrink-0" />
                  <span className="text-sm font-mono font-medium text-near-black">
                    {truncateKey(publicKey)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-silver-blue text-sm">Balance</span>
                <span className="text-sm font-mono font-medium text-near-black">
                  {balance !== null ? `${balance} XLM` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-silver-blue text-sm">Network</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs font-medium bg-green/10 text-green-dark">
                  Testnet
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border-gray">
                <a
                  href={buildExplorerUrl("account", publicKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-kraken-purple underline"
                >
                  Explorer ↗
                </a>
                <button
                  className="text-xs text-silver-blue hover:text-error transition-colors cursor-pointer bg-transparent border-none font-ui"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-gray rounded-[12px] p-5 md:p-6 shadow-card md:col-span-2">
            <div className="font-ui text-xs font-bold uppercase tracking-[0.04em] text-cool-gray mb-3.5">
              Contract
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-silver-blue">Poll Contract</span>
                <span className="text-sm font-mono font-medium text-near-black">
                  {truncateKey(CONTRACT_ID)}
                </span>
              </div>
              <a
                href={buildExplorerUrl("contract", CONTRACT_ID)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-kraken-purple underline"
              >
                View on Explorer ↗
              </a>
            </div>
          </div>
        </div>

        {txStatus.status !== "idle" && (
          <div
            className={`mb-4 p-3.5 rounded-lg text-sm flex items-start gap-2.5 border ${
              txStatus.status === "pending"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : txStatus.status === "confirming"
                ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                : txStatus.status === "success"
                ? "bg-green/10 border-green/30 text-green-dark"
                : "bg-error-bg border-error/20 text-error"
            }`}
          >
            <span className="shrink-0 text-lg leading-none mt-px">
              {txStatus.status === "pending"
                ? "⏳"
                : txStatus.status === "confirming"
                ? "⏳"
                : txStatus.status === "success"
                ? "✓"
                : "✕"}
            </span>
            <div className="flex flex-col gap-1">
              <div className="font-semibold">
                {txStatus.status === "pending"
                  ? "Submitting transaction..."
                  : txStatus.status === "confirming"
                  ? "Confirming on ledger..."
                  : txStatus.status === "success"
                  ? "Transaction complete"
                  : "Transaction failed"}
              </div>
              {txStatus.hash && (
                <a
                  href={buildExplorerUrl("tx", txStatus.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs underline"
                >
                  View on Explorer ↗
                </a>
              )}
              {txStatus.error && (
                <div className="text-xs opacity-80">{txStatus.error}</div>
              )}
            </div>
          </div>
        )}

        {feedback && !feedback.txHash && txStatus.status === "idle" && (
          <div
            className={`mb-4 p-3.5 rounded-lg text-sm flex items-start gap-2.5 ${
              feedback.type === "success"
                ? "bg-green/10 border border-green/30 text-green-dark"
                : "bg-error-bg border border-error/20 text-error"
            }`}
          >
            <span className="shrink-0 text-lg leading-none mt-px">
              {feedback.type === "success" ? "✓" : "✕"}
            </span>
            <div>
              <div className="font-semibold">{feedback.message}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="bg-white border border-border-gray rounded-[12px] p-5 md:p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-ui text-xs font-bold uppercase tracking-[0.04em] text-cool-gray mb-1">
                    Live Poll
                  </div>
                  {pollLoading ? (
                    <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <h2 className="font-display text-xl font-bold text-near-black">
                      {poll.question}
                    </h2>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-medium ${
                      pollActive
                        ? "bg-green/10 text-green-dark"
                        : "bg-error-bg text-error"
                    }`}
                  >
                    {pollActive ? "Active" : "Ended"}
                  </span>
                  <span className="text-xs text-silver-blue">
                    {totalVotes} votes
                  </span>
                </div>
              </div>

              {pollLoading ? (
                <div className="flex flex-col gap-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3.5 rounded-[10px] border border-border-gray">
                      <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-2" />
                      <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {poll.options.map((option, index) => {
                    const votes = pollResults[index] || 0;
                    const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                    return (
                      <button
                        key={index}
                        className={`w-full text-left p-3.5 rounded-[10px] border transition-all duration-150 cursor-pointer ${
                          alreadyVoted
                            ? "bg-gray-50 border-border-gray cursor-default"
                            : "bg-white border-border-gray hover:border-kraken-purple hover:bg-kraken-purple-subtle"
                        }`}
                        onClick={() => handleVote(index)}
                        disabled={alreadyVoted || isVoting || !pollActive}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-near-black">
                            {option}
                          </span>
                          <span className="text-xs text-silver-blue font-mono">
                            {votes} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-kraken-purple rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {alreadyVoted && (
                <p className="text-xs text-silver-blue mt-3 text-center">
                  You have already voted on this poll.
                </p>
              )}
              {!pollActive && (
                <p className="text-xs text-error mt-3 text-center">
                  This poll has ended.
                </p>
              )}

              <button
                className="mt-4 text-xs text-kraken-purple underline bg-transparent border-none cursor-pointer"
                onClick={() => setShowCreatePoll(true)}
              >
                Create new poll
              </button>
            </div>
          </div>

          <div>
            <div className="bg-white border border-border-gray rounded-[12px] p-5 md:p-6 shadow-card">
              <div className="font-ui text-xs font-bold uppercase tracking-[0.04em] text-cool-gray mb-3.5">
                Live Activity
              </div>
              {liveEvents.length === 0 ? (
                <p className="text-xs text-silver-blue">
                  No recent activity. Be the first to vote!
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                  {liveEvents.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-xs"
                    >
                      <span className="text-kraken-purple shrink-0 mt-0.5">
                        ●
                      </span>
                      <div>
                        <span className="font-mono font-medium text-near-black">
                          {truncateKey(ev.voter)}
                        </span>{" "}
                        <span className="text-silver-blue">voted for</span>{" "}
                        <span className="font-medium text-near-black">
                          {poll.options[ev.option] || `Option ${ev.option}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showCreatePoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-[16px] p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-near-black">
                Create Poll
              </h3>
              <button
                className="text-silver-blue hover:text-near-black bg-transparent border-none text-xl cursor-pointer"
                onClick={() => setShowCreatePoll(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-[0.04em]">
                  Question
                </label>
                <input
                  className="px-3.5 py-3 border border-border-gray rounded-[10px] bg-white text-near-black text-sm font-ui outline-none focus:border-kraken-purple"
                  type="text"
                  placeholder="What is your favorite?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>

              {newOptions.map((opt, i) => (
                <div className="flex flex-col gap-1.5" key={i}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-cool-gray uppercase tracking-[0.04em]">
                      Option {i + 1}
                    </label>
                    {newOptions.length > 2 && (
                      <button
                        className="text-xs text-error bg-transparent border-none cursor-pointer"
                        onClick={() => setNewOptions((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    className="px-3.5 py-3 border border-border-gray rounded-[10px] bg-white text-near-black text-sm font-ui outline-none focus:border-kraken-purple"
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                </div>
              ))}

              <button
                className="text-xs text-kraken-purple underline bg-transparent border-none cursor-pointer self-start"
                onClick={addOption}
              >
                + Add option
              </button>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-cool-gray uppercase tracking-[0.04em]">
                  Duration
                </label>
                <div className="flex gap-2">
                  <input
                    className="px-3.5 py-3 border border-border-gray rounded-[10px] bg-white text-near-black text-sm font-ui outline-none focus:border-kraken-purple w-24"
                    type="number"
                    min={1}
                    max={365}
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <select
                    className="px-3.5 py-3 border border-border-gray rounded-[10px] bg-white text-near-black text-sm font-ui outline-none focus:border-kraken-purple"
                    value={deadlineUnit}
                    onChange={(e) => setDeadlineUnit(e.target.value as "days" | "hours")}
                  >
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>

              <button
                className="inline-flex items-center justify-center gap-1.5 px-5 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep disabled:opacity-50 w-full mt-2"
                onClick={handleCreatePoll}
                disabled={
                  isCreating ||
                  !newQuestion ||
                  newOptions.filter((o) => o.trim()).length < 2
                }
              >
                {isCreating ? "Creating..." : "Create Poll"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-border-gray">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-12 flex items-center justify-center text-xs text-silver-blue">
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-kraken-purple no-underline hover:underline"
          >
            Stellar Network
          </a>
          <span className="mx-2">·</span>
          Testnet · Soroban Contract
          <span className="mx-2">·</span>
          <a
            href={buildExplorerUrl("account", publicKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-kraken-purple no-underline hover:underline"
          >
            My Account
          </a>
        </div>
      </footer>
    </div>
  );
}
