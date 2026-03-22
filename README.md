# 🌾 AgroChain: Resilience for the hand that feeds the world.

**Protecting the 500M+ smallholder farmers who feed the world—one block at a time.**

[![Built for Avalanche](https://img.shields.io/badge/Built%20for-Avalanche-red)](https://www.avax.network/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ERC-8004](https://img.shields.io/badge/Standard-ERC--8004-blue)](https://github.com/ethereum/ERCs/pull/8004)

### 🎥 [Watch Proof of Resilience (Demo Video)](https://youtu.be/exRLu22T7ag)
### 🌐 [Live DApp on Avalanche Fuji](https://agrochain-frontend.vercel.app/)

---

## 🌍 The Vision: Resilience for the Uninsurable
Traditional crop insurance is broken. It relies on slow, bureaucratic claims adjusters, manual inspections, and months of waiting. In 2023, Argentina's agricultural engine stalled, bleeding **$20 Billion** to drought while traditional finance sat idle. 

**AgroChain** is not just a dApp; it’s a new paradigm for global food security. We aim to protect the **500M smallholders** who are currently "uninsurable" by replacing human discretion with **Autonomous Parametric Agents**.

### 👩‍🌾 Why Farmers Choose AgroChain:
- **Zero Paperwork**: No claims to file, no adjusters to wait for.
- **Instant Liquidity**: Payouts triggered by satellite data, arriving in seconds.
- **Total Transparency**: Mathematical triggers ensure fair, un-biased payouts.
- **Institutional-Grade Security**: Every policy is backed by 120% collateral.

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

## 🚀 Live on Avalanche Fuji (Testnet)

The AgroChain protocol is actively deployed and verifiable on the Avalanche Fuji Testnet.

| Contract | Address |
| :--- | :--- |
| **PolicyVault** | `0xD0CB63D3E060768c0D980fA537B7375fd0dE16ee` |
| **LiquidityPool** | `0xE7d55A25d705FD293d947391C04e60b9b64cC944` |
| **OracleConsumer** | `0x506182b2357EFF8844cA4AF63dB12DC6b497100C` |
| **ReinsurancePool** | `0x1019D14c6fdC0B10f69d76DCCE46E7e2Ec20A44f` |
| **MockUSDC** | `0x6393426C4d6e5723c412A29835F01216d10dF351` |

---

---

## 🛡️ Technical Specification & Solvency

AgroChain is engineered for institutional-grade reliability:

| Parameter | Value | Purpose |
| :--- | :--- | :--- |
| **Minimum Persistence** | 14 Days | Nature must meet persistent mathematical conditions. |
| **Payout Severity** | Tiered | 70-85 Score = 50% Payout / >85 Score = 100% Payout. |
| **Minimum Solvency (CPR)** | 120% | Institutional-grade underwriting security (Capital / Liability Ratio). |
| **Finality** | < 1 Sec | Near-instant settlement on Avalanche C-Chain. |
| **Premium Rates** | 2.0% - 3.0% | Base rate per crop (Soy, Corn, Wheat) multiplied by risk score. |

### 📈 Solvency Math
The `LiquidityPool` enforces a strict **120% Collateral-to-Premium Ratio (CPR)**:
```
Pool Solvency = (Total Assets) / (Total Locked Liability)
Policy Creation = Allowed only if Solvency remains ≥ 1.2
```

### 🔐 Security & Access Control
- **Non-Custodial**: Payouts are handled by smart contracts, not human adjusters.
- **Reentrancy Protection**: All financial functions use strict `nonReentrant` guards.
- **SafeERC20**: Integrated for all USDC interactions to prevent rounding errors or failed transfers.
- **Owner-Only Admin**: Core parameters (Oracle source, Pool address) are managed by the protocol owner.

---

## 🛠️ Operational Commands (Fuji & Local)

### 📡 Oracle Relay & APRA-1 Agent
To start the autonomous risk agent:
```bash
cd oracle-relay
node src/index.js
```

### 📋 Verifying Policy & Payout Status
To evaluate the 14-day persistence and trigger a payout:
```bash
cd contracts
npx hardhat run scripts/check-claimable.js --network fuji
```

### 🚀 Quick Start (Local Node Simulation)

#### 1️⃣ Setting up the Command Center
Open 4 terminal windows in the root directory:
- **T1 (Blockchain)**: `cd contracts && npx hardhat node`
- **T2 (Deployment)**: `npm run deploy:local`
- **T3 (Frontend)**: `npm run frontend:local`
- **T4 (Agent Logs)**: `npm run oracle:local`

#### 2️⃣ The "Golden Cut" Simulation (Run in T2)
Watch the full lifecycle in action:
```bash
cd contracts
npx hardhat run scripts/demo-0-buy.js --network localhost
npx hardhat run scripts/demo-1-drought.js --network localhost
npx hardhat run scripts/demo-2-warp.js --network localhost
npx hardhat run scripts/demo-3-payout.js --network localhost
npx hardhat run scripts/demo-4-claim.js --network localhost
```

---

## 💻 Tech Stack
-   **Blockchain**: Solidity 0.8.28, Hardhat, Ethers.js
-   **Frontend**: React 18, Vite, TailwindCSS (Modern Glassmorphism), Wagmi, RainbowKit.
-   **Identity**: ERC-8004 (Autonomous Agents)
-   **Commerce**: x402 (M2M Payments)
-   **Data (Live Fallback)**: Open-Meteo Satellite Archive API (Soil Moisture & Precip).

---

## 🗺️ Roadmap
-   [x] **Testnet Beta**: Deployment to Avalanche Fuji with Circle USDC integration.
-   [x] **Real-Time Data**: Transitioned from mock data to live Satellite Archive proxies.
-   [ ] **Mobile Resilience**: PWA with offline support for farmers in low-connectivity regions.
-   [ ] **Governance**: AGRO token for parametric threshold voting and decentralized risk assessment.

---

## 🤝 The Team
Built with ❤️ for the Aleph Hackathon 2026. Empowering farmers, one block at a time.
