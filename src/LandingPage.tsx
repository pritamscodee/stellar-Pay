import { SignInButton, SignUpButton } from "@clerk/clerk-react";

const features = [
  {
    icon: (
      <svg className="w-6 h-6 text-kraken-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
    title: "Wallet Connection",
    desc: "Connect your Freighter wallet securely to send and receive XLM on the Stellar testnet.",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-kraken-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Send XLM",
    desc: "Transfer XLM to any Stellar address with instant confirmation and full transaction history.",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-kraken-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Live Balances",
    desc: "Monitor your XLM balance in real-time with auto-refresh and detailed transaction explorer links.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-border-gray">
        <div className="max-w-[1024px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-[-0.5px] text-near-black">
            <div className="w-8 h-8 bg-kraken-purple rounded-lg flex items-center justify-center text-white text-base shrink-0">
              ✦
            </div>
            StellarPay
          </div>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <button className="inline-flex items-center justify-center px-4 py-[9px] rounded-[12px] font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-white text-kraken-purple-dark border border-kraken-purple-dark hover:bg-kraken-purple-subtle">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="inline-flex items-center justify-center px-4 py-[9px] rounded-[12px] font-ui text-sm font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep">
                Get Started
              </button>
            </SignUpButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-[1024px] mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-16">
            <div className="flex-1 max-w-[540px]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-medium bg-kraken-purple-subtle text-kraken-purple mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-kraken-purple" />
                Stellar Testnet
              </div>
              <h1 className="font-display text-[48px] md:text-[56px] font-bold tracking-[-1px] leading-[1.17] text-near-black mb-5">
                Send XLM on Stellar
                <span className="text-kraken-purple">.</span>
              </h1>
              <p className="text-silver-blue text-[18px] leading-relaxed max-w-[520px] mb-8">
                A simple, secure payment dApp powered by the Stellar network. Connect your Freighter wallet and start transacting on testnet in seconds.
              </p>
              <div className="flex items-center gap-3">
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center justify-center gap-2 px-6 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-kraken-purple text-white hover:bg-kraken-purple-deep">
                    Get Started
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center px-6 py-[13px] rounded-[12px] font-ui text-base font-medium cursor-pointer transition-all duration-150 bg-white text-near-black border border-border-gray hover:bg-gray-50 shadow-card">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </div>
            <div className="flex-1 h-[300px] md:h-[450px] rounded-2xl overflow-hidden">
              <img
                src="https://plus.unsplash.com/premium_photo-1681400678259-255b10890b08?fm=jpg&q=80&w=1200&auto=format&fit=crop"
                alt="Blockchain technology concept"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border-gray">
          <div className="max-w-[1024px] mx-auto px-6 py-16 md:py-20">
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="rounded-2xl overflow-hidden h-[240px] md:h-[320px]">
                <img
                  src="https://plus.unsplash.com/premium_photo-1764691405953-0430c2df0c59?fm=jpg&q=80&w=800&auto=format&fit=crop"
                  alt="Digital blockchain concept"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="rounded-2xl overflow-hidden h-[240px] md:h-[320px]">
                <img
                  src="https://plus.unsplash.com/premium_photo-1682310056521-cc7357fc72cf?fm=jpg&q=80&w=800&auto=format&fit=crop"
                  alt="Blockchain technology connecting cubes"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border-gray bg-[#f8f9fc]">
          <div className="max-w-[1024px] mx-auto px-6 py-20">
            <h2 className="font-display text-[36px] font-bold tracking-[-0.5px] leading-[1.22] text-near-black text-center mb-4">
              Everything you need
            </h2>
            <p className="text-silver-blue text-center mb-14 max-w-[480px] mx-auto">
              A clean, professional interface for Stellar testnet transactions.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {features.map((f) => (
                <div key={f.title} className="bg-white border border-border-gray rounded-[12px] p-6 shadow-card">
                  <div className="w-11 h-11 bg-kraken-purple/10 rounded-[10px] flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-ui text-[18px] font-semibold leading-snug text-near-black mb-2">{f.title}</h3>
                  <p className="text-silver-blue text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-gray">
        <div className="max-w-[1024px] mx-auto px-6 h-14 flex items-center justify-between text-xs text-silver-blue">
          <span>StellarPay · Testnet dApp</span>
          <div className="flex gap-4">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline">Stellar Network</a>
            <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-kraken-purple no-underline hover:underline">Freighter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
