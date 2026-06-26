#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# StellarVote — Soroban Contract Deployment Script
# ──────────────────────────────────────────────
# Usage:
#   ./scripts/deploy.sh <network>
#
# Networks:
#   testnet  — Stellar testnet (default)
#   mainnet  — Stellar mainnet (use with caution)
#
# Prerequisites:
#   - soroban-cli installed (cargo install soroban-cli)
#   - Identity configured: soroban config identity add <name>
#   - Funded account on target network
# ──────────────────────────────────────────────

NETWORK="${1:-testnet}"
IDENTITY="${2:-default}"
CONTRACT_DIR="contracts/poll"
WASM="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/stellar_poll.wasm"

echo "🚀 Deploying StellarVote Poll Contract to $NETWORK"
echo "   Identity: $IDENTITY"
echo ""

# 1. Build contract WASM
echo "📦 Building contract..."
cargo build --target wasm32-unknown-unknown --release --manifest-path "$CONTRACT_DIR/Cargo.toml"

# 2. Deploy contract
echo "📤 Deploying contract..."
soroban contract deploy \
  --wasm "$WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK"

echo ""
echo "✅ Deployment complete!"
echo "   Copy the Contract ID above and update your .env VITE_CONTRACT_ID"
