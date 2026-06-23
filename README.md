<div align="center">

# ⚡ StellarPay

<img width="1905" height="872" alt="asli landign" src="https://github.com/user-attachments/assets/cf0901f4-d87e-4821-9709-1fa856f3c37d" />



Demo video  - - > 

https://github.com/user-attachments/assets/d522ae39-22ff-4349-8101-aef049919440






### Multi-Wallet Stellar dApp × Soroban Smart Contract × Real-Time SSE Events

---

[![CI](https://github.com/pritamscodee/stellar-Pay/actions/workflows/ci.yml/badge.svg)](https://github.com/pritamscodee/stellar-Pay/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=fff)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=fff)](https://tailwindcss.com)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=fff)](https://www.rust-lang.org)
[![Stellar](https://img.shields.io/badge/Stellar-7B00FF?style=for-the-badge&logo=stellar&logoColor=fff)](https://stellar.org)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=fff)](https://clerk.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=fff)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=fff)](https://render.com)
[![Tests](https://img.shields.io/badge/Tests-14_Frontend_%7C_7_Contract-0?style=for-the-badge&logo=vitest&logoColor=fff)]()

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-7B00FF?style=for-the-badge&logo=vercel&logoColor=fff)](https://frontend-one-rose-14.vercel.app)
[![Contract on Stellar Expert](https://img.shields.io/badge/Stellar_Expert-000000?style=for-the-badge&logo=stellar&logoColor=fff)](https://stellar.expert/explorer/testnet/contract/CDROSAGWRIQG5TSRF2FFFFXZD3RGPWDS6I3IWUTC67MELRRLZHNOE6ID)

---

</div>

## 🌐 Overview

**StellarPay** is a full-stack Web3 dApp on the **Stellar network** featuring:

- **Soroban Smart Contract** — Decentralized poll creation & voting on Stellar testnet
- **Multi-Wallet Support** — Connect via Freighter, Albedo, Lobstr, xBull, Rabet, or Hana
- **Real-Time SSE Events** — Live activity feed powered by a Rust/Axum event server
- **Clerk Authentication** — Secure sign-up/sign-in with email, Google, GitHub, and more
- **Dark Mode UI** — Sleek, responsive interface built with Tailwind CSS v4

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔐 Authentication
- Clerk-powered sign-up/sign-in
- Email, Google, GitHub providers
- Protected dashboard routes

### 👛 Multi-Wallet
- Freighter, Albedo, Lobstr, xBull, Rabet, Hana
- StellarWalletsKit integration
- One-click connect & switch

### 📊 Live Polling
- Create polls with custom options
- Set deadline (hours/days)
- Real-time vote updates via SSE

</td>
<td width="50%">

### ⚡ Real-Time Events
- Server-Sent Events (SSE) stream
- Live vote notifications
- Instant poll creation alerts

### 🔗 On-Chain Verified
- All transactions on Stellar testnet
- Stellar Expert explorer links
- Full tx hash audit trail

### 🎨 Modern UI
- Dark/light theme toggle
- Responsive mobile-first design
- Tailwind CSS v4 + glassmorphism

</td>
</tr>
</table>

---

## 🖼️ Screenshots

<div align="center">
  <img src="frontend/screenshots/inteli5.jpg" alt="Intel i5" width="45%" />
  <img src="frontend/screenshots/asli-landing.jpg" alt="Asli Landing" width="45%" />
</div>

<div align="center">
  <img src="frontend/screenshots/landing-page.jpg" alt="Landing Page" width="45%" />
  <img src="frontend/screenshots/wallet-connected.jpg" alt="Wallet Connected" width="45%" />
</div>

<div align="center">
  <img src="frontend/screenshots/dapp-success2.jpg" alt="Dashboard" width="45%" />
  <img src="frontend/screenshots/balance-displayed.jpg" alt="Balance Displayed" width="45%" />
</div>

<div align="center">
  <img src="frontend/screenshots/leev2.jpg" alt="Level 2" width="45%" />
  <img src="frontend/screenshots/pay2level2.jpg" alt="Level 2 Payments" width="45%" />
</div>

<div align="center">
  <img src="frontend/screenshots/transaction-success.jpg" alt="Transaction Success" width="45%" />
  <img src="frontend/screenshots/transaction-result.jpg" alt="Transaction Result" width="45%" />
</div>

<div align="center">
  <img src="frontend/screenshots/ci-pipeline.jpg" alt="CI/CD Pipeline" width="90%" />
</div>

<div align="center">
  <img src="frontend/screenshots/mobile-responsive.jpeg" alt="Mobile Responsive UI" width="30%" />
  <img src="frontend/screenshots/mobile-responsive-2.jpeg" alt="Mobile Responsive UI 2" width="30%" />
</div>

---

## 📱 Mobile Responsive Design

The dashboard and landing page are fully responsive across all device sizes:

<div align="center">
  <img src="frontend/screenshots/mobile-responsive.jpeg" alt="Mobile Dashboard" width="30%" />
  <img src="frontend/screenshots/mobile-responsive-2.jpeg" alt="Mobile Landing" width="30%" />
</div>

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Rust | latest stable |
| Stellar Wallet | Freighter / Albedo / Lobstr |
| Clerk Account | [clerk.com](https://clerk.com) |

### Frontend

```bash
# Install dependencies
cd frontend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Clerk key & backend URL

# Start dev server
npm run dev
```

### Smart Contract (Poll)

```bash
cd contracts/poll
cargo build --target wasm32v1-none --release
```

### Smart Contract (Reward — Inter-Contract)

```bash
cd contracts/reward
cargo build --target wasm32v1-none --release
```

### Backend (SSE Server)

```bash
cd backend
cargo run
# Runs on http://localhost:3001
```

---

## 🧱 Architecture

```
stellar-pay/
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Auth router + ErrorBoundary
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── LandingPage.tsx     # Marketing page
│   │   ├── ErrorBoundary.tsx   # React error boundary
│   │   ├── LoadingSkeleton.tsx # Loading skeletons
│   │   ├── types.ts            # Shared types
│   │   ├── index.css           # Tailwind + theme
│   │   ├── test/               # Frontend tests
│   │   └── services/
│   │       ├── wallets.ts      # Multi-wallet kit
│   │       ├── contract.ts     # Soroban interactions
│   │       └── backend.ts      # SSE client
│   ├── screenshots/            # App screenshots
│   └── vercel.json             # Vercel SPA config
├── contracts/
│   ├── poll/                   # Soroban poll contract
│   │   └── src/lib.rs          # + 4 unit tests
│   └── reward/                 # Inter-contract reward contract
│       └── src/lib.rs
├── backend/                    # Rust Axum SSE server
│   └── src/main.rs
├── scripts/
│   ├── deploy.sh               # Unix contract deploy
│   └── deploy.ps1              # Windows contract deploy
├── .github/workflows/
│   └── ci.yml                  # CI/CD pipeline
└── README.md
```

---

---

## 🤖 CI/CD Pipeline

The project uses **GitHub Actions** for continuous integration. On every push to `main` and every pull request, the pipeline runs:

| Job | What it does |
|-----|-------------|
| **Frontend** | `npm ci`, `npm run lint`, `npm run build`, `npm test` (14 tests) |
| **Contract** | `cargo build` (poll + reward), `cargo test` (4 tests) |
| **Backend** | `cargo build` (Rust Axum server) |

### Pipeline Status

[![CI](https://github.com/pritamscodee/stellar-Pay/actions/workflows/ci.yml/badge.svg)](https://github.com/pritamscodee/stellar-Pay/actions/workflows/ci.yml)

<div align="center">
  <img src="frontend/screenshots/ci-pipeline.jpg" alt="CI/CD Pipeline" width="90%" />
</div>

### Run Tests Locally

```bash
# Frontend tests (Vitest)
cd frontend && npm test

# Contract tests (Rust)
cd contracts/poll && cargo test
```

| Test Suite | Tests | Status |
|-----------|-------|--------|
| Frontend types | 4 | ✅ |
| Frontend backend service | 3 | ✅ |
| Frontend helpers | 7 | ✅ |
| Poll contract | 4 | ✅ |
| Reward contract | 3 | ✅ |
| **Total** | **21** | ✅ |

---

## 🔗 Inter-Contract Communication

The `contracts/reward` contract demonstrates cross-contract calls by importing the compiled poll contract WASM via `contractimport`.

### Reward Contract Features

- **Reward logic** that calls the poll contract to verify votes
- **Cross-contract import** using Soroban's `contractimport("../poll/target/.../stellar_poll.wasm")`
- Demonstrates composability of Soroban smart contracts

```rust
// contracts/reward/src/lib.rs
contractimport!("../poll/target/wasm32v1-none/release/stellar_poll.wasm");
```

---

## 🚢 Deployment Scripts

Automated deployment scripts for the Soroban poll contract to Stellar testnet:

| Script | Platform |
|--------|----------|
| `scripts/deploy.sh` | Unix (Linux/macOS) |
| `scripts/deploy.ps1` | Windows PowerShell |

Both scripts:
1. Build the WASM contract
2. Install the contract via `soroban contract install`
3. Deploy via `soroban contract deploy`
4. Output the deployed contract ID

---

## 🧩 Error Boundary & Loading Skeletons

| Component | Purpose |
|-----------|---------|
| `ErrorBoundary.tsx` | Catches React rendering errors and shows a friendly fallback UI with a reload button |
| `LoadingSkeleton.tsx` | `CardSkeleton` and `ListSkeleton` — animated pulse placeholders for async data |

Both components are imported in `Dashboard.tsx` to improve production UX during data fetching.

---

## 🔗 Deployed Contracts

| Contract | ID | Explorer |
|----------|----|----------|
| **Poll Contract** | `CDROSAGWRIQG5TSRF2FFFFXZD3RGPWDS6I3IWUTC67MELRRLZHNOE6ID` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDROSAGWRIQG5TSRF2FFFFXZD3RGPWDS6I3IWUTC67MELRRLZHNOE6ID) |

---

## 📡 API — Rust Backend

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/events` | GET | SSE stream for live events |
| `/api/publish` | GET | Publish vote/poll events |

### Deploy to Render

```bash
# 1. Push to GitHub
# 2. Render Dashboard → New Web Service
# 3. Set:
#    Root Directory: backend
#    Build: cargo build --release
#    Start: ./target/release/stellerpay-backend
#    Env: PORT = 10000
# 4. Set VITE_BACKEND_URL in frontend env vars
```

---

## 📜 On-Chain Transactions

All interactions are verifiable on Stellar Expert:

| # | Type | Tx Hash | Explorer | Date |
|---|------|---------|----------|------|
| 1 | **Contract Deploy** | `d36f72ac…` | [View ↗](https://stellar.expert/explorer/testnet/tx/d36f72acf0b6a347c2ad68fc5d95f0b3196b95faf4ff2ff84f47ebaeee6ba2a8) | 2026-06-23 |
| 2 | **Init Poll** | `1cc35079…` | [View ↗](https://stellar.expert/explorer/testnet/tx/1cc3507973ab0f7a5b2aa1e8f0bc772f1efa9a3697eb600d170f927129fd7a70) | 2026-06-23 |
| 3 | **Cast Vote** | `60b5477f…` | [View ↗](https://stellar.expert/explorer/testnet/tx/60b5477f6a1e167b79bdd90bdcaa5512607a150e33387fd07f2be1c0579f174b) | 2026-06-23 |

---
![Uploading image.png…]()

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| **Authentication** | Clerk |
| **Blockchain** | Stellar, Soroban SDK, @stellar/stellar-sdk v16 |
| **Wallet** | StellarWalletsKit (Freighter, Albedo, Lobstr, xBull, Rabet, Hana) |
| **Backend** | Rust, Axum, tokio, SSE |
| **Contract** | Soroban SDK (Rust), WASM |
| **Hosting** | Vercel (frontend), Render (backend) |

</div>

---

## ⚠️ Error Handling

| Error Type | Description |
|------------|-------------|
| 🚫 **Wallet Not Found** | No wallet extension detected or not connected |
| ❌ **Connection Rejected** | User declined the wallet connection request |
| 💸 **Insufficient Balance** | Not enough XLM for transaction fees/fundraises |

---

## 📬 Deliverables

- **Live Demo**: [https://frontend-one-rose-14.vercel.app](https://frontend-one-rose-14.vercel.app)
- **Contract ID**: `CDROSAGWRIQG5TSRF2FFFFXZD3RGPWDS6I3IWUTC67MELRRLZHNOE6ID`
- **Init Tx Hash**: `1cc3507973ab0f7a5b2aa1e8f0bc772f1efa9a3697eb600d170f927129fd7a70`
- **Deployer Account**: `GCZVEJZJNMPHXP3GKCHI33YUSN7BJTU3OWNDLSDEUQOO4UGRIQWHBEHK`
- **Test Results**: [CI Pipeline](https://github.com/pritamscodee/stellar-Pay/actions) — 21 total tests (14 frontend + 4 poll contract + 3 reward contract)
- **GitHub Repo**: [pritamscodee/stellar-Pay](https://github.com/pritamscodee/stellar-Pay)
- **Screenshots**: `frontend/screenshots/` folder
- **Demo Video**: (coming soon)

---

<div align="center">

**Built with ❤️ on Stellar** · [Report Issue](https://github.com/pritamscodee/stellar-Pay/issues)

[![Stellar](https://img.shields.io/badge/Powered_by_Stellar-7B00FF?style=flat-square&logo=stellar&logoColor=fff)](https://stellar.org)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

</div>
