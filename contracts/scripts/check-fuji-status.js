const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployments = require("../deployments.json");
  
  console.log(`--- Balance Report (Fuji) ---`);
  console.log(`Account: ${deployer.address}`);
  
  // 1. AVAX Balance (for Gas)
  const avaxBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`AVAX: ${hre.ethers.formatEther(avaxBalance)} AVAX`);
  
  // 2. MockUSDC Balance
  if (deployments.usdc) {
    const usdc = await hre.ethers.getContractAt("MockUSDC", deployments.usdc);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log(`USDC: ${hre.ethers.formatUnits(usdcBalance, 6)} USDC`);
  }
  
  if (avaxBalance < hre.ethers.parseEther("0.1")) {
    console.log("\n⚠️ LOW GAS: Please visit https://faucet.avax.network/ to refill.");
  }
}

main().catch(console.error);
