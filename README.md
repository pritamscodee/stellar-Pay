# StellarPay - Stellar Payment dApp

A Stellar testnet payment dApp built with React, TypeScript, and Vite. Features Clerk authentication, Freighter wallet integration, and a Kraken-inspired design system.

## Features

- **Authentication**: Sign up/in with Clerk (email, Google, GitHub, etc.)
- **Wallet Connection**: Connect/disconnect Freighter wallet on Stellar Testnet
- **Balance Display**: Fetch and display XLM balance with auto-refresh every 15s
- **Send XLM**: Transfer XLM to any Stellar address with amount input
- **Transaction Feedback**: Success/failure state with transaction hash and explorer link
- **Kraken-inspired UI**: Clean, professional design with purple brand identity

## Prerequisites

- [Freighter wallet](https://freighter.app) browser extension
- A Clerk account (sign up at [clerk.com](https://clerk.com))
- [Fund your testnet account](https://stellar.org/learn/fund-your-testnet-account) using the Friendbot

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. Open the app — you'll see the landing page
2. Click **Get Started** or **Sign In** to authenticate via Clerk
3. After signing in, you'll reach the dashboard
4. Install the Freighter browser extension and create a wallet (if not already done)
5. Switch Freighter to **Testnet** (Settings → Network → Testnet)
6. Fund your account using the [Stellar Testnet Friendbot](https://stellar.org/learn/fund-your-testnet-account)
7. Click **Connect Freighter** and approve in the extension
8. Enter a destination address (starting with `G`) and amount in XLM
9. Click **Send XLM** and confirm the transaction in Freighter
10. View the transaction result with a link to Stellar Expert explorer

## Screenshots

Add screenshots to a `screenshots/` folder in the repo root.

| Screen | Description |
|--------|-------------|
| `1-landing.png` | Landing page with sign-in/sign-up |
| `2-dashboard.png` | Dashboard after authentication |
| `3-wallet-connected.png` | Wallet connected state with address and network badge |
| `4-balance-displayed.png` | Balance displayed with XLM amount |
| `5-transaction-success.png` | Successful transaction with hash and explorer link |
| `6-transaction-error.png` | Transaction failure feedback |

## Tech Stack

- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Clerk](https://clerk.com) — Authentication
- [@stellar/stellar-sdk](https://github.com/stellar/js-stellar-sdk)
- [@stellar/freighter-api](https://github.com/stellar/freighter)
- [Stellar Testnet](https://stellar.org)

## Project Structure

```
src/
├── main.tsx          # Entry point with ClerkProvider
├── App.tsx           # Auth router (SignedOut → Landing, SignedIn → Dashboard)
├── LandingPage.tsx   # Landing page with sign-in/sign-up
├── Dashboard.tsx     # Payment dApp with wallet + send XLM
├── stellar.ts        # Stellar SDK logic (connect, balance, send)
└── index.css         # Tailwind + custom theme tokens
```

## Design

This project follows a Kraken-inspired design system:

- **Primary**: Kraken Purple (#7132f5)
- **Text**: Near Black (#101114)
- **Surfaces**: White with subtle shadows
- **Typography**: Kraken-Brand for headings, Kraken-Product for UI
- **Radius**: 12px buttons, 10px inputs, 12px cards

See `DESIGN.md` for the full design specification.
