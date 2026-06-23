import { useState } from "react";
import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useTheme } from "./ThemeProvider";

const features = [
  {
    title: "Wallet Connection",
    desc: "Connect your Freighter wallet securely to send and receive XLM on the Stellar testnet.",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80&auto=format&fit=crop",
  },
  {
    title: "Send XLM",
    desc: "Transfer XLM to any Stellar address with instant confirmation and full transaction history.",
    image: "https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=600&q=80&auto=format&fit=crop",
  },
  {
    title: "Live Balances",
    desc: "Monitor your XLM balance in real-time with auto-refresh and detailed transaction explorer links.",
    image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&q=80&auto=format&fit=crop",
  },
];

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b border-border-gray bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-[-0.5px] text-near-black no-underline">
            <div className="w-8 h-8 bg-kraken-purple rounded-lg flex items-center justify-center text-white text-base shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            StellarPay
          </a>
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
            <div className="hidden md:flex items-center gap-2">
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center px-5 py-[9px] rounded-[12px] font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-surface text-kraken-purple-dark border border-kraken-purple-dark hover:bg-kraken-purple-subtle">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="inline-flex items-center justify-center px-5 py-[9px] rounded-[12px] font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep shadow-sm">
                  Get Started
                </button>
              </SignUpButton>
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-[10px] border border-border-gray bg-surface text-silver-blue hover:text-near-black cursor-pointer transition-all duration-150"
              aria-label="Toggle menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-border-gray bg-surface px-6 py-4 flex flex-col gap-3">
            <SignInButton mode="modal">
              <button className="w-full inline-flex items-center justify-center px-5 py-[9px] rounded-[12px] font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-surface text-kraken-purple-dark border border-kraken-purple-dark hover:bg-kraken-purple-subtle">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full inline-flex items-center justify-center px-5 py-[9px] rounded-[12px] font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep shadow-sm">
                Get Started
              </button>
            </SignUpButton>
          </div>
        )}
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1400&q=80&auto=format&fit=crop"
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 hero-gradient" />
          </div>
          <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-32 md:pt-36 md:pb-40">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium bg-kraken-purple/10 text-kraken-purple mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-kraken-purple animate-pulse" />
                Stellar Testnet — Soroban Smart Contracts
              </div>
              <h1 className="font-display text-[48px] md:text-[64px] font-bold tracking-[-1.5px] leading-[1.1] text-near-black mb-5">
                Decentralized
                <br />
                <span className="text-kraken-purple">Voting</span> on Stellar
              </h1>
              <p className="text-[18px] md:text-[20px] text-cool-gray leading-relaxed max-w-[540px] mb-10">
                Create polls, cast votes, and track results in real-time — powered by Soroban smart contracts and the Stellar network.
              </p>
              <div className="flex items-center gap-3">
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center justify-center gap-2 px-7 py-[14px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep shadow-sm">
                    Launch App
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center px-7 py-[14px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-surface text-near-black border border-border-gray hover:bg-gray-50 shadow-card">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-[36px] md:text-[44px] font-bold tracking-[-0.5px] leading-[1.22] text-near-black mb-4">
                Built for the{" "}
                <span className="text-kraken-purple">Stellar ecosystem</span>
              </h2>
              <p className="text-[18px] text-cool-gray max-w-[560px] mx-auto">
                Leveraging Soroban smart contracts for transparent, on-chain governance with real-time event streaming.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="group bg-surface border border-border-gray rounded-[16px] overflow-hidden shadow-card hover:shadow-lg transition-all duration-300"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={f.image}
                      alt={f.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6">
                    <div className="w-10 h-10 bg-kraken-purple/10 rounded-[10px] flex items-center justify-center mb-4">
                      <span className="text-kraken-purple font-display font-bold text-lg">{i + 1}</span>
                    </div>
                    <h3 className="font-ui text-[20px] font-semibold leading-snug text-near-black mb-2">{f.title}</h3>
                    <p className="text-silver-blue text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-app-bg border-t border-border-gray py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium bg-orange-500/10 text-orange-600 mb-4">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                Rust Stack
              </div>
              <h2 className="font-display text-[36px] md:text-[44px] font-bold tracking-[-0.5px] leading-[1.22] text-near-black mb-4">
                Powered by <span className="text-orange-500">Rust</span>
              </h2>
              <p className="text-[18px] text-cool-gray max-w-[560px] mx-auto">
                Smart contracts and backend infrastructure, written in Rust for safety, performance, and zero-cost abstractions.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  title: "Soroban SDK",
                  desc: "no_std smart contracts compiled to WASM. Proc-macro-driven #[contract] framework with built-in auth, storage, and event system.",
                  items: ["#![no_std] + wasm32v1-none", "env.storage().instance().set/get", "voter.require_auth()", "env.events().publish()"],
                },
                {
                  title: "Axum + Tokio",
                  desc: "Async HTTP server with SSE streaming. Broadcast channels fan out events to all connected clients in real-time.",
                  items: ["#[tokio::main] async runtime", "broadcast::channel pub/sub", "async_stream for SSE generators", "CorsLayer for dApp origin"],
                },
                {
                  title: "Cross-Contract Calls",
                  desc: "Two Soroban contracts communicating via contractimport. Reward contract calls Poll contract to verify votes.",
                  items: ["#[contractimport] WASM binding gen", "typed client = Client::new(&env, &addr)", "3 tests with mock_auth", "inter-contract composability"],
                },
              ].map((stack) => (
                <div key={stack.title} className="bg-surface border border-border-gray rounded-[14px] p-6 shadow-card">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-orange-500/10 rounded-[8px] flex items-center justify-center text-orange-500 text-sm font-bold shrink-0">{"</>"}</div>
                    <h3 className="font-ui text-[17px] font-semibold text-near-black">{stack.title}</h3>
                  </div>
                  <p className="text-silver-blue text-sm leading-relaxed mb-4">{stack.desc}</p>
                  <ul className="space-y-1.5">
                    {stack.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-near-black font-mono">
                        <span className="w-1 h-1 rounded-full bg-orange-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-xs text-silver-blue font-mono">
                soroban-sdk = "27.0.0-rc.1" · axum = "0.8" · tokio = "1" · wasm32v1-none
              </p>
            </div>
          </div>
        </section>

        <section className="bg-app-bg border-t border-border-gray py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-surface border border-border-gray rounded-[16px] p-8 md:p-12 shadow-card flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="w-full md:w-1/2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium bg-kraken-purple/10 text-kraken-purple mb-4">
                  Real-time Events
                </div>
                <h3 className="font-display text-[28px] font-bold tracking-[-0.5px] leading-[1.29] text-near-black mb-3">
                  Live updates via SSE
                </h3>
                <p className="text-silver-blue text-sm leading-relaxed mb-6">
                  Every vote and poll creation is broadcast instantly through Server-Sent Events. No polling, no delays — just real-time data flowing from the backend to your dashboard.
                </p>
                <div className="flex flex-col gap-3">
                  {["Vote events streamed immediately", "Poll creation notifications", "Multi-wallet support (Freighter, Albedo, Lobstr)"].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-near-black">
                      <svg className="w-4 h-4 text-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-1/2 h-[260px] rounded-[12px] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80&auto=format&fit=crop"
                  alt="Blockchain network visualization"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-gray bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between text-xs text-silver-blue">
          <span className="font-medium">StellarPay · Soroban dApp</span>
          <div className="flex gap-5">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline font-medium">Stellar Network</a>
            <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline font-medium">Freighter</a>
            <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline font-medium">Soroban</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
