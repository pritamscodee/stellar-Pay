# StellarVote — Soroban Contract Deployment Script (PowerShell)
# Usage:
#   .\scripts\deploy.ps1 [-Network testnet] [-Identity default]

param(
    [string]$Network = "testnet",
    [string]$Identity = "default"
)

$ContractDir = "contracts/poll"
$Wasm = "$ContractDir/target/wasm32-unknown-unknown/release/stellar_poll.wasm"

Write-Host "🚀 Deploying StellarVote Poll Contract to $Network" -ForegroundColor Cyan
Write-Host "   Identity: $Identity"
Write-Host ""

# 1. Build contract WASM
Write-Host "📦 Building contract..." -ForegroundColor Yellow
cargo build --target wasm32-unknown-unknown --release --manifest-path "$ContractDir/Cargo.toml"
if (-not $?) { exit 1 }

# 2. Deploy contract
Write-Host "📤 Deploying contract..." -ForegroundColor Yellow
soroban contract deploy `
    --wasm $Wasm `
    --source $Identity `
    --network $Network

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "   Copy the Contract ID above and update your .env VITE_CONTRACT_ID"
