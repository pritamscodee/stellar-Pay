import { useState } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Wallet Connection",
    desc: "Connect your Freighter wallet securely to interact with Soroban smart contracts on the Stellar testnet.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
  {
    title: "On-Chain Voting",
    desc: "Cast votes recorded immutably on the Stellar ledger. Transparent, verifiable, and decentralized by design.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "Live Results",
    desc: "Poll results update in real-time via Server-Sent Events. No page refreshes, no polling — instant data streaming.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

type CodeLine = { text: string; indent?: boolean; dim?: boolean; highlight?: string; empty?: boolean };

const stacks: { title: string; desc: string; lines: CodeLine[] }[] = [
  {
    title: "Soroban Smart Contract",
    desc: "no_std WASM contract with built-in auth, storage, and event system on Stellar testnet.",
    lines: [
      { text: "fn create_poll(", highlight: "text-accent-teal" },
      { text: "    question: String,", indent: true },
      { text: "    options: Vec<String>,", indent: true },
      { text: ") -> u32 {", indent: true },
      { text: "    let id = env.storage().instance().get(&COUNTER).unwrap_or(0) + 1;", indent: true, dim: true },
      { text: "    id" },
      { text: "}" },
    ],
  },
  {
    title: "Axum SSE Backend",
    desc: "Async Rust with broadcast channels for real-time event streaming to all connected clients.",
    lines: [
      { text: "#[tokio::main]", highlight: "text-accent-teal" },
      { text: "async fn main() {" },
      { text: "    let (tx, _) = broadcast::channel::<Event>(1024);", indent: true, dim: true },
      { text: "    let app = Router::new()", indent: true },
      { text: "        .route(\"/events\", get(sse_handler))", indent: true, dim: true },
      { text: "        .layer(CorsLayer::permissive());" },
      { text: "}" },
    ],
  },
  {
    title: "React + TypeScript",
    desc: "Vite SPA with Clerk auth, multi-wallet kit, and shadcn/ui components on Tailwind v4.",
    lines: [
      { text: "function Dashboard() {" },
      { text: "    const { user } = useUser()", indent: true, dim: true },
      { text: "    const kit = useStellarWallets()", indent: true },
      { text: "", empty: true },
      { text: "    return <Card>", indent: true },
      { text: "        <PollResults />", indent: true, dim: true },
      { text: "        <VoteButton />", indent: true },
      { text: "    </Card>" },
      { text: "}" },
    ],
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
          <a href="/" className="flex items-center gap-3 no-underline group">
            <span className="w-2.5 h-2.5 rounded-full bg-primary group-hover:scale-110 transition-transform" />
            <span className="font-display text-[22px] font-normal tracking-[-0.3px] text-ink">
              StellarVote
            </span>
          </a>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface-card/85 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse" />
              <span className="font-ui text-[11px] font-medium uppercase tracking-[1px] text-body">
                Stellar Testnet
              </span>
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
            <div className="hidden md:flex items-center gap-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">
                    Get Started
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button size="sm" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
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
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="w-full">
                  Get Started
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button className="w-full" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            </SignedIn>
          </div>
        )}
      </header>

      <main className="flex-1">
        <section className="bg-canvas relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-20 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-teal/3 rounded-full blur-3xl" />
          </div>
          <div className="max-w-6xl mx-auto px-6 pt-24 pb-32 md:pt-32 md:pb-40 relative">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <Badge variant="outline" className="mb-6 text-[11px] tracking-[1.5px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal mr-2 animate-pulse" />
                  Stellar Soroban · Smart Contract Voting
                </Badge>
                <h1 className="font-display text-[44px] md:text-[60px] font-normal tracking-[-1.5px] leading-[1.06] text-ink mb-6">
                  Decentralized
                  <br />
                  <span className="text-primary">Voting</span> on Stellar
                </h1>
                <p className="text-[17px] md:text-[19px] text-body leading-relaxed max-w-[480px] mb-10 font-ui">
                  Create polls, cast votes, and track results in real-time — powered by Soroban smart contracts and the Stellar network.
                </p>
                <div className="flex items-center gap-3">
                  <SignedOut>
                    <SignUpButton mode="modal">
                      <Button className="gap-2 px-7 py-[13px]">
                        Launch App
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Button>
                    </SignUpButton>
                    <SignInButton mode="modal">
                      <Button variant="outline" className="px-7 py-[13px]">
                        Sign In
                      </Button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <Button
                      onClick={() => navigate("/dashboard")}
                      className="gap-2 px-7 py-[13px]"
                    >
                      Go to Dashboard
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Button>
                  </SignedIn>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="bg-surface-dark rounded-xl shadow-card overflow-hidden border border-surface-dark-elevated">
                  <div className="flex items-center gap-3 px-5 py-3 bg-surface-dark-elevated/50 border-b border-surface-dark-soft">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-error" />
                      <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                      <span className="w-2.5 h-2.5 rounded-full bg-success" />
                    </div>
                    <span className="font-ui text-[11px] text-on-dark-soft font-medium tracking-wide">
                      poll_contract.rs — Stellar
                    </span>
                    <span className="ml-auto font-ui text-[10px] text-on-dark-soft/50 uppercase tracking-[1px]">
                      Soroban SDK 27
                    </span>
                  </div>
                  <div className="p-6">
                    <pre className="font-mono text-[13px] text-on-dark leading-[1.7] overflow-x-auto">
                      <span className="text-accent-teal">use</span> soroban_sdk::<span className="text-accent-amber">env</span>;<span className="text-muted-soft">;</span>{'\n'}
                      {'\n'}
                      <span className="text-accent-teal">fn</span> <span className="text-primary">vote</span>({'\n'}
                      {'  '}  <span className="text-muted-soft">// Authenticate voter</span>{'\n'}
                      {'  '}  voter: <span className="text-accent-teal">Address</span>,{'\n'}
                      {'  '}  option: <span className="text-accent-teal">u32</span>,{'\n'}
                      ) {'->'} <span className="text-accent-teal">Result</span>&lt;(), <span className="text-accent-amber">Error</span>&gt; {'{'}{'\n'}
                      {'  '}  voter.<span className="text-primary">require_auth</span>()?;{'\n'}
                      {'  '}  env.<span className="text-accent-amber">storage</span>().instance(){'\n'}
                      {'  '}    .<span className="text-accent-teal">set</span>(&voter, &option);{'\n'}
                      {'  '}  env.<span className="text-accent-amber">events</span>().<span className="text-accent-teal">publish</span>({'\n'}
                      {'  '}    (POLL, VOTE), (voter, option){'\n'}
                      {'  '}  );{'\n'}
                      {'  '}  <span className="text-accent-teal">Ok</span>(()){'\n'}
                      {'}'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-soft py-24 md:py-32 border-t border-hairline">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-5 text-[11px] tracking-[1.5px]">
                Why StellarVote
              </Badge>
              <h2 className="font-display text-[34px] md:text-[42px] font-normal tracking-[-1px] leading-[1.12] text-ink mb-4">
                Built for the{" "}
                <span className="text-primary">Stellar ecosystem</span>
              </h2>
              <p className="text-[17px] text-body max-w-[560px] mx-auto font-ui">
                Leveraging Soroban smart contracts for transparent, on-chain governance with real-time event streaming.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((f) => (
                <Card key={f.title} className="bg-surface-card border-0 shadow-card hover:shadow-elevated transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="w-10 h-10 bg-primary-disabled rounded-md flex items-center justify-center mb-5 text-primary">
                      {f.icon}
                    </div>
                    <h3 className="font-ui text-[18px] font-medium leading-snug text-ink mb-3">{f.title}</h3>
                    <p className="text-body text-sm leading-relaxed font-ui">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface-dark py-24 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-surface-dark-elevated text-on-dark-soft mb-5 text-[11px] tracking-[1.5px] bg-surface-dark-elevated">
                <svg className="w-3.5 h-3.5 mr-1.5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                Rust Stack
              </Badge>
              <h2 className="font-display text-[34px] md:text-[42px] font-normal tracking-[-1px] leading-[1.12] text-on-dark mb-4">
                Powered by <span className="text-primary">Rust</span>
              </h2>
              <p className="text-[17px] text-on-dark-soft max-w-[560px] mx-auto font-ui">
                Smart contracts and backend infrastructure, written in Rust for safety, performance, and zero-cost abstractions.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {stacks.map((stack) => (
                <div key={stack.title} className="bg-surface-dark-elevated rounded-lg overflow-hidden border border-surface-dark-soft shadow-card">
                  <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-dark-soft/50 border-b border-surface-dark-soft">
                    <span className="w-2 h-2 rounded-full bg-error/60" />
                    <span className="w-2 h-2 rounded-full bg-warning/60" />
                    <span className="w-2 h-2 rounded-full bg-success/60" />
                    <span className="font-mono text-[10px] text-on-dark-soft/40 ml-2">{stack.title.toLowerCase().replace(/\s+/g, "-")}.rs</span>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="font-ui text-[17px] font-medium text-on-dark mb-2">{stack.title}</h3>
                      <p className="text-on-dark-soft text-sm leading-relaxed font-ui">{stack.desc}</p>
                    </div>
                    <pre className="font-mono text-[12px] text-on-dark leading-[1.8]">
                      {stack.lines.map((line, i) => {
                        let cls = line.empty ? "h-3" : line.dim ? "text-on-dark-soft/40" : "";
                        if (line.indent) cls += " ml-4";
                        if (line.highlight && !line.dim) cls += ` ${line.highlight}`;
                        return (
                          <div key={i} className={cls}>
                            {line.text}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-canvas py-20 md:py-28 border-t border-hairline">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <Badge variant="outline" className="mb-5 text-[11px] tracking-[1.5px]">
                  Real-time Events
                </Badge>
                <h2 className="font-display text-[30px] md:text-[36px] font-normal tracking-[-0.8px] leading-[1.15] text-ink mb-4">
                  Live updates via{" "}
                  <span className="text-primary">SSE</span>
                </h2>
                <p className="text-body text-sm leading-relaxed mb-8 font-ui">
                  Every vote and poll creation is broadcast instantly through Server-Sent Events. No polling, no delays — just real-time data flowing from the Rust backend to your dashboard.
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Vote events streamed instantly", desc: "Sub-second latency from contract to UI" },
                    { label: "Multi-wallet support", desc: "Freighter, Albedo, Lobstr — all supported" },
                    { label: "Open source & auditable", desc: "Full source on GitHub, MIT licensed" },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-sm font-medium text-ink">{item.label}</div>
                        <div className="text-xs text-muted mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="bg-surface-dark rounded-xl overflow-hidden border border-surface-dark-elevated shadow-card">
                  <div className="flex items-center justify-between px-5 py-3 bg-surface-dark-elevated/50 border-b border-surface-dark-soft">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="font-mono text-[12px] text-on-dark-soft">sse://events.stream</span>
                    </div>
                    <span className="font-ui text-[10px] text-accent-teal uppercase tracking-[1px] font-medium">Connected</span>
                  </div>
                  <div className="p-5 space-y-3">
                    {[
                      { type: "vote" as const, label: "Vote cast", detail: "Option A (Stellar) — tx: abc...def", time: "just now" },
                      { type: "poll" as const, label: "Poll created", detail: "\"Best blockchain?\" — by GCZVE...EHK", time: "1m ago" },
                      { type: "vote" as const, label: "Vote cast", detail: "Option B (Solana) — tx: 123...789", time: "3m ago" },
                      { type: "poll" as const, label: "Poll created", detail: "\"Future of DeFi?\" — by GBHJK...XYZ", time: "7m ago" },
                    ].map((ev, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-dark-soft/50">
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ev.type === "vote" ? "bg-primary" : "bg-accent-teal"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-on-dark">{ev.label}</span>
                            <span className="font-ui text-[10px] text-on-dark-soft/50 ml-auto shrink-0">{ev.time}</span>
                          </div>
                          <div className="font-mono text-[12px] text-on-dark-soft truncate mt-0.5">{ev.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-primary rounded-xl p-10 md:p-16 text-center shadow-card">
              <h2 className="font-display text-[30px] md:text-[38px] font-normal tracking-[-0.8px] leading-[1.15] text-on-primary mb-4">
                Ready to start voting?
              </h2>
              <p className="text-on-primary/80 text-[16px] max-w-[480px] mx-auto mb-8 font-ui">
                Connect your Stellar wallet and create your first on-chain poll in seconds.
              </p>
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button
                    className="bg-on-primary text-primary hover:bg-on-primary/90 shadow-sm gap-2 px-8 py-[14px] h-auto text-[15px]"
                  >
                    Launch App
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-on-primary text-primary hover:bg-on-primary/90 shadow-sm gap-2 px-8 py-[14px] h-auto text-[15px]"
                >
                  Go to Dashboard
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Button>
              </SignedIn>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-dark border-t border-surface-dark-elevated">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-display text-lg font-normal tracking-[-0.3px] text-on-dark">StellarVote</span>
              </div>
              <p className="text-on-dark-soft text-sm leading-relaxed font-ui">
                Decentralized voting powered by Soroban smart contracts on the Stellar network.
              </p>
            </div>
            <div>
              <span className="font-ui text-[11px] font-medium uppercase tracking-[1.5px] text-on-dark-soft/60 block mb-4">Resources</span>
              <div className="flex flex-col gap-2.5">
                <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline font-ui">Stellar Network</a>
                <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline font-ui">Soroban Docs</a>
                <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline font-ui">Freighter Wallet</a>
                <a href="https://developers.stellar.org" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline font-ui">Stellar Dev Hub</a>
              </div>
            </div>
            <div>
              <span className="font-ui text-[11px] font-medium uppercase tracking-[1.5px] text-on-dark-soft/60 block mb-4">Product</span>
              <div className="flex flex-col gap-2.5">
                <a href="https://github.com/pritamscodee/stellar-Vote" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline font-ui">GitHub Repo</a>
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-sm text-on-dark hover:text-primary transition-colors no-underline font-ui">Deployed on Vercel</a>
                <span className="text-sm text-on-dark-soft font-ui">MIT License</span>
              </div>
            </div>
            <div>
              <span className="font-ui text-[11px] font-medium uppercase tracking-[1.5px] text-on-dark-soft/60 block mb-4">Network</span>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-sm text-on-dark font-ui">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-teal shrink-0" />
                  Testnet
                </div>
                <span className="text-sm text-on-dark-soft font-mono text-[12px]">soroban-sdk v27</span>
                <span className="text-sm text-on-dark-soft font-mono text-[12px]">wasm32v1-none</span>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-surface-dark-soft flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-on-dark-soft/60 font-ui">© 2026 StellarVote. Built on Stellar.</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-on-dark-soft/60 font-mono">testnet</span>
              <span className="w-1 h-1 rounded-full bg-on-dark-soft/20" />
              <span className="text-xs text-on-dark-soft/60 font-mono">contract: CDRO...6ID</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
