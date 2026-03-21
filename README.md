# 🌾 AgroChain: The Autonomous Parametric Insurance Protocol

**Protecting the 500M+ smallholder farmers who feed the world—one block at a time.**

[![Built for Avalanche](https://img.shields.io/badge/Built%20for-Avalanche-red)](https://www.avax.network/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ERC-8004](https://img.shields.io/badge/Standard-ERC--8004-blue)](https://github.com/ethereum/ERCs/pull/8004)

---

## 🌍 The Vision: Resilience for the Uninsurable
Traditional crop insurance is broken. It relies on slow, bureaucratic claims adjusters, manual inspections, and months of waiting. In 2023, Argentina's agricultural engine stalled, bleeding **$20 Billion** to drought while traditional finance sat idle. 

**AgroChain** is not just a dApp; it’s a new paradigm for global food security. We aim to protect the **500M smallholders** who are currently "uninsurable" by replacing human discretion with **Autonomous Parametric Agents**.

### 👩‍🌾 Why Farmers Choose AgroChain:
- **Zero Paperwork**: No claims to file, no adjusters to wait for.
- **Instant Liquidity**: Payouts triggered by satellite data, arriving in seconds.
- **Total Transparency**: Mathematical triggers ensure fair, un-biased payouts.
- ** Institutional-Grade Security**: Every policy is backed by 120% collateral.

> **The Goal**: When a drought hits, the money arrives in seconds, not months. No claims, no bias—just pure, automated resilience.

---

## 🚀 Key Innovations

### 🤖 APRA-1: The Autonomous Risk Agent (ERC-8004)
At the core of the protocol is **APRA-1**, our Autonomous Parametric Risk Agent. Operating on the **ERC-8004** standard, the agent manages its own on-chain identity and reputation. It's a digital guardian that independently monitors climate data to protect the farmer's livelihood.

### 💳 Machine-to-Machine Data Commerce (x402)
APRA-1 is a pioneer in the **x402 economy**. It autonomously handles its own data costs, paying for high-resolution satellite telemetry feeds from Open-Meteo or NOAA. This ensures the protocol remains **wholly autonomous**—no human management required to keep the data flowing.

### ⚡ The "Silent Trigger" & Sub-Second Finality
AgroChain features a dual-condition parametric trigger:
1.  **Severity**: The drought index must hit a critical threshold (e.g., >70% moisture failure).
2.  **Persistence**: The failure must persist for 14+ consecutive days.

Powered by the speed of **Avalanche**, we've turned a 3-month claim cycle into a 3-second heartbeat.

---

## 🏗️ Protocol Architecture

AgroChain is a modular monorepo consisting of:

-   **`PolicyVault.sol`**: The core insurance engine. Mints unique **AGROPOL NFTs (ERC-721)** for every policy, representing the farmer's proof-of-coverage.
-   **`LiquidityPool.sol`**: Our institutional-grade underwriting layer. Enforces a strict **120% Collateral-to-Premium Ratio (CPR)** to ensure every policy is fully backed.
-   **`OracleConsumer.sol`**: The decentralized data bridge that validates incoming climate data from satellite feeds.
-   **`ReinsurancePool.sol`**: A secondary safety net designed to absorb "Black Swan" events and catastrophic tail risks.
-   **`Oracle Relay`**: A Node.js keeper backend that bridges satellite telemetry to the blockchain autonomously.

---

## 🛡️ Technical Specification & Solvency

| Parameter | Value | Purpose |
| :--- | :--- | :--- |
| **Minimum Persistence** | 14 Days | Nature must meet persistent mathematical conditions. |
| **Payout Severity** | Tiered | 70-85 Score = 50% Payout / >85 Score = 100% Payout. |
| **Minimum Solvency (CPR)** | 120% | Institutional-grade underwriting security. |
| **Finality** | < 1 Sec | Near-instant settlement on Avalanche C-Chain. |

---

## 💻 Tech Stack
-   **Blockchain**: Solidity 0.8.28, Hardhat, Ethers.js
-   **Frontend**: React 18, Vite, TailwindCSS (Modern Glassmorphism), Wagmi, RainbowKit.
-   **Identity**: ERC-8004 (Autonomous Agents)
-   **Commerce**: x402 (M2M Payments)
-   **Data**: NOAA CPC, OpenWeatherMap, Open-Meteo Satellite Feed.

---

## 🚀 Quick Start (Local Node)

### 1️⃣ Setting up the Command Center
Open 4 terminal windows:
- **T1 (Blockchain)**: `cd contracts && npx hardhat node`
- **T2 (Deployment & Execution)**: `cd contracts`
- **T3 (Frontend)**: `cd frontend && npm run dev`
- **T4 (Agent Logs)**: `cd oracle-relay && node src/index.js`

### 2️⃣ Pre-Flight Sequence (Run in T2)
```bash
# 1. Deploy Protocol
npx hardhat run scripts/deploy.js --network localhost

# 2. Seed Wallets & Data
npx hardhat run scripts/fund-accounts.js --network localhost
npx hardhat run scripts/seedOracle.js --network localhost
npx hardhat run scripts/seedPool.js --network localhost

# 3. Cloud Sync
cd .. && node sync-envs.js
```

### 3️⃣ The "Golden Cut" Simulation (Run in T2)
Watch the full lifecycle in action:
```bash
npx hardhat run scripts/demo-0-buy.js --network localhost    # Purchase AGROPOL NFT
npx hardhat run scripts/demo-1-drought.js --network localhost # Simulate Climate Crisis
npx hardhat run scripts/demo-2-warp.js --network localhost    # Warp Persistence Time (15 days)
npx hardhat run scripts/demo-3-payout.js --network localhost  # Trigger Payout Execution
npx hardhat run scripts/demo-4-claim.js --network localhost   # Settlement Finalized
```

---

## 🗺️ Roadmap
-   [ ] **Testnet Beta**: Deployment to Avalanche Fuji with Circle USDC integration.
-   [ ] **Real-World Integrations**: Moving from mock satellite data to live NOAA API feeds.
-   [ ] **Mobile Resilience**: PWA with offline support for farmers in low-connectivity regions.
-   [ ] **Governance**: AGRO token for parametric threshold voting and decentralized risk assessment.

---

## 🤝 The Team
Built with ❤️ for the Aleph Hackathon 2026. Empowering farmers, one block at a time.
