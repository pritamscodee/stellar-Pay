import { useState } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeProvider";

const features = [
  {
    title: "Wallet Connection",
    desc: "Connect your Freighter wallet securely to interact with Soroban smart contracts on the Stellar testnet.",
  },
  {
    title: "On-Chain Voting",
    desc: "Cast votes that are recorded immutably on the Stellar ledger. Transparent, verifiable, and decentralized.",
  },
  {
    title: "Live Results",
    desc: "Poll results update in real-time via Server-Sent Events. No page refreshes, no polling — instant data.",
  },
];

const stacks = [
  {
    title: "Soroban Smart Contract",
    desc: "no_std WASM contract with built-in auth, storage, and event system. Deployed on Stellar testnet.",
    items: ["#![no_std] + wasm32v1-none", "env.storage().instance()", "voter.require_auth()", "env.events().publish()"],
  },
  {
    title: "Axum SSE Backend",
    desc: "Async HTTP server in Rust with broadcast channels for real-time event streaming to all connected clients.",
    items: ["#[tokio::main] runtime", "broadcast::channel pub/sub", "async_stream generators", "CorsLayer for dApp origin"],
  },
  {
    title: "React + TypeScript",
    desc: "Vite-powered SPA with Clerk auth, multi-wallet kit, and Tailwind CSS v4 for rapid UI development.",
    items: ["React 19 + TypeScript 6", "Vite 8 for instant HMR", "Tailwind v4 theming", "21 passing tests (CI)"],
  },
];

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="border-b border-hairline bg-canvas/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 font-display text-[22px] font-normal tracking-[-0.3px] text-ink no-underline">
            <span className="w-2 h-2 rounded-full bg-primary" />
            StellarVote
          </a>
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
            <div className="hidden md:flex items-center gap-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center px-5 py-[10px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-canvas text-ink border border-hairline hover:bg-surface-soft">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center justify-center px-5 py-[10px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-primary text-on-primary hover:bg-primary-active shadow-sm">
                    Get Started
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="inline-flex items-center justify-center px-5 py-[10px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-primary text-on-primary hover:bg-primary-active shadow-sm"
                >
                  Dashboard
                </button>
              </SignedIn>
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-md border border-hairline bg-canvas text-muted hover:text-ink cursor-pointer transition-all duration-150"
              aria-label="Toggle menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
          <div className="md:hidden border-t border-hairline bg-canvas px-6 py-4 flex flex-col gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="w-full inline-flex items-center justify-center px-5 py-[10px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-canvas text-ink border border-hairline hover:bg-surface-soft">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="w-full inline-flex items-center justify-center px-5 py-[10px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-primary text-on-primary hover:bg-primary-active shadow-sm">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full inline-flex items-center justify-center px-5 py-[10px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-primary text-on-primary hover:bg-primary-active shadow-sm"
              >
                Dashboard
              </button>
            </SignedIn>
          </div>
        )}
      </header>

      <main className="flex-1">
        <section className="bg-canvas">
          <div className="max-w-6xl mx-auto px-6 pt-24 pb-32 md:pt-32 md:pb-40">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-medium bg-primary-disabled text-body mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Stellar Testnet · Soroban Smart Contracts
                </div>
                <h1 className="font-display text-[44px] md:text-[56px] font-normal tracking-[-1.5px] leading-[1.08] text-ink mb-5">
                  Decentralized
                  <br />
                  <span className="text-primary">Voting</span> on Stellar
                </h1>
                <p className="text-[17px] md:text-[19px] text-body leading-relaxed max-w-[460px] mb-10">
                  Create polls, cast votes, and track results in real-time — powered by Soroban smart contracts and the Stellar network.
                </p>
                <div className="flex items-center gap-3">
                  <SignedOut>
                    <SignUpButton mode="modal">
                      <button className="inline-flex items-center justify-center gap-2 px-6 py-[13px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-primary text-on-primary hover:bg-primary-active shadow-sm">
                        Launch App
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </SignUpButton>
                    <SignInButton mode="modal">
                      <button className="inline-flex items-center justify-center px-6 py-[13px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-canvas text-ink border border-hairline hover:bg-surface-soft">
                        Sign In
                      </button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="inline-flex items-center justify-center gap-2 px-6 py-[13px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-primary text-on-primary hover:bg-primary-active shadow-sm"
                    >
                      Go to Dashboard
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </SignedIn>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="bg-surface-dark rounded-xl p-8 shadow-card">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-error" />
                      <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                      <span className="w-2.5 h-2.5 rounded-full bg-success" />
                    </div>
                    <span className="text-xs font-ui text-on-dark-soft ml-2">poll_contract.rs</span>
                  </div>
                  <pre className="font-mono text-xs text-on-dark leading-relaxed overflow-x-auto">
                    <span className="text-accent-teal">fn</span> <span className="text-primary">vote</span>({'\n'}
                    {'  '}voter: <span className="text-accent-teal">Address</span>,{'\n'}
                    {'  '}option: <span className="text-accent-teal">u32</span>,{'\n'}
                    ) {'{'}{'\n'}
                    {'  '}voter.<span className="text-accent-amber">require_auth</span>();{'\n'}
                    {'  '}<span className="text-muted-soft">// Record vote on-chain</span>{'\n'}
                    {'  '}env.<span className="text-accent-amber">storage</span>().{'\n'}
                    {'  '}{'  '}instance().<span className="text-accent-teal">set</span>(&voter, &true);{'\n'}
                    {'  '}env.<span className="text-accent-amber">events</span>().{'\n'}
                    {'  '}{'  '}<span className="text-accent-teal">publish</span>((POLL, VOTE), (voter, option));{'\n'}
                    {'}'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-canvas border-t border-hairline py-24 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-[32px] md:text-[40px] font-normal tracking-[-1px] leading-[1.15] text-ink mb-4">
                Built for the{" "}
                <span className="text-primary">Stellar ecosystem</span>
              </h2>
              <p className="text-[17px] text-body max-w-[520px] mx-auto">
                Leveraging Soroban smart contracts for transparent, on-chain governance with real-time event streaming.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="bg-surface-card rounded-lg p-8 shadow-card hover:shadow-elevated transition-shadow duration-300"
                >
                  <div className="w-10 h-10 bg-primary-disabled rounded-md flex items-center justify-center mb-5">
                    <span className="font-display text-primary font-normal text-lg">{i + 1}</span>
                  </div>
                  <h3 className="font-ui text-[18px] font-medium leading-snug text-ink mb-2">{f.title}</h3>
                  <p className="text-body text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface-dark border-t border-hairline py-24 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-medium bg-surface-dark-elevated text-on-dark mb-4">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                Rust Stack
              </div>
              <h2 className="font-display text-[32px] md:text-[40px] font-normal tracking-[-1px] leading-[1.15] text-on-dark mb-4">
                Powered by <span className="text-primary">Rust</span>
              </h2>
              <p className="text-[17px] text-on-dark-soft max-w-[520px] mx-auto">
                Smart contracts and backend infrastructure, written in Rust for safety, performance, and zero-cost abstractions.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {stacks.map((stack) => (
                <div key={stack.title} className="bg-surface-dark-elevated rounded-lg p-8 shadow-card">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-sm flex items-center justify-center text-primary text-xs font-mono shrink-0">{'</>'}</div>
                    <h3 className="font-ui text-[17px] font-medium text-on-dark">{stack.title}</h3>
                  </div>
                  <p className="text-on-dark-soft text-sm leading-relaxed mb-5">{stack.desc}</p>
                  <ul className="space-y-1.5">
                    {stack.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-on-dark-soft font-mono">
                        <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-canvas border-t border-hairline py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-surface-card rounded-lg p-8 md:p-12 shadow-card flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="w-full md:w-1/2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-medium bg-primary-disabled text-body mb-4">
                  Real-time Events
                </div>
                <h3 className="font-display text-[26px] font-normal tracking-[-0.5px] leading-[1.25] text-ink mb-3">
                  Live updates via SSE
                </h3>
                <p className="text-body text-sm leading-relaxed mb-6">
                  Every vote and poll creation is broadcast instantly through Server-Sent Events. No polling, no delays — just real-time data flowing from the backend to your dashboard.
                </p>
                <div className="flex flex-col gap-3">
                  {["Vote events streamed immediately", "Poll creation notifications", "Multi-wallet support (Freighter, Albedo, Lobstr)"].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-ink">
                      <svg className="w-4 h-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <div className="bg-surface-dark rounded-lg p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs font-mono text-on-dark-soft">sse://events.stream</span>
                    <span className="ml-auto text-[10px] font-ui text-on-dark-soft uppercase tracking-[1px]">Connected</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { type: "vote", label: "Vote cast", detail: "Option A (Stellar)" },
                      { type: "poll", label: "Poll created", detail: "Best blockchain?" },
                      { type: "vote", label: "Vote cast", detail: "Option B (Solana)" },
                    ].map((ev, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${ev.type === "vote" ? "bg-primary" : "bg-accent-teal"}`} />
                        <span className="text-on-dark font-medium">{ev.label}</span>
                        <span className="text-on-dark-soft">{ev.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h2 className="font-display text-[28px] md:text-[36px] font-normal tracking-[-0.5px] leading-[1.2] text-on-primary mb-4">
              Ready to start voting?
            </h2>
            <p className="text-on-primary/80 text-[16px] max-w-[480px] mx-auto mb-8">
              Connect your Stellar wallet and create your first on-chain poll in seconds.
            </p>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="inline-flex items-center justify-center gap-2 px-7 py-[13px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-on-primary text-primary hover:bg-on-primary/90 shadow-sm">
                  Launch App
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center justify-center gap-2 px-7 py-[13px] rounded-md font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-on-primary text-primary hover:bg-on-primary/90 shadow-sm"
              >
                Go to Dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </SignedIn>
          </div>
        </section>
      </main>

      <footer className="bg-surface-dark">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-display text-lg font-normal tracking-[-0.3px] text-on-dark">StellarVote</span>
              </div>
              <p className="text-on-dark-soft text-sm max-w-[280px]">
                Decentralized voting powered by Soroban smart contracts on the Stellar network.
              </p>
            </div>
            <div className="flex gap-10">
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-ui font-medium uppercase tracking-[1.5px] text-on-dark-soft">Resources</span>
                <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline">Stellar Network</a>
                <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline">Soroban</a>
                <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline">Freighter</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-ui font-medium uppercase tracking-[1.5px] text-on-dark-soft">Product</span>
                <a href="https://github.com/pritamscodee/stellar-Vote" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline">GitHub</a>
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline">Vercel</a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-on-dark-soft">© 2026 StellarVote. Built on Stellar.</span>
            <span className="text-xs text-on-dark-soft font-mono">testnet · soroban-sdk v27</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
