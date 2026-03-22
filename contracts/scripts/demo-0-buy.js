const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 🎬 STEP 0: Simulating Policy Purchase
 * 
 * This script connects as the Farmer (Account #1) and buys a policy.
 */

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  
  const usdcAddress = deployments.usdc;
  const vaultAddress = deployments.policyVault;
  const oracleAddress = deployments.oracle;

  const accounts = await hre.ethers.getSigners();
  const farmer = accounts[1]; // The same account used in the frontend

  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
  const vault = await hre.ethers.getContractAt("PolicyVault", vaultAddress);
  const oracle = await hre.ethers.getContractAt("OracleConsumer", oracleAddress);

  console.log(`\n👨‍🌾 Farmer: ${farmer.address} (Account #1)`);
  console.log("💰 STEP 0: Purchasing Insurance Policy...");

  // 1. Approve USDC
  const approveAmount = hre.ethers.parseUnits("1000", 6);
  let tx = await usdc.connect(farmer).approve(vaultAddress, approveAmount);
  await tx.wait();
  console.log("   ✅ Step A: Premium payment authorized (USDC Approved)");

  // 2. Buy Policy
  const regionCode = hre.ethers.encodeBytes32String("AR-CBA");
  tx = await vault.connect(farmer).createPolicy({
    crop: 0, // SOY
    farmSizeHectares: 5,
    lat: -31400000,
    lon: -64200000,
    duration: 2592000, // 30 days
    regionCode: regionCode,
  });
  await tx.wait();

  const policyId = (await vault.nextPolicyId()) - 1n;
  console.log(`   ✅ Step B: AGROPOL NFT #${policyId} minted to farmer.`);
  console.log("   Check the App Dashboard: You should see the new policy active.");
}

main().catch(console.error);
