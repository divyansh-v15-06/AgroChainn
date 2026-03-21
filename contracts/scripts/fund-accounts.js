const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  
  // Attach to exactly the deployed MockUSDC instance
  const usdcAddress = process.env.VITE_USDC_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const usdc = MockUSDC.attach(usdcAddress);

  console.log(`Funding 20 accounts with 100,000 USDC each...`);
  
  // Mint 100k USDC (6 decimals)
  const amount = hre.ethers.parseUnits("100000", 6);

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const tx = await usdc.mint(account.address, amount);
    await tx.wait();
    console.log(`Funded Account #${i}: ${account.address}`);
  }
  
  console.log("All accounts funded successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
