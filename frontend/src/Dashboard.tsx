import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
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
import { useTheme } from "./ThemeProvider";
import type { WalletInfo, PollInfo, Feedback, TxStatus, SseStatus } from "./types";

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "CDROSAGWRIQG5TSRF2FFFFXZD3RGPWDS6I3IWUTC67MELRRLZHNOE6ID";

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

const DEMO_POLL: PollInfo = {
  question: "What is the best blockchain?",
  options: ["Stellar", "Ethereum", "Solana", "Bitcoin"],
  deadline: unixNow() + 86400 * 7,
  owner: "",
  totalVotes: 0,
};

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
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
  const [liveEvents, setLiveEvents] = useState<Array<
    | { type: "vote"; voter: string; option: number; time: Date }
    | { type: "poll_created"; question: string; creator: string; time: Date }
  >>([]);
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

  const checkAlreadyVoted = useCallback(async () => {
    if (!publicKey) return;
    const voted = await hasVoted(CONTRACT_ID, publicKey);
    setAlreadyVoted(voted);
  }, [publicKey]);

  const loadBalance = useCallback(async (key: string) => {
    const result = await fetchBalance(key);
    if (!result.isError) {
      setBalance(parseFloat(result.balance).toFixed(2));
    }
  }, []);

  useEffect(() => {
    initKit(Networks.TESTNET);
    getSupportedWallets().then((results) => {
      setWallets(
        results.map((w) => ({
          id: w.id,
          name: w.name,
          icon: w.icon,
          isAvailable: w.isAvailable,
          url: w.url,
        }))
      );
    });

    const unsubWallet = onWalletChange((address) => {
      if (address) {
        setPublicKey(address);
        setAlreadyVoted(false);
        setTxStatus({ status: "idle" });
        setFeedback({ type: "success", message: "Wallet switched. Refreshing data..." });
      } else {
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
          const newEvent = { type: "vote" as const, voter, option: optionIndex, time: new Date() };
          setLiveEvents((prev) => [newEvent, ...prev].slice(0, 20));
          setPollResults((prev) => {
            const copy = [...prev];
            if (copy[optionIndex] !== undefined) copy[optionIndex]++;
            return copy;
          });
          setPoll((prev) => ({ ...prev, totalVotes: prev.totalVotes + 1 }));
        } else if (event.type === "PollCreated") {
          const { question, creator } = event.data;
          const newEvent = { type: "poll_created" as const, question, creator, time: new Date() };
          setLiveEvents((prev) => [newEvent, ...prev].slice(0, 20));
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
    const id = setTimeout(() => {
      checkAlreadyVoted();
      refreshResults();
      loadBalance(publicKey);
    }, 0);
    refreshInterval.current = setInterval(refreshResults, 10000);
    return () => {
      clearTimeout(id);
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [publicKey, refreshResults, loadBalance, checkAlreadyVoted]);

  const handleConnect = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setIsConnecting(true);
    setFeedback(null);
    try {
      await openAuthModal();
      const address = await getAddress();
      if (!address) throw new WalletError("WALLET_NOT_FOUND", "No address returned");
      setPublicKey(address);
    } catch (e) {
      if (e instanceof WalletError) {
        setFeedback({ type: "error", message: getWalletErrorLabel(e.code) });
      } else {
        setFeedback({ type: "error", message: e instanceof Error ? e.message : "Failed to connect wallet" });
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
        setFeedback({ type: "success", message: "Vote confirmed on ledger!", txHash: result.txHash });
      } else {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({ type: "success", message: "Vote submitted (awaiting confirmation)", txHash: result.txHash });
      }
      setAlreadyVoted(true);

      publishVoteEvent(CONTRACT_ID, publicKey, optionIndex, unixNow(), result.txHash);

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
    const deadline = unixNow() + multiplier * newDeadline;
    const filteredOptions = newOptions.filter((o) => o.trim());

    const result = await createPoll(publicKey, newQuestion, filteredOptions, deadline, CONTRACT_ID);

    if (result.txHash) {
      setTxStatus({ status: "confirming", hash: result.txHash });
      const confirm = await waitForTxConfirmation(result.txHash);

      if (confirm.status === "confirmed") {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({ type: "success", message: "Poll created and confirmed on ledger!", txHash: result.txHash });
      } else {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({ type: "success", message: "Poll created (awaiting confirmation)", txHash: result.txHash });
      }

      publishPollCreatedEvent(CONTRACT_ID, newQuestion, publicKey, deadline, result.txHash);

      setPoll({ question: newQuestion, options: filteredOptions, deadline, owner: publicKey, totalVotes: 0 });
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

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);
  const pollActive = poll.deadline * 1000 > nowMs;
  const totalVotes = pollResults.reduce((a, b) => a + b, 0);

  const sseColor = sseStatus === "connected" ? "bg-green" : sseStatus === "reconnecting" ? "bg-yellow-400" : "bg-error";
  const sseLabel = sseStatus === "connected" ? "Live" : sseStatus === "reconnecting" ? "Reconnecting..." : "Offline";

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col">
        <header className="bg-surface border-b border-border-gray">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-[-0.5px] text-near-black cursor-pointer bg-transparent border-none text-left">
              <div className="w-8 h-8 bg-kraken-purple rounded-lg flex items-center justify-center text-white text-base shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              StellarPay
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-border-gray bg-surface text-silver-blue hover:text-near-black cursor-pointer transition-all duration-150"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-silver-blue hidden md:inline">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-kraken-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-9 h-9 text-kraken-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h1 className="font-display text-[32px] md:text-[36px] font-bold tracking-[-0.5px] leading-tight mb-3 text-near-black">
              Connect Your Wallet
            </h1>
            <p className="text-silver-blue text-base leading-relaxed max-w-sm mx-auto mb-8">
              Connect a Stellar wallet to vote on polls and interact with the Soroban smart contract.
            </p>
            <button
              className="inline-flex items-center justify-center gap-2 px-6 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mx-auto"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>

            {feedback && (
              <div className={`mt-6 p-4 rounded-lg text-sm text-left flex items-start gap-3 ${
                feedback.type === "success"
                  ? "bg-green/10 border border-green/20 text-green-dark"
                  : "bg-error-bg border border-error/20 text-error"
              }`}>
                <span className="shrink-0 text-lg leading-none mt-px">
                  {feedback.type === "success" ? (
                    <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : "✕"}
                </span>
                <div className="font-medium">{feedback.message}</div>
              </div>
            )}

            <div className="mt-10">
              <h3 className="text-xs font-semibold text-cool-gray uppercase tracking-[0.06em] mb-4">
                Supported Wallets
              </h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {wallets.slice(0, 6).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-border-gray rounded-[10px] text-sm shadow-micro"
                  >
                    <img src={w.icon} alt={w.name} className="w-5 h-5" />
                    <span className="text-near-black font-medium">{w.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${w.isAvailable ? "bg-green" : "bg-gray-300"}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-surface border-t border-border-gray">
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-center text-xs text-silver-blue">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline font-medium">Stellar Network</a>
            <span className="mx-2">·</span>
            Testnet · Soroban Contract
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <header className="bg-surface border-b border-border-gray sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-[-0.5px] text-near-black">
            <div className="w-8 h-8 bg-kraken-purple rounded-lg flex items-center justify-center text-white text-base shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            StellarPay
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-border-gray bg-surface text-silver-blue hover:text-near-black cursor-pointer transition-all duration-150"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              )}
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`w-2 h-2 rounded-full inline-block ${sseColor}`} />
              <span className="text-silver-blue hidden sm:inline">{sseLabel}</span>
            </div>
            <span className="text-sm text-silver-blue hidden md:inline">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <div className="md:col-span-1 bg-surface border border-border-gray rounded-[12px] p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon className="w-4 h-4 text-cool-gray" />
              <span className="font-ui text-[11px] font-bold uppercase tracking-[0.06em] text-cool-gray">Wallet</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-silver-blue">Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green" />
                  <span className="text-sm font-mono font-semibold text-near-black">
                    {truncateKey(publicKey)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-silver-blue">Balance</span>
                <span className="text-sm font-mono font-semibold text-near-black">
                  {balance !== null ? `${balance} XLM` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-silver-blue">Network</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[11px] font-semibold bg-green/10 text-green-dark">
                  Testnet
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2.5 border-t border-border-gray mt-1">
                <a href={buildExplorerUrl("account", publicKey)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-kraken-purple underline font-medium">
                  Explorer ↗
                </a>
                <span className="text-border-gray">·</span>
                <button className="text-[11px] text-silver-blue hover:text-error transition-colors cursor-pointer bg-transparent border-none font-medium" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-surface border border-border-gray rounded-[12px] p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <BarChartIcon className="w-4 h-4 text-cool-gray" />
              <span className="font-ui text-[11px] font-bold uppercase tracking-[0.06em] text-cool-gray">Contract</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-kraken-purple/10 rounded-[10px] flex items-center justify-center">
                  <svg className="w-4 h-4 text-kraken-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] text-silver-blue font-medium">Poll Contract</div>
                  <span className="text-sm font-mono font-semibold text-near-black">{truncateKey(CONTRACT_ID)}</span>
                </div>
              </div>
              <a href={buildExplorerUrl("contract", CONTRACT_ID)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-kraken-purple underline font-medium">
                View on Explorer ↗
              </a>
            </div>
          </div>
        </div>

        {txStatus.status !== "idle" && (
          <div className={`mb-5 p-4 rounded-[12px] text-sm flex items-start gap-3 border ${
            txStatus.status === "pending" ? "bg-blue-50 border-blue-200 text-blue-700"
            : txStatus.status === "confirming" ? "bg-yellow-50 border-yellow-200 text-yellow-800"
            : txStatus.status === "success" ? "bg-green/10 border-green/20 text-green-dark"
            : "bg-error-bg border-error/20 text-error"
          }`}>
            <span className="shrink-0 text-lg leading-none mt-px">
              {txStatus.status === "pending" || txStatus.status === "confirming" ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : txStatus.status === "success" ? (
                <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : "✕"}
            </span>
            <div className="flex flex-col gap-1">
              <div className="font-semibold">
                {txStatus.status === "pending" ? "Submitting transaction..."
                : txStatus.status === "confirming" ? "Confirming on ledger..."
                : txStatus.status === "success" ? "Transaction complete"
                : "Transaction failed"}
              </div>
              {txStatus.hash && (
                <a href={buildExplorerUrl("tx", txStatus.hash)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline">
                  View on Explorer ↗
                </a>
              )}
              {txStatus.error && <div className="text-xs opacity-80">{txStatus.error}</div>}
            </div>
          </div>
        )}

        {feedback && !feedback.txHash && txStatus.status === "idle" && (
          <div className={`mb-5 p-4 rounded-[12px] text-sm flex items-start gap-3 ${
            feedback.type === "success" ? "bg-green/10 border border-green/20 text-green-dark" : "bg-error-bg border border-error/20 text-error"
          }`}>
            <span className="shrink-0 text-lg leading-none mt-px">
              {feedback.type === "success" ? (
                <svg className="w-4 h-4 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : "✕"}
            </span>
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="bg-surface border border-border-gray rounded-[12px] p-6 shadow-card">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ClockIcon className="w-4 h-4 text-cool-gray" />
                    <span className="font-ui text-[11px] font-bold uppercase tracking-[0.06em] text-cool-gray">Live Poll</span>
                  </div>
                  {pollLoading ? (
                    <div className="h-7 w-56 bg-gray-100 rounded animate-pulse mt-1" />
                  ) : (
                    <h2 className="font-display text-[22px] md:text-[24px] font-bold tracking-[-0.5px] text-near-black mt-1">
                      {poll.question}
                    </h2>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold ${
                    pollActive ? "bg-green/10 text-green-dark" : "bg-error-bg text-error"
                  }`}>
                    {pollActive ? "Active" : "Ended"}
                  </span>
                  <span className="text-xs text-silver-blue font-medium">{totalVotes} votes</span>
                </div>
              </div>

              {pollLoading ? (
                <div className="flex flex-col gap-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-[10px] border border-border-gray">
                      <div className="h-4 w-36 bg-gray-100 rounded animate-pulse mb-2.5" />
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse" />
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
                        className={`w-full text-left p-4 rounded-[10px] border transition-all duration-150 cursor-pointer ${
                          alreadyVoted
                            ? "bg-gray-50 border-border-gray cursor-default"
                            : "bg-surface border-border-gray hover:border-kraken-purple hover:bg-kraken-purple-subtle hover:shadow-sm"
                        }`}
                        onClick={() => handleVote(index)}
                        disabled={alreadyVoted || isVoting || !pollActive}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-near-black flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-kraken-purple/10 text-kraken-purple text-[11px] font-bold flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + index)}
                            </span>
                            {option}
                          </span>
                          <span className="text-xs text-silver-blue font-mono font-medium">
                            {votes} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
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

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-gray">
                <div className="text-xs text-silver-blue">
                  {alreadyVoted ? (
                    <span className="text-green-dark font-medium">✓ You voted on this poll</span>
                  ) : !pollActive ? (
                    <span className="text-error font-medium">This poll has ended</span>
                  ) : (
                    <span>Click an option above to cast your vote</span>
                  )}
                </div>
                <button
                  className="text-xs text-kraken-purple underline font-medium bg-transparent border-none cursor-pointer hover:text-kraken-purple-deep transition-colors"
                  onClick={() => setShowCreatePoll(true)}
                >
                  + Create new poll
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-surface border border-border-gray rounded-[12px] p-6 shadow-card h-full">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-cool-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
                <span className="font-ui text-[11px] font-bold uppercase tracking-[0.06em] text-cool-gray">Live Activity</span>
                <span className={`w-1.5 h-1.5 rounded-full ${sseColor} ml-auto`} title={sseLabel} />
              </div>
              {liveEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <svg className="w-10 h-10 text-border-gray mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-silver-blue">No recent activity.</p>
                  <p className="text-xs text-silver-blue mt-0.5">Be the first to vote!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto -mx-1 px-1">
                  {liveEvents.map((ev, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-[10px] bg-gray-50 text-xs">
                      <span className="w-5 h-5 rounded-full bg-kraken-purple/10 flex items-center justify-center shrink-0 mt-0.5">
                        {ev.type === "vote" ? (
                          <svg className="w-2.5 h-2.5 text-kraken-purple" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5 text-kraken-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </span>
                      {ev.type === "vote" ? (
                        <div className="leading-snug">
                          <span className="font-mono font-semibold text-near-black">
                            {truncateKey(ev.voter)}
                          </span>
                          <span className="text-silver-blue"> voted for </span>
                          <span className="font-semibold text-near-black">
                            {poll.options[ev.option] || `Option ${ev.option}`}
                          </span>
                        </div>
                      ) : (
                        <div className="leading-snug">
                          <span className="font-mono font-semibold text-near-black">
                            {truncateKey(ev.creator)}
                          </span>
                          <span className="text-silver-blue"> created a poll </span>
                          <span className="font-semibold text-near-black">
                            {ev.question.length > 40 ? ev.question.slice(0, 40) + "..." : ev.question}
                          </span>
                        </div>
                      )}
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
          <div className="bg-surface rounded-[16px] p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-bold tracking-[-0.3px] text-near-black">
                Create Poll
              </h3>
              <button className="w-8 h-8 flex items-center justify-center rounded-[10px] text-silver-blue hover:text-near-black hover:bg-gray-100 bg-transparent border-none text-lg cursor-pointer transition-colors" onClick={() => setShowCreatePoll(false)}>
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-cool-gray uppercase tracking-[0.06em]">
                  Question
                </label>
                <input
                  className="px-4 py-3 border border-border-gray rounded-[10px] bg-surface text-near-black text-sm font-ui outline-none focus:border-kraken-purple focus:ring-1 focus:ring-kraken-purple/20 transition-all"
                  type="text"
                  placeholder="What is your favorite?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>

              {newOptions.map((opt, i) => (
                <div className="flex flex-col gap-1.5" key={i}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-cool-gray uppercase tracking-[0.06em]">
                      Option {i + 1}
                    </label>
                    {newOptions.length > 2 && (
                      <button
                        className="text-[11px] text-error font-medium bg-transparent border-none cursor-pointer hover:underline"
                        onClick={() => setNewOptions((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    className="px-4 py-3 border border-border-gray rounded-[10px] bg-surface text-near-black text-sm font-ui outline-none focus:border-kraken-purple focus:ring-1 focus:ring-kraken-purple/20 transition-all"
                    type="text"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                </div>
              ))}

              <button
                className="text-xs text-kraken-purple font-medium bg-transparent border-none cursor-pointer self-start hover:text-kraken-purple-deep transition-colors flex items-center gap-1"
                onClick={addOption}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add option
              </button>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-cool-gray uppercase tracking-[0.06em]">
                  Duration
                </label>
                <div className="flex gap-2">
                  <input
                    className="px-4 py-3 border border-border-gray rounded-[10px] bg-surface text-near-black text-sm font-ui outline-none focus:border-kraken-purple focus:ring-1 focus:ring-kraken-purple/20 transition-all w-24"
                    type="number"
                    min={1}
                    max={365}
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <select
                    className="px-4 py-3 border border-border-gray rounded-[10px] bg-surface text-near-black text-sm font-ui outline-none focus:border-kraken-purple focus:ring-1 focus:ring-kraken-purple/20 transition-all"
                    value={deadlineUnit}
                    onChange={(e) => setDeadlineUnit(e.target.value as "days" | "hours")}
                  >
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>

              <button
                className="inline-flex items-center justify-center gap-2 px-5 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep disabled:opacity-50 disabled:cursor-not-allowed w-full mt-1 shadow-sm"
                onClick={handleCreatePoll}
                disabled={isCreating || !newQuestion || newOptions.filter((o) => o.trim()).length < 2}
              >
                {isCreating ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : "Create Poll"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-surface border-t border-border-gray">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-center text-xs text-silver-blue">
          <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline font-medium">Stellar Network</a>
          <span className="mx-2">·</span>
          Testnet · Soroban Contract
          <span className="mx-2">·</span>
          <a href={buildExplorerUrl("account", publicKey)} target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline font-medium">My Account</a>
        </div>
      </footer>
    </div>
  );
}
