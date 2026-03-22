# 🌍 AgroChain Deployment Requirements Guide

AgroChain is a decentralized parametric insurance application. Because we rely on high-frequency, cost-effective oracle updates and secure stablecoin logic, our deployment infrastructure requirements are highly specific.

This guide outlines exactly what chains, networks, and integrations are required to take AgroChain from our current localhost environment to a Production environment.

---

## 1. Network / Blockchain Requirements

### Recommended Chain: Avalanche (AVAX)
AgroChain is heavily optimized for the **Avalanche network (C-Chain)**.

**Why Avalanche?**
1. **Low Latency & High Throughput:** Weather oracles must update the `OracleConsumer` daily across multiple regions. This requires extremely low gas fees to keep the "Keeper" relay economical.
2. **EVM Compatibility:** All of our contracts (`PolicyVault`, `LiquidityPool`) are written in standard EVM Solidity using OpenZeppelin standards. Avalanche C-Chain allows a seamless lift-and-shift of our exact codebase.
3. **Chainlink / Oracle Infrastructure:** Avalanche has premier, first-class support for Chainlink node operations and custom Data Feeds, which is critical for future decentralization of our Oracle Relay.

### Testing/Staging Environment:
- **Network Name:** Avalanche Fuji Testnet
- **Currency:** Testnet AVAX (for gas)
- **Stablecoin:** Testnet USDC (Mock)

### Production Environment:
- **Network Name:** Avalanche Mainnet C-Chain
- **Currency:** AVAX (for gas)

*(Note: Polygon (PoS) or Arbitrum One are viable fallback L2 alternatives if Avalanche is not preferred, as they share the same EVM capabilities and low gas costs).*

---

## 2. Asset Integrations

### Circle USDC (Native)
AgroChain denominates all premiums, liquidity sizing, and payouts entirely in USD to protect farmers from crypto volatility. 
- **Requirement:** During production deployment, the `MockUSDC` contract must be completely stripped out. The deployment scripts must point the `PolicyVault` and `LiquidityPool` constructors directly to the **official Native Circle USDC** contract address on the chosen production chain. (e.g., `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` on Avalanche).

---

## 3. Data & Oracle Infrastructure

Taking the current mock backend relay to production requires highly-available APIs and server infrastructure.

### API Requirements
To feed the `OracleConsumer.sol` effectively, the production Oracle Relay backend requires active developer accounts and API Keys for:
1. **NOAA CPC (Climate Prediction Center) APIs:** For official soil moisture and drought severity indexing.
2. **NASA MODIS Satellite Imagery:** To extract NDVI (Normalized Difference Vegetation Index) data proxies to determine the visual health of crops.
3. **OpenWeatherMap REST API:** To track 14-day trailing precipitation metrics in millimeter formats.

### Keeper Wallet Infrastructure
- **Requirement:** A highly secure wallet infrastructure to sign and broadcast the daily oracle transactions. 
- Do **not** use raw `.env` private keys in production.
- Use **OpenZeppelin Defender**, **GCP Secret Manager**, or an **AWS KMS (Key Management Service)** to securely sign transactions via ethers.js in the Node cronjob.
- The Keeper wallet must always be topped up with Mainnet AVAX for gas.

---

## 4. Frontend Hosting & RPCs

### Domain & Hosting
- The Vite/React frontend must be hosted on a globally distributed CDN to ensure farmers in remote latency areas (e.g., LatAm) can load the wizard quickly.
- **Recommended:** Vercel, Netlify, or AWS Amplify.

### RPC Providers
- Our dApp requires a stable connection to the blockchain to read data and submit quotes without rate-limiting the user.
- **Requirement:** A dedicated Premium RPC Provider account (e.g., **Alchemy, Infura, or QuickNode**) for the Avalanche Mainnet. 
- Do **not** rely on public free-tier RPCs in production as they will throttle connection speeds during peak congestion, halting `createPolicy` transactions.

---

## 5. Liquidity Seeding (The "Cold Start")

Because AgroChain enforces a strict **120% Collateral Ratio**, a new deployment cannot accept farmers until capital is locked.
- **Primary Pool Requirement:** Before launch, Institutional Liquidity Providers (LPs) must deposit real USDC into the deployed `LiquidityPool` contract using the `stake()` function.
- **Reinsurance Requirement:** An established DAO or reinsurer must deposit emergency capital into the `ReinsurancePool` contract as a backstop.

Without these two pools actively seeded on Mainnet day 1, the frontend will revert any farmer attempting to purchase a policy with the `LiquidityPool: insufficient collateral ratio` error.
