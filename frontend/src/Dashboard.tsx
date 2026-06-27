import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  initKit, openAuthModal, getAddress, disconnectWallet, getSupportedWallets,
  onWalletChange, WalletError, getWalletErrorLabel,
} from "./services/wallets";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import {
  createPoll, castVote, getPollInfo, getResults, hasVoted,
  waitForTxConfirmation, fetchBalance, truncateKey, buildExplorerUrl,
} from "./services/contract";
import {
  subscribeToEvents, publishVoteEvent, publishPollCreatedEvent, checkBackendHealth,
} from "./services/backend";
import { STELLAR_NETWORK } from "./services/contract";
import { useTheme } from "./ThemeProvider";
import { captureWalletConnected, captureVote, capturePollCreated } from "./services/analytics";
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
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    checkBackendHealth().then((result) => setBackendOnline(!!result));
    const id = setInterval(() => {
      checkBackendHealth().then((result) => setBackendOnline(!!result));
    }, 30000);
    return () => clearInterval(id);
  }, []);

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
          toast("New vote cast", {
            description: `Someone voted for ${poll.options[optionIndex] || `Option ${optionIndex}`}`,
          });
        } else if (event.type === "PollCreated") {
          const { question, creator } = event.data;
          const newEvent = { type: "poll_created" as const, question, creator, time: new Date() };
          setLiveEvents((prev) => [newEvent, ...prev].slice(0, 20));
          setFeedback({
            type: "success",
            message: "New poll created! Refreshing data...",
          });
          refreshResults();
          toast("New poll created", {
            description: question,
          });
        }
      },
      (status) => setSseStatus(status)
    );
    return unsubscribe;
  }, [refreshResults, poll.options]);

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
      captureWalletConnected(address, "StellarWalletsKit");
      toast.success("Wallet connected");
    } catch (e) {
      if (e instanceof WalletError) {
        setFeedback({ type: "error", message: getWalletErrorLabel(e.code) });
        toast.error(getWalletErrorLabel(e.code));
      } else {
        const msg = e instanceof Error ? e.message : "Failed to connect wallet";
        setFeedback({ type: "error", message: msg });
        toast.error(msg);
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
    toast("Wallet disconnected");
  };

  const handleVote = async (optionIndex: number) => {
    if (!publicKey || alreadyVoted || actionLock.current) return;
    actionLock.current = true;
    setIsVoting(true);
    setFeedback(null);
    setTxStatus({ status: "pending" });
    toast.loading("Submitting vote...");

    const result = await castVote(publicKey, optionIndex, CONTRACT_ID);

    if (result.txHash) {
      setTxStatus({ status: "confirming", hash: result.txHash });
      toast.loading("Confirming on ledger...");
      const confirm = await waitForTxConfirmation(result.txHash);

      if (confirm.status === "confirmed") {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({ type: "success", message: "Vote confirmed on ledger!", txHash: result.txHash });
        toast.success("Vote confirmed on ledger");
      } else {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({ type: "success", message: "Vote submitted (awaiting confirmation)", txHash: result.txHash });
        toast.success("Vote submitted");
      }
      setAlreadyVoted(true);
      captureVote(publicKey, optionIndex);

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
      toast.error(result.error || "Vote failed");
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
    toast.loading("Creating poll...");

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
        toast.success("Poll created on ledger");
      } else {
        setTxStatus({ status: "success", hash: result.txHash });
        setFeedback({ type: "success", message: "Poll created (awaiting confirmation)", txHash: result.txHash });
        toast.success("Poll created");
      }

      capturePollCreated(publicKey, newQuestion);
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
      toast.error(result.error || "Failed to create poll");
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

  const sseColor = sseStatus === "connected" ? "bg-success" : sseStatus === "reconnecting" ? "bg-warning" : "bg-error";
  const sseLabel = sseStatus === "connected" ? "Live" : sseStatus === "reconnecting" ? "Reconnecting..." : "Offline";

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <Toaster position="bottom-right" richColors />
        <header className="bg-canvas border-b border-hairline">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 font-display text-[22px] font-normal tracking-[-0.3px] text-ink cursor-pointer bg-transparent border-none text-left">
              <span className="w-2 h-2 rounded-full bg-primary" />
              StellarVote
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="w-9 h-9 flex items-center justify-center rounded-md border border-hairline bg-canvas text-muted hover:text-ink cursor-pointer transition-all duration-150"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-muted hidden md:inline">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-lg">
            <div className="bg-surface-card rounded-xl p-10 shadow-card border border-hairline-soft">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary-disabled rounded-xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                </div>
                <h1 className="font-display text-[28px] md:text-[32px] font-normal tracking-[-0.5px] leading-tight mb-3 text-ink">
                  Connect Your Wallet
                </h1>
                <p className="text-muted text-[15px] leading-relaxed max-w-sm mx-auto mb-8 font-ui">
                  Connect a Stellar wallet to vote on polls and interact with the Soroban smart contract.
                </p>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="min-w-[200px] h-11 text-[15px]"
                >
                  {isConnecting ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </span>
                  ) : "Connect Wallet"}
                </Button>

                {feedback && (
                  <div className={`mt-6 p-4 rounded-lg text-sm text-left flex items-start gap-3 ${
                    feedback.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-error/10 text-error"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${feedback.type === "success" ? "bg-success" : "bg-error"}`} />
                    <div className="font-medium">{feedback.message}</div>
                  </div>
                )}
              </div>

              <Separator className="my-8" />

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-ui text-[11px] font-medium uppercase tracking-[1.5px] text-muted">
                    Supported Wallets
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {wallets.slice(0, 6).map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 bg-canvas rounded-md border border-hairline text-sm"
                    >
                      <img src={w.icon} alt={w.name} className="w-5 h-5 rounded-sm" />
                      <span className="text-ink font-medium flex-1">{w.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${w.isAvailable ? "bg-success" : "bg-muted-soft"}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
              Stellar Testnet — Soroban SDK v27
              <span className="w-1.5 h-1.5 rounded-full bg-muted-soft" />
              Contract: {truncateKey(CONTRACT_ID)}
            </div>
          </div>
        </main>

        <footer className="bg-surface-dark">
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-center text-xs text-on-dark-soft">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline font-medium">Stellar Network</a>
            <span className="mx-2">·</span>
          {STELLAR_NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"} · Soroban Contract
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Toaster position="bottom-right" richColors />
      <header className="bg-canvas border-b border-hairline sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 font-display text-[22px] font-normal tracking-[-0.3px] text-ink cursor-pointer bg-transparent border-none">
            <span className="w-2 h-2 rounded-full bg-primary" />
            StellarVote
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-surface-card/60">
              <span className={`w-1.5 h-1.5 rounded-full ${sseColor}`} />
              <span className="font-ui text-[11px] text-muted font-medium">{sseLabel}</span>
            </div>
            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-hairline bg-canvas text-muted hover:text-ink cursor-pointer transition-all duration-150"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              )}
            </button>
            <span className="text-sm text-muted hidden md:inline font-ui">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <div className="md:col-span-1">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Wallet</CardTitle>
                <CardDescription>Connected account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-ui">Address</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      <span className="text-sm font-mono font-semibold text-ink">
                        {truncateKey(publicKey)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-ui">Balance</span>
                    <span className="text-sm font-mono font-semibold text-ink font-mono">
                      {balance !== null ? `${balance} XLM` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-ui">Network</span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-success" : "bg-error"} mr-1.5 shrink-0`} />
                      {STELLAR_NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"}
                    </Badge>
                  </div>
                  <Separator className="my-0.5" />
                  <div className="flex items-center gap-3">
                    <a href={buildExplorerUrl("account", publicKey)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary underline font-medium font-ui">
                      Explorer ↗
                    </a>
                    <span className="text-hairline">·</span>
                    <button className="text-[11px] text-muted hover:text-error transition-colors cursor-pointer bg-transparent border-none font-medium font-ui" onClick={handleDisconnect}>
                      Disconnect
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Poll Contract</CardTitle>
                <CardDescription>Deployed on Stellar testnet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm font-mono font-semibold text-ink">{truncateKey(CONTRACT_ID)}</span>
                  </div>
                  <a href={buildExplorerUrl("contract", CONTRACT_ID)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary underline font-medium font-ui">
                    View on Explorer ↗
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {txStatus.status !== "idle" && (
          <div className={`mb-5 p-4 rounded-lg text-sm flex items-start gap-3 border ${
            txStatus.status === "pending" ? "bg-surface-card border-hairline text-body"
            : txStatus.status === "confirming" ? "bg-surface-card border-accent-amber/20 text-warning"
            : txStatus.status === "success" ? "bg-success/10 border-success/20 text-success"
            : "bg-error/10 border-error/20 text-error"
          }`}>
            <span className="shrink-0 mt-0.5">
              {txStatus.status === "pending" || txStatus.status === "confirming" ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : txStatus.status === "success" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="font-semibold font-ui">
                {txStatus.status === "pending" ? "Submitting transaction..."
                : txStatus.status === "confirming" ? "Confirming on ledger..."
                : txStatus.status === "success" ? "Transaction complete"
                : "Transaction failed"}
              </div>
              {txStatus.hash && (
                <a href={buildExplorerUrl("tx", txStatus.hash)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs underline mt-0.5">
                  View on Explorer ↗
                </a>
              )}
              {txStatus.error && <div className="text-xs opacity-80 mt-0.5">{txStatus.error}</div>}
            </div>
          </div>
        )}

        {feedback && !feedback.txHash && txStatus.status === "idle" && (
          <div className={`mb-5 p-4 rounded-lg text-sm flex items-start gap-3 border ${
            feedback.type === "success" ? "bg-success/10 border-success/20 text-success" : "bg-error/10 border-error/20 text-error"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${feedback.type === "success" ? "bg-success" : "bg-error"}`} />
            <div className="font-medium font-ui">{feedback.message}</div>
          </div>
        )}

        <Tabs defaultValue="poll" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="poll">Live Poll</TabsTrigger>
            <TabsTrigger value="activity">
              Activity
              {liveEvents.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-pill bg-primary/10 text-primary text-[10px] font-mono">
                  {liveEvents.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="poll">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Live Poll</CardTitle>
                        <CardDescription>
                          {pollActive ? "Active — cast your vote on-chain" : "This poll has ended"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={pollActive ? "default" : "outline"} className="text-[11px]">
                          {pollActive ? "Active" : "Ended"}
                        </Badge>
                        <span className="text-xs text-muted font-medium font-mono">{totalVotes} votes</span>
                      </div>
                    </div>
                    {pollLoading ? (
                      <Skeleton className="h-8 w-64 mt-2" />
                    ) : (
                      <h2 className="font-display text-[24px] md:text-[26px] font-normal tracking-[-0.5px] leading-[1.2] text-ink mt-2">
                        {poll.question}
                      </h2>
                    )}
                  </CardHeader>
                  <CardContent>
                    {pollLoading ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {poll.options.map((option, index) => {
                          const votes = pollResults[index] || 0;
                          const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                          const isSelected = alreadyVoted;
                          return (
                            <button
                              key={index}
                              className={`w-full text-left p-4 rounded-lg border transition-all duration-150 cursor-pointer ${
                                isSelected
                                  ? "bg-surface-card border-hairline cursor-default"
                                  : "bg-canvas border-hairline hover:border-primary hover:bg-surface-soft hover:shadow-sm"
                              }`}
                              onClick={() => handleVote(index)}
                              disabled={isSelected || isVoting || !pollActive}
                            >
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-sm font-medium text-ink flex items-center gap-2.5 font-ui">
                                  <span className="w-6 h-6 rounded-md bg-primary-disabled text-primary text-[12px] font-medium flex items-center justify-center shrink-0 font-mono">
                                    {String.fromCharCode(65 + index)}
                                  </span>
                                  {option}
                                </span>
                                <span className="text-xs text-muted font-mono font-medium tabular-nums">
                                  {votes} ({pct.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-surface-soft rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <Separator className="my-5" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted font-ui">
                        {alreadyVoted ? (
                          <span className="text-success font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            You voted on this poll
                          </span>
                        ) : !pollActive ? (
                          <span className="text-error font-medium">This poll has ended</span>
                        ) : (
                          <span>Click an option to cast your vote</span>
                        )}
                      </div>
                      <Button variant="link" size="sm" onClick={() => setShowCreatePoll(true)} className="text-[13px]">
                        + Create poll
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Live Activity</CardTitle>
                      <span className={`w-2 h-2 rounded-full ${sseColor} ml-auto`} title={sseLabel} />
                    </div>
                    <CardDescription>Real-time SSE feed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {liveEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 rounded-xl bg-surface-soft flex items-center justify-center mb-4">
                          <svg className="w-5 h-5 text-muted-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xs text-muted font-ui">No recent activity</p>
                        <p className="text-xs text-muted-soft mt-0.5 font-ui">Be the first to vote!</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-hairline" />
                        <div className="flex flex-col gap-3">
                          {liveEvents.slice(0, 10).map((ev, i) => (
                            <div key={i} className="flex items-start gap-3 pl-5 relative">
                              <span className={`absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full border-2 border-canvas flex items-center justify-center ${
                                ev.type === "vote" ? "bg-primary" : "bg-accent-teal"
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-canvas" />
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs leading-snug font-ui">
                                  {ev.type === "vote" ? (
                                    <>
                                      <span className="font-mono font-semibold text-ink">{truncateKey(ev.voter)}</span>
                                      <span className="text-muted"> voted for </span>
                                      <span className="font-semibold text-ink">{poll.options[ev.option] || `Option ${ev.option}`}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="font-mono font-semibold text-ink">{truncateKey(ev.creator)}</span>
                                      <span className="text-muted"> created </span>
                                      <span className="font-semibold text-ink">
                                        {ev.question.length > 36 ? ev.question.slice(0, 36) + "..." : ev.question}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>All Activity</CardTitle>
                <CardDescription>Complete event history from the SSE stream</CardDescription>
              </CardHeader>
              <CardContent>
                {liveEvents.length === 0 ? (
                  <div className="text-center py-12 text-muted text-sm font-ui">
                    No activity yet. Create a poll or vote to see events here.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {liveEvents.map((ev, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-soft transition-colors text-sm">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.type === "vote" ? "bg-primary" : "bg-accent-teal"}`} />
                        {ev.type === "vote" ? (
                          <div className="leading-snug font-ui">
                            <span className="font-mono font-semibold text-ink">{truncateKey(ev.voter)}</span>
                            <span className="text-muted"> voted for </span>
                            <span className="font-semibold text-ink">{poll.options[ev.option] || `Option ${ev.option}`}</span>
                          </div>
                        ) : (
                          <div className="leading-snug font-ui">
                            <span className="font-mono font-semibold text-ink">{truncateKey(ev.creator)}</span>
                            <span className="text-muted"> created poll </span>
                            <span className="font-semibold text-ink">{ev.question}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showCreatePoll} onOpenChange={setShowCreatePoll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Poll</DialogTitle>
            <DialogDescription>
              Set up a new on-chain poll. Voters will interact directly with the Soroban contract.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-ui font-medium uppercase tracking-[1.5px] text-muted">
                Question
              </label>
              <Input
                placeholder="What is your favorite?"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
              />
            </div>

            {newOptions.map((opt, i) => (
              <div className="flex flex-col gap-1.5" key={i}>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-ui font-medium uppercase tracking-[1.5px] text-muted">
                    Option {i + 1}
                  </label>
                  {newOptions.length > 2 && (
                    <button
                      className="text-[11px] text-error font-medium bg-transparent border-none cursor-pointer hover:underline font-ui"
                      onClick={() => setNewOptions((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addOption} className="self-start">
              + Add option
            </Button>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-ui font-medium uppercase tracking-[1.5px] text-muted">
                Duration
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
                <Select value={deadlineUnit} onValueChange={(v) => v && setDeadlineUnit(v)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePoll(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePoll}
              disabled={isCreating || !newQuestion || newOptions.filter((o) => o.trim()).length < 2}
            >
              {isCreating ? "Creating..." : "Create Poll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="bg-surface-dark mt-8">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-center text-xs text-on-dark-soft font-ui">
          <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline font-medium">Stellar Network</a>
          <span className="mx-2">·</span>
          {STELLAR_NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"} · Soroban Contract
          <span className="mx-2">·</span>
          <a href={buildExplorerUrl("account", publicKey)} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline font-medium">My Account</a>
          <span className="mx-2">·</span>
          <span className={`inline-flex items-center gap-1 ${backendOnline ? "text-success" : "text-error"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-success" : "bg-error"}`} />
            Backend {backendOnline ? "Online" : "Offline"}
          </span>
        </div>
      </footer>
    </div>
  );
}
