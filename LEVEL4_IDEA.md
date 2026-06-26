# StellarVote — Level 4 Idea Submission

## 1. Problem Statement

Freelancers and remote workers face three core problems when getting paid cross-border:

- **High fees & slow settlement** — Traditional wire transfers take 3–5 days with 5–10% fees in currency conversion and intermediary bank charges.
- **No trustless escrow** — Freelancers either work upfront without payment guarantee, or clients pay upfront without delivery guarantee. Existing escrow services charge 5–15% and require a trusted third party.
- **Difficult fiat off-ramp** — Even when paid in crypto, converting to local fiat currency requires navigating multiple exchanges with separate KYC, high fees, and slow processing.

Current solutions (Upwork, Fiverr, PayPal) charge 10–20% per transaction and lock users into closed ecosystems with limited geographic reach.

## 2. Why Stellar?

Stellar is uniquely suited for this use case:

- **Near-instant settlement (~5 seconds)** — Unlike Ethereum or Solana where confirmation can take seconds-to-minutes, Stellar's consensus protocol settles transactions in 3–5 seconds at a fraction of a cent.
- **Built-in multi-asset support** — Native support for USDC, EURC, XLM, and any issued asset means freelancers can be paid in stablecoins without wrapping or bridging.
- **Anchor ecosystem for fiat ramps** — 475K+ on/off-ramp locations via Stellar anchors (SEP-24/SEP-6) let freelancers cash out to local currency directly from the app.
- **Soroban smart contracts** — Enables trustless escrow logic with milestone-based release, dispute resolution, and multi-sig arbitration — all on-chain.
- **Low fixed fees** — Stellar transaction fees (~0.00001 XLM per op) make micro-transactions and frequent milestone payments economically viable.
- **Existing wallet infrastructure** — 6+ wallets (Freighter, Albedo, Lobstr, xBull, Rabet, Hana) already support Stellar, so users don't need new software.

## 3. Target Users

| User Persona | Need | Volume |
|---|---|---|
| **Freelance developers/designers** | Get paid in USDC, cash out to local fiat | 5–50 payments/month |
| **Small agencies** | Manage client retainers, milestone payments, team payouts | 20–200 payments/month |
| **Remote workers** | Cross-border salary in stablecoins, fiat off-ramp | 1–2 payments/month |
| **Web3-native contractors** | On-chain reputation, wallet-to-wallet payments | 10–100 payments/month |
| **Stellar wallet users** | Send/receive payments without leaving their wallet | Occasional |

Initial focus: **Freelance developers and designers** already familiar with crypto wallets (most active on Stellar, Solana, and Ethereum ecosystems).

## 4. Technical Architecture

```
Frontend (React + Vite + Tailwind)
  ├── Clerk Auth (reuse)
  ├── StellarWalletsKit (reuse — Freighter, Albedo, Lobstr, xBull, Rabet, Hana)
  ├── Payment Dashboard
  │     ├── Create Invoice / Payment Request
  │     ├── Escrow Dashboard (active/milestone/completed)
  │     └── Transaction History
  ├── Milestone Tracker
  │     ├── Submit Milestone
  │     ├── Approve / Dispute
  │     └── Real-time status (SSE — reuse)
  ├── Fiat Ramp UI
  │     └── Deposit / Withdraw via SEP-24 anchor integration
  └── SSE Client (reuse — real-time payment/milestone events)
        └── Rust/Axum Backend (reuse)
              └── Broadcast payment events, milestone updates

Soroban Smart Contracts
  ├── Escrow Contract (NEW)
  │     ├── initialize(owner, freelancer, amount, milestone_count)
  │     ├── fund_escrow() — client deposits USDC/XLM
  │     ├── submit_milestone(freelancer, description_hash)
  │     ├── approve_milestone(client, milestone_index) → releases funds
  │     ├── dispute_milestone(client, milestone_index, arbiter)
  │     ├── resolve_dispute(arbiter, decision) — split funds
  │     ├── refund(client) — cancel escrow, return funds
  │     └── get_escrow_status() → read contract state
  ├── Poll Contract (REUSE — for dispute resolution voting)
  └── Reward Contract (REUSE — for platform fee distribution)

Anchor Integration (NEW)
  └── SEP-24 / SEP-6 API calls for fiat deposit/withdrawal
        └── e.g., MoneyGram, Anclap, or other Stellar anchors

Data Flow:
  Client creates escrow → Contract stores milestone config →
  Client funds escrow with USDC → Freelancer submits work →
  Client approves → Contract releases funds to freelancer →
  SSE broadcasts event → Both parties see real-time update →
  Freelancer withdraws to fiat via anchor off-ramp
```

### What We Reuse from Existing StellarVote

| Component | How It Maps |
|---|---|
| Multi-wallet (StellarWalletsKit) | Same — both parties connect their Stellar wallets |
| Poll Contract (vote/approve logic) | Refactored into milestone approval |
| Reward Contract | Refactored into platform fee distribution |
| Rust/Axum SSE backend | Real-time payment/milestone/dispute events |
| Clerk Auth | User authentication & session management |
| React/Tailwind UI patterns | Payment dashboard layout & components |
| Soroban SDK patterns | Contract interaction, simulation, tx confirmation |

## 5. Complexity Evaluation

| Challenge | Why It's Hard |
|---|---|
| **Multi-sig escrow logic in Soroban** | Escrow contract must handle fund custody, milestone verification, dispute resolution with third-party arbiter, partial refunds, and deadline-based auto-release — all while preventing re-entrancy and fund locking |
| **Cross-contract calls (escrow → token)** | Escrow contract must call the Stellar Asset Contract (SAC) to transfer USDC/XLM on approval, requiring proper `require_auth` chaining between contracts |
| **Dispute resolution mechanism** | On-chain arbitration with timelock periods, arbiter selection, and proportional fund splitting — needs careful state machine design to prevent deadlocks |
| **SEP-24 anchor integration** | Implementing the deposit/withdrawal interactive flow requires handling KYC redirects, transaction status polling, and multi-step SEP-10 authentication |
| **Milestone verification without centralization** | How do we verify work completion without becoming a centralized judge? Solution: client approves (trusted), with optional community voting (leveraging existing poll contract) as fallback |
| **Real-time cross-party state sync** | Both parties need to see escrow state changes instantly — SSE handles this but needs proper scoping/filtering per contract |
| **Transaction fee management** | Sponsoring transaction fees for non-XLM holders (or new users) using Soroban's sponsorship feature |

## 6. Roadmap

### MVP (Level 4)

- [ ] **Soroban Escrow Contract** — Core escrow with fund deposit, milestone submission, approval, refund
- [ ] **Escrow Dashboard UI** — Create escrow, fund with USDC, track milestones, approve/release
- [ ] **Wallet Integration** — Both parties connect wallets (reuse existing code)
- [ ] **Real-time SSE updates** — Payment/milestone events broadcast to both parties
- [ ] **Testnet deployment** — Full end-to-end testnet flow with test USDC

### User Acquisition (Levels 5–6)

- [ ] **Anchor fiat on/off ramp** — SEP-24 integration for depositing fiat → USDC and withdrawing USDC → fiat
- [ ] **Payment request links** — Generate shareable links for clients without wallets
- [ ] **Freelancer profile & reputation** — On-chain reputation based on completed escrows
- [ ] **Milestone-based dispute resolution** — Multi-sig arbitration with community voting
- [ ] **Referral & fee structure** — Platform fee (1–2%) vs. competitors (10–20%)
- [ ] **Mainnet deployment** — Deploy escrow contract to Stellar mainnet

### Mainnet Vision (Level 7)

- [ ] **Multi-currency support** — USDC, EURC, XLM, and custom issued assets
- [ ] **Recurring payment subscriptions** — Auto-release on schedule for retainers/salary
- [ ] **Multi-party escrow** — Team payouts with percentage splits
- [ ] **DAO-governed fee structure** — Platform fees governed by a Stellar-based DAO
- [ ] **Stellar Disbursement Platform integration** — For enterprise payroll use cases
- [ ] **Mobile SDK** — Embeddable payment widget for third-party platforms
- [ ] **Cross-chain bridge** — Accept payments from other chains into Stellar USDC
