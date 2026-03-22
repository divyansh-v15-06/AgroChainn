const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * 🎬 STEP 4: Simulating Payout Claim
 * 
 * This script connects as the Farmer (Account #1) and claims the payout.
 */

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  
  const vaultAddress = deployments.policyVault;
  const usdcAddress = deployments.usdc;

  const accounts = await hre.ethers.getSigners();
  const farmer = accounts[1];

  const vault = await hre.ethers.getContractAt("PolicyVault", vaultAddress);
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);

  const nextId = await vault.nextPolicyId();
  const policyId = (nextId > 1n) ? (nextId - 1n).toString() : "0";

  console.log(`\n💰 STEP 4: Claiming Payout for Policy #${policyId} as Farmer...`);

  const balanceBefore = await usdc.balanceOf(farmer.address);
  
  const tx = await vault.connect(farmer).claimPayout(policyId);
  await tx.wait();

  const balanceAfter = await usdc.balanceOf(farmer.address);
  const received = hre.ethers.formatUnits(balanceAfter - balanceBefore, 6);

  console.log(`\n🎉 SUCCESS! Farmer received ${received} USDC payout instantly.`);
  console.log(`   NFT #${policyId} has been liquidated.`);
}

main().catch(console.error);
