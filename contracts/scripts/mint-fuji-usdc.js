const hre = require("hardhat");

async function main() {
  const deployments = require("../deployments.json");
  if (!deployments.usdc) return console.error("No USDC address found in deployments.json");

  const [deployer] = await hre.ethers.getSigners();
  const usdc = await hre.ethers.getContractAt("MockUSDC", deployments.usdc);
  
  const amount = hre.ethers.parseUnits("50000", 6);
  console.log(`Minting ${hre.ethers.formatUnits(amount, 6)} MockUSDC to ${deployer.address}...`);
  
  const tx = await usdc.mint(deployer.address, amount);
  await tx.wait();
  
  console.log("✅ Success! You now have more Testnet USDC for the demo.");
}

main().catch(console.error);
