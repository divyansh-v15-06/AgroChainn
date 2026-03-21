const hre = require("hardhat");

async function main() {
  const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const vaultAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const targetWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
  const allowance = await usdc.allowance(targetWallet, vaultAddress);

  console.log(`Allowance for ${targetWallet} to spend on Vault: ${allowance.toString()} wei (${hre.ethers.formatUnits(allowance, 6)} USDC)`);
}

main().catch(console.error);
