const hre = require("hardhat");

async function main() {
  const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const targetWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
  const amount = hre.ethers.parseUnits("1000000", 6); // 1 million USDC

  console.log(`Force minting 1M USDC to ${targetWallet}...`);
  const tx = await usdc.mint(targetWallet, amount);
  await tx.wait();

  const balance = await usdc.balanceOf(targetWallet);
  console.log(`Success! New balance: ${hre.ethers.formatUnits(balance, 6)} USDC`);
}

main().catch(console.error);
