const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Hardcoded addresses from your .env.local
  const poolAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  console.log("Seeding LiquidityPool with 50,000 USDC...");
  const mockUsdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
  const pool = await hre.ethers.getContractAt("LiquidityPool", poolAddress);

  const amountToStake = hre.ethers.parseUnits("50000", 6);
  await mockUsdc.mint(deployer.address, amountToStake);
  await mockUsdc.connect(deployer).approve(poolAddress, amountToStake);
  await pool.connect(deployer).stake(amountToStake);

  console.log("LiquidityPool seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
