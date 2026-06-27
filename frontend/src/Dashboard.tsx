import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Vote, Activity, BarChart3, Users, Plus,
  CheckCircle2, Clock, ExternalLink, LogOut, Zap, Award, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  AnimatedContainer, AnimatedItem, MetricCard, GlassCard,
  AnimatedFeedback, AnimatedTxBanner, containerVariants, itemVariants,
} from "@/components/animations";

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
    if (results) setPollResults(results.votes);
    const info = await getPollInfo(CONTRACT_ID);
    if (info) setPoll((prev) => ({ ...prev, ...info }));
    setPollLoading(false);
  }, [poll.options.length]);

  const checkAlreadyVoted = useCallback(async () => {
    if (!publicKey) return;
    const voted = await hasVoted(CONTRACT_ID, publicKey);
    setAlreadyVoted(voted);
  }, [publicKey]);

  const loadBalance = useCallback(async (key: string) => {
    const result = await fetchBalance(key);
    if (!result.isError) setBalance(parseFloat(result.balance).toFixed(2));
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
    return () => unsubWallet?.();
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
          setFeedback({ type: "success", message: "New poll created! Refreshing data..." });
          refreshResults();
          toast("New poll created", { description: question });
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-canvas flex flex-col relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/[0.035] blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-accent-teal/[0.025] blur-[120px]" />
        </div>
        <Toaster position="bottom-right" richColors />

        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-canvas/80 border-b border-hairline sticky top-0 z-20 backdrop-blur-md"
        >
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <motion.button
              whileHover={{ x: 2 }}
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 font-display text-[22px] font-normal tracking-[-0.3px] text-ink cursor-pointer bg-transparent border-none text-left"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-primary"
              />
              StellarVote
            </motion.button>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggle}
                className="w-9 h-9 flex items-center justify-center rounded-md border border-hairline bg-canvas text-body/90 hover:text-ink cursor-pointer transition-all duration-150"
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
              </motion.button>
              <span className="text-sm text-body/90 hidden md:inline font-ui">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
              <UserButton />
            </div>
          </div>
        </motion.header>

        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-lg"
          >
            <GlassCard className="p-10">
              <div className="text-center">
                <motion.div
                  variants={itemVariants}
                  className="w-14 h-14 bg-primary-disabled rounded-xl flex items-center justify-center mx-auto mb-5"
                >
                  <Wallet className="w-6 h-6 text-primary" />
                </motion.div>
                <motion.h1
                  variants={itemVariants}
                  className="font-display text-[28px] md:text-[32px] font-normal tracking-[-0.5px] leading-tight mb-3 text-ink"
                >
                  Connect Your Wallet
                </motion.h1>
                <motion.p
                  variants={itemVariants}
                  className="text-body text-[15px] leading-relaxed max-w-sm mx-auto mb-8 font-ui"
                >
                  Connect a Stellar wallet to vote on polls and interact with the Soroban smart contract.
                </motion.p>
                <motion.div variants={itemVariants}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="min-w-[200px] h-11 text-[15px]"
                    >
                      {isConnecting ? (
                        <span className="flex items-center gap-2">
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                          Connecting...
                        </span>
                      ) : "Connect Wallet"}
                    </Button>
                  </motion.div>
                </motion.div>

                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-6"
                    >
                      <AnimatedFeedback type={feedback.type} message={feedback.message} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Separator className="my-8" />

              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-ui text-[11px] font-medium uppercase tracking-[1.5px] text-muted">
                    Supported Wallets
                  </span>
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-accent-teal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {wallets.slice(0, 6).map((w, i) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.3 }}
                      whileHover={{ x: 2 }}
                      className="flex items-center gap-3 px-3.5 py-2.5 bg-canvas rounded-md border border-hairline text-sm"
                    >
                      <img src={w.icon} alt={w.name} className="w-5 h-5 rounded-sm" />
                      <span className="text-ink font-medium flex-1">{w.name}</span>
                      <motion.span
                        animate={w.isAvailable ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-1.5 h-1.5 rounded-full ${w.isAvailable ? "bg-success" : "bg-muted-soft"}`}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </GlassCard>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-5 flex items-center justify-center gap-2 text-xs text-body/80"
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-accent-teal"
              />
              Stellar Testnet — Soroban SDK v27
              <span className="w-1.5 h-1.5 rounded-full bg-muted-soft" />
              Contract: {truncateKey(CONTRACT_ID)}
            </motion.div>
          </motion.div>
        </main>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="bg-surface-dark"
        >
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-center text-xs text-on-dark-soft">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline font-medium">Stellar Network</a>
            <span className="mx-2">·</span>
          {STELLAR_NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"} · Soroban Contract
          </div>
        </motion.footer>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-canvas flex flex-col relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-20 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/[0.03] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-accent-teal/[0.02] blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/[0.015] blur-[150px]" />
      </div>

      <Toaster position="bottom-right" richColors />

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-canvas/80 border-b border-hairline sticky top-0 z-20 backdrop-blur-md"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.button
            whileHover={{ x: 2 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 font-display text-[22px] font-normal tracking-[-0.3px] text-ink cursor-pointer bg-transparent border-none"
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            StellarVote
          </motion.button>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-surface-card/85 backdrop-blur-sm"
            >
              <motion.span
                animate={sseStatus === "connected" ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-1.5 h-1.5 rounded-full ${sseColor}`}
              />
              <span className="font-ui text-[11px] text-body/90 font-medium">{sseLabel}</span>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-hairline bg-canvas text-body/90 hover:text-ink cursor-pointer transition-all duration-150"
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
            </motion.button>
            <span className="text-sm text-body/90 hidden md:inline font-ui">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton />
          </div>
        </div>
      </motion.header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <AnimatedContainer className="space-y-6">
          <AnimatedItem>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="inline-flex items-center gap-2 rounded-full border-hairline/50 bg-surface-card/85 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-body/80 backdrop-blur-sm"
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="h-2 w-2 rounded-full bg-success"
                />
                Live Dashboard
              </Badge>
            </div>
            <h1 className="font-display text-[28px] md:text-[34px] font-normal tracking-[-0.5px] text-ink">
              Polling Overview
            </h1>
            <p className="text-body text-[15px] font-ui max-w-2xl">
              Monitor on-chain polls, cast votes, and track real-time activity from the Soroban smart contract.
            </p>
          </AnimatedItem>

          <AnimatedItem>
            <motion.div
              variants={itemVariants}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <MetricCard
                label="Total Polls"
                value="1"
                icon={<BarChart3 className="h-6 w-6 text-primary" />}
                trend="Active"
                trendUp
              />
              <MetricCard
                label="Total Votes"
                value={String(totalVotes)}
                icon={<Users className="h-6 w-6 text-primary" />}
                trend={totalVotes > 0 ? "+1 this session" : "0"}
                trendUp
              />
              <MetricCard
                label="Active Voters"
                value={alreadyVoted ? "1" : "0"}
                icon={<Zap className="h-6 w-6 text-primary" />}
                trend={alreadyVoted ? "You voted" : "Not yet"}
                trendUp={alreadyVoted}
              />
              <MetricCard
                label="Network"
                value={STELLAR_NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"}
                icon={<Globe className="h-6 w-6 text-primary" />}
                trend={backendOnline ? "Online" : "Offline"}
                trendUp={backendOnline}
              />
            </motion.div>
          </AnimatedItem>

          <AnimatedItem>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="md:col-span-1">
                  <GlassCard className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-body/80">
                        Wallet
                      </p>
                      <p className="text-xs text-body/70">Connected account</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-body/80 font-ui">Address</span>
                      <div className="flex items-center gap-1.5">
                        <motion.span
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-1.5 h-1.5 rounded-full bg-success shrink-0"
                        />
                        <span className="text-sm font-mono font-semibold text-ink">
                          {truncateKey(publicKey)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-body/80 font-ui">Balance</span>
                      <span className="text-sm font-mono font-semibold text-ink font-mono">
                        {balance !== null ? `${balance} XLM` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-body/80 font-ui">Network</span>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        <motion.span
                          animate={backendOnline ? { scale: [1, 1.3, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-success" : "bg-error"} mr-1.5 shrink-0`}
                        />
                        {STELLAR_NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"}
                      </Badge>
                    </div>
                    <Separator className="my-0.5" />
                    <div className="flex items-center gap-3">
                      <a href={buildExplorerUrl("account", publicKey)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary underline font-medium font-ui flex items-center gap-1">
                        Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-muted-soft">·</span>
                      <motion.button
                        whileHover={{ x: 2 }}
                        className="text-[11px] text-body/80 hover:text-error transition-colors cursor-pointer bg-transparent border-none font-medium font-ui flex items-center gap-1"
                        onClick={handleDisconnect}
                      >
                        <LogOut className="h-3 w-3" /> Disconnect
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <div className="md:col-span-3">
                <GlassCard className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-teal/10 text-accent-teal">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-body/80">
                        Poll Contract
                      </p>
                      <p className="text-xs text-body/70">Deployed on Stellar testnet</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-primary shrink-0"
                      />
                      <span className="text-sm font-mono font-semibold text-ink">{truncateKey(CONTRACT_ID)}</span>
                    </div>
                    <a href={buildExplorerUrl("contract", CONTRACT_ID)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary underline font-medium font-ui flex items-center gap-1">
                      View on Explorer <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </GlassCard>
              </div>
            </div>
          </AnimatedItem>

          <AnimatePresence>
            {txStatus.status !== "idle" && (
              <AnimatedItem key="tx-status">
                <AnimatedTxBanner
                  status={txStatus.status}
                  hash={txStatus.hash}
                  error={txStatus.error}
                  explorerUrl={txStatus.hash ? buildExplorerUrl("tx", txStatus.hash) : undefined}
                />
              </AnimatedItem>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {feedback && !feedback.txHash && txStatus.status === "idle" && (
              <AnimatedItem key="feedback">
                <AnimatedFeedback type={feedback.type} message={feedback.message} />
              </AnimatedItem>
            )}
          </AnimatePresence>

          <AnimatedItem>
            <Tabs defaultValue="poll" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="poll">
                  <Vote className="w-3.5 h-3.5 mr-1.5" />
                  Live Poll
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  Activity
                  {liveEvents.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-1.5 px-1.5 py-0.5 rounded-pill bg-primary/10 text-primary text-[10px] font-mono"
                    >
                      {liveEvents.length}
                    </motion.span>
                  )}
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait">
                <TabsContent value="poll" key="poll-tab">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                  >
                    <div className="lg:col-span-2">
                      <GlassCard className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-body/80">
                                Live Poll
                              </p>
                              {pollLoading ? null : (
                                <motion.span
                                  animate={pollActive ? { scale: [1, 1.3, 1] } : {}}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className={`w-1.5 h-1.5 rounded-full ${pollActive ? "bg-success" : "bg-error"}`}
                                />
                              )}
                            </div>
                            <p className="text-xs text-body/80">
                              {pollActive ? "Active — cast your vote on-chain" : "This poll has ended"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant={pollActive ? "default" : "outline"} className="text-[11px]">
                              {pollActive ? "Active" : "Ended"}
                            </Badge>
                            <span className="text-xs text-muted font-medium font-mono flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {totalVotes} votes
                            </span>
                          </div>
                        </div>

                        {pollLoading ? (
                          <div className="flex flex-col gap-3">
                            <Skeleton className="h-8 w-64" />
                            {[1, 2, 3, 4].map((i) => (
                              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
                            ))}
                          </div>
                        ) : (
                          <>
                            <motion.h2
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="font-display text-[24px] md:text-[26px] font-normal tracking-[-0.5px] leading-[1.2] text-ink mb-5"
                            >
                              {poll.question}
                            </motion.h2>
                            <motion.div
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                              className="flex flex-col gap-3"
                            >
                              {poll.options.map((option, index) => {
                                const votes = pollResults[index] || 0;
                                const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                                const isSelected = alreadyVoted;
                                return (
                                  <motion.div
                                    key={index}
                                    variants={itemVariants}
                                    whileHover={isSelected || !pollActive ? {} : { scale: 1.01, x: 4 }}
                                    whileTap={isSelected || !pollActive ? {} : { scale: 0.99 }}
                                  >
                                    <button
                                      className={`w-full text-left p-4 rounded-lg border transition-all duration-150 cursor-pointer ${
                                        isSelected
                                          ? "bg-surface-card border-hairline cursor-default"
                                          : "bg-canvas border-hairline hover:border-primary hover:bg-surface-soft hover:shadow-elevated"
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
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                          className="h-full bg-primary rounded-full"
                                        />
                                      </div>
                                    </button>
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          </>
                        )}

                        <Separator className="my-5" />
                        <div className="flex items-center justify-between">
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-muted font-ui"
                          >
                            {alreadyVoted ? (
                              <span className="text-success font-medium flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                You voted on this poll
                              </span>
                            ) : !pollActive ? (
                              <span className="text-error font-medium">This poll has ended</span>
                            ) : (
                              <span>Click an option to cast your vote</span>
                            )}
                          </motion.div>
                          <motion.div whileHover={{ x: 2 }}>
                            <Button variant="link" size="sm" onClick={() => setShowCreatePoll(true)} className="text-[13px] flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" /> Create poll
                            </Button>
                          </motion.div>
                        </div>
                      </GlassCard>
                    </div>

                    <div>
                      <GlassCard className="p-6 h-full">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Activity className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted flex-1">
                            Live Activity
                          </p>
                          <motion.span
                            animate={sseStatus === "connected" ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`w-2 h-2 rounded-full ${sseColor}`}
                            title={sseLabel}
                          />
                        </div>
                        <p className="text-xs text-body/70 mb-5">Real-time SSE feed</p>

                        {liveEvents.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-10 text-center"
                          >
                            <div className="w-12 h-12 rounded-xl bg-surface-soft flex items-center justify-center mb-4">
                              <Clock className="w-5 h-5 text-muted-soft" />
                            </div>
                            <p className="text-xs text-body/80 font-ui">No recent activity</p>
                            <p className="text-xs text-body/70 mt-0.5 font-ui">Be the first to vote!</p>
                          </motion.div>
                        ) : (
                          <div className="relative">
                            <motion.div
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ duration: 0.8 }}
                              className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary via-primary/50 to-transparent"
                              style={{ transformOrigin: "top" }}
                            />
                            <div className="flex flex-col gap-3">
                              {liveEvents.slice(0, 10).map((ev, i) => (
                                <motion.div
                                  key={`${ev.type}-${i}`}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05, duration: 0.3 }}
                                  className="flex items-start gap-3 pl-5 relative"
                                >
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.05 + 0.1, type: "spring" }}
                                    className={`absolute left-0 top-[6px] w-[15px] h-[15px] rounded-full border-2 border-canvas flex items-center justify-center ${
                                      ev.type === "vote" ? "bg-primary" : "bg-accent-teal"
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-canvas" />
                                  </motion.span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs leading-snug font-ui">
                                      {ev.type === "vote" ? (
                                        <>
                                          <span className="font-mono font-semibold text-ink">{truncateKey(ev.voter)}</span>
                                          <span className="text-body/70"> voted for </span>
                                          <span className="font-semibold text-ink">{poll.options[ev.option] || `Option ${ev.option}`}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="font-mono font-semibold text-ink">{truncateKey(ev.creator)}</span>
                                          <span className="text-body/70"> created </span>
                                          <span className="font-semibold text-ink">
                                            {ev.question.length > 36 ? ev.question.slice(0, 36) + "..." : ev.question}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="activity" key="activity-tab">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <GlassCard className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-teal/10 text-accent-teal">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                            All Activity
                          </p>
                          <p className="text-xs text-body/70">Complete event history from the SSE stream</p>
                        </div>
                      </div>

                      {liveEvents.length === 0 ? (
                        <div className="text-center py-12 text-muted text-sm font-ui">
                          No activity yet. Create a poll or vote to see events here.
                        </div>
                      ) : (
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="flex flex-col gap-1"
                        >
                          {liveEvents.map((ev, i) => (
                            <motion.div
                              key={i}
                              variants={itemVariants}
                              whileHover={{ x: 4 }}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-soft transition-colors text-sm"
                            >
                              <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.type === "vote" ? "bg-primary" : "bg-accent-teal"}`}
                              />
                              {ev.type === "vote" ? (
                                <div className="leading-snug font-ui">
                                  <span className="font-mono font-semibold text-ink">{truncateKey(ev.voter)}</span>
                                  <span className="text-body/70"> voted for </span>
                                  <span className="font-semibold text-ink">{poll.options[ev.option] || `Option ${ev.option}`}</span>
                                </div>
                              ) : (
                                <div className="leading-snug font-ui">
                                  <span className="font-mono font-semibold text-ink">{truncateKey(ev.creator)}</span>
                                  <span className="text-body/70"> created poll </span>
                                  <span className="font-semibold text-ink">{ev.question}</span>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </GlassCard>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </AnimatedItem>
        </AnimatedContainer>
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

            <AnimatePresence>
              {newOptions.map((opt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-1.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-ui font-medium uppercase tracking-[1.5px] text-muted">
                      Option {i + 1}
                    </label>
                    {newOptions.length > 2 && (
                      <motion.button
                        whileHover={{ x: 2 }}
                        className="text-[11px] text-error font-medium bg-transparent border-none cursor-pointer hover:underline font-ui"
                        onClick={() => setNewOptions((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </motion.button>
                    )}
                  </div>
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.div whileHover={{ x: 2 }} className="self-start">
              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add option
              </Button>
            </motion.div>

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

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-surface-dark mt-8"
      >
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-center text-xs text-on-dark-soft font-ui">
          <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline font-medium">Stellar Network</a>
          <span className="mx-2">·</span>
          {STELLAR_NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"} · Soroban Contract
          <span className="mx-2">·</span>
          <a href={buildExplorerUrl("account", publicKey)} target="_blank" rel="noopener noreferrer" className="text-primary no-underline hover:underline font-medium">My Account</a>
          <span className="mx-2">·</span>
          <motion.span
            animate={backendOnline ? {} : { opacity: [1, 0.5, 1] }}
            transition={backendOnline ? {} : { duration: 1.5, repeat: Infinity }}
            className={`inline-flex items-center gap-1 ${backendOnline ? "text-success" : "text-error"}`}
          >
            <motion.span
              animate={backendOnline ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-success" : "bg-error"}`}
            />
            Backend {backendOnline ? "Online" : "Offline"}
          </motion.span>
        </div>
      </motion.footer>
    </motion.div>
  );
}
