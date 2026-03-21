/**
 * AgroChain Oracle Relay — Entry Point
 *
 * Runs a cron job to:
 *   1. Fetch NOAA drought monitor data
 *   2. Fetch OpenWeatherMap precipitation data
 *   3. Compute composite drought score per active region
 *   4. Write scores to OracleConsumer.sol via keeper wallet
 *
 * Schedule:
 *   - Production:  daily at 06:00 UTC  (cron: "0 6 * * *")
 *   - Dev mode:    every minute        (cron: every 1 min)
 *     Set DEV_MODE=true in .env to use dev schedule.
 */

require("dotenv").config();

const cron = require("node-cron");
const { ethers } = require("ethers");
const { computeDroughtScore } = require("./scorer");
const { writeDroughtIndex } = require("./writer");

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL              = process.env.RPC_URL || "http://127.0.0.1:8545";
const KEEPER_PRIVATE_KEY   = process.env.KEEPER_PRIVATE_KEY;
const ORACLE_CONSUMER_ADDR = process.env.ORACLE_CONSUMER_ADDRESS;
const OWM_API_KEY          = process.env.OPENWEATHERMAP_API_KEY;
const DEV_MODE             = process.env.DEV_MODE === "true";

// Comma-separated list of region codes to monitor, e.g. "AR-CBA,AR-BA,BR-SP"
const REGION_CODES = (process.env.REGION_CODES || "AR-CBA")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);

if (!KEEPER_PRIVATE_KEY || !ORACLE_CONSUMER_ADDR) {
  console.error(
    "[relay] FATAL: KEEPER_PRIVATE_KEY and ORACLE_CONSUMER_ADDRESS must be set in .env"
  );
  process.exit(1);
}

// ── Wallet Setup ──────────────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet   = new ethers.Wallet(KEEPER_PRIVATE_KEY, provider);

// ── Core Job ──────────────────────────────────────────────────────────────────

async function runOracleUpdate() {
  console.log(`[relay] ${new Date().toISOString()} — Running oracle update for regions: ${REGION_CODES.join(", ")}`);

  // Process all regions in parallel
  const results = await Promise.allSettled(
    REGION_CODES.map(async (regionCode) => {
      const { noaaScore, ndviProxy, precipScore, riskScore } = await computeDroughtScore(regionCode, OWM_API_KEY);
      await writeDroughtIndex(wallet, ORACLE_CONSUMER_ADDR, regionCode, noaaScore, ndviProxy, precipScore, riskScore);
      return { regionCode, score: {noaaScore, ndviProxy, precipScore, riskScore} };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      console.log(
        `[relay] ✓ ${result.value.regionCode} → components fetched & pushed successfully.`
      );
    } else {
      console.error(`[relay] ✗ region failed:`, result.reason?.message || result.reason);
    }
  }

  console.log(`[relay] ${new Date().toISOString()} — Update complete`);
}

// ── Cron Schedule ─────────────────────────────────────────────────────────────

const schedule = DEV_MODE ? "* * * * *" : "0 6 * * *";

console.log("[relay] AgroChain Oracle Relay started");
console.log("[relay] RPC    :", RPC_URL);
console.log("[relay] Keeper :", wallet.address);
console.log("[relay] Oracle :", ORACLE_CONSUMER_ADDR);
console.log("[relay] Regions:", REGION_CODES.join(", "));
console.log("[relay] Mode   :", DEV_MODE ? "DEV (every 1 min)" : "PROD (daily 06:00 UTC)");
console.log("[relay] Schedule:", schedule);

// Run immediately on startup so we don't wait for first cron tick
runOracleUpdate().catch((err) => console.error("[relay] Startup run failed:", err));

cron.schedule(schedule, () => {
  runOracleUpdate().catch((err) => console.error("[relay] Cron run failed:", err));
});
