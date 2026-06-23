import { useState, useEffect, useCallback } from "react";
import { UserButton, useUser } from "@clerk/clerk-react";
import {
  checkFreighterConnection,
  connectWallet,
  fetchBalance,
  sendXLM,
  truncateKey,
} from "./stellar";

type Feedback = {
  type: "success" | "error";
  message: string;
  hash?: string;
};

export default function Dashboard() {
  const { user } = useUser();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [freighterAvailable, setFreighterAvailable] = useState(false);

  useEffect(() => {
    checkFreighterConnection().then(setFreighterAvailable);
  }, []);

  const loadBalance = useCallback(async (key: string) => {
    const result = await fetchBalance(key);
    if (!result.isError) {
      setBalance(result.balance);
    }
  }, []);

  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    loadBalance(publicKey).then(() => {
      if (cancelled) return;
    });
    const interval = setInterval(() => {
      loadBalance(publicKey);
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicKey, loadBalance]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setFeedback(null);
    try {
      const key = await connectWallet();
      setPublicKey(key);
      await loadBalance(key);
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setPublicKey(null);
    setBalance("0");
    setFeedback(null);
    setDestination("");
    setAmount("");
  };

  const handleSend = async () => {
    if (!publicKey) return;
    setIsSending(true);
    setFeedback(null);

    const result = await sendXLM(publicKey, destination, amount);

    if (result.hash) {
      setFeedback({
        type: "success",
        message: "Transaction successful!",
        hash: result.hash,
      });
      setDestination("");
      setAmount("");
      await loadBalance(publicKey);
    } else {
      setFeedback({
        type: "error",
        message: result.error || "Transaction failed",
      });
    }

    setIsSending(false);
  };

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
              <span className="text-sm text-silver-blue hidden md:inline">{user?.primaryEmailAddress?.emailAddress}</span>
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg text-center">
            <div className="w-16 h-16 bg-kraken-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-kraken-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h1 className="font-display text-[28px] md:text-3xl font-bold tracking-[-0.5px] leading-tight mb-2 text-near-black">
              Connect Your Wallet
            </h1>
            <p className="text-silver-blue text-base leading-snug max-w-sm mx-auto">
              Connect your Freighter wallet to send XLM on the Stellar testnet.
            </p>
            {!freighterAvailable && (
              <p className="text-error text-sm mt-3">
                Freighter wallet not detected. Please install the Freighter browser extension.
              </p>
            )}
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
                  "Connect Freighter"
                )}
              </button>
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-5 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-white text-kraken-purple-dark border border-kraken-purple-dark hover:bg-kraken-purple-subtle no-underline"
              >
                Get Freighter
              </a>
            </div>
            {feedback && (
              <div className={`mt-5 p-3.5 rounded-lg text-sm text-left flex items-start gap-2.5 ${feedback.type === "success" ? "bg-green/10 border border-green/30 text-green-dark" : "bg-error-bg border border-error/20 text-error"}`}>
                <span className="shrink-0 text-lg leading-none mt-px">
                  {feedback.type === "success" ? "✓" : "✕"}
                </span>
                <div>
                  <div className="font-semibold">{feedback.message}</div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="bg-white border-t border-border-gray">
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-12 flex items-center justify-center text-xs text-silver-blue">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline">Stellar Network</a>
            <span className="mx-2">·</span>
            Testnet
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
            <span className="text-sm text-silver-blue hidden md:inline">{user?.primaryEmailAddress?.emailAddress}</span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white border border-border-gray rounded-[12px] p-5 md:p-6 shadow-card">
            <div className="font-ui text-xs font-bold uppercase tracking-[0.04em] text-cool-gray mb-3.5">
              Wallet
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-silver-blue text-sm">Connected</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green inline-block shrink-0" />
                  <span className="text-sm font-mono font-medium text-near-black">{truncateKey(publicKey)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-silver-blue text-sm">Network</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] text-xs font-medium bg-green/10 text-green-dark">
                  Testnet
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border-gray">
                <div />
                <button
                  className="text-xs text-silver-blue hover:text-error transition-colors cursor-pointer bg-transparent border-none font-ui"
                  onClick={handleDisconnect}
                >
                  Disconnect wallet
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-gray rounded-[12px] p-5 md:p-6 shadow-card">
            <div className="font-ui text-xs font-bold uppercase tracking-[0.04em] text-cool-gray mb-3.5">
              Balance
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl md:text-5xl font-bold tracking-[-0.5px] leading-tight text-near-black">
                {parseFloat(balance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </span>
              <span className="text-base md:text-lg font-medium text-silver-blue">XLM</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border-gray rounded-[12px] p-5 md:p-6 shadow-card max-w-2xl">
          <div className="font-ui text-xs font-bold uppercase tracking-[0.04em] text-cool-gray mb-3.5">
            Send XLM
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-[0.04em]">
                Destination Address
              </label>
              <input
                className="px-3.5 py-3 border border-border-gray rounded-[10px] bg-white text-near-black text-sm font-ui outline-none transition-all duration-150 focus:border-kraken-purple focus:shadow-[0_0_0_2px_rgba(113,50,245,0.1)] placeholder:text-silver-blue"
                type="text"
                placeholder="G... or raw key"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-cool-gray uppercase tracking-[0.04em]">
                Amount (XLM)
              </label>
              <input
                className="px-3.5 py-3 border border-border-gray rounded-[10px] bg-white text-near-black text-sm font-ui outline-none transition-all duration-150 focus:border-kraken-purple focus:shadow-[0_0_0_2px_rgba(113,50,245,0.1)] placeholder:text-silver-blue"
                type="number"
                step="0.00001"
                min="0.00001"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-1.5 px-5 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
              onClick={handleSend}
              disabled={isSending || !destination || !amount}
            >
              {isSending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                "Send XLM"
              )}
            </button>
          </div>

          {feedback && (
            <div className={`mt-4 p-3.5 rounded-lg text-sm flex items-start gap-2.5 ${feedback.type === "success" ? "bg-green/10 border border-green/30 text-green-dark" : "bg-error-bg border border-error/20 text-error"}`}>
              <span className="shrink-0 text-lg leading-none mt-px">
                {feedback.type === "success" ? "✓" : "✕"}
              </span>
              <div className="flex flex-col gap-1">
                <div className="font-semibold">{feedback.message}</div>
                {feedback.hash && (
                  <div className="font-mono text-xs opacity-90">
                    Tx: {truncateKey(feedback.hash)}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${feedback.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-kraken-purple underline ml-2"
                    >
                      View on explorer ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-border-gray">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-12 flex items-center justify-center text-xs text-silver-blue">
          <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline">Stellar Network</a>
          <span className="mx-2">·</span>
          Testnet
          <span className="mx-2">·</span>
          <a
            href={`https://stellar.expert/explorer/testnet/account/${publicKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-kraken-purple no-underline hover:underline"
          >
            View on Explorer
          </a>
        </div>
      </footer>
    </div>
  );
}
