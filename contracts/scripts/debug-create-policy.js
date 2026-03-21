const hre = require("hardhat");

async function main() {
  const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const vaultAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const targetWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const poolAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
  const vault = await hre.ethers.getContractAt("PolicyVault", vaultAddress);

  const premiumAmount = 125000000n; // 125 USDC
  const coverageAmount = 5000000000n; // 5000 USDC
  
  // Impersonate the frontend wallet to see exactly what fails
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [targetWallet],
  });
  const signer = await hre.ethers.getSigner(targetWallet);

  console.log("Testing user balance...");
  console.log(await usdc.balanceOf(targetWallet));
  console.log("Testing user allowance to vault...");
  console.log(await usdc.allowance(targetWallet, vaultAddress));

  console.log("Executing createPolicy locally to catch exact revert:");
  try {
    const regionCode = hre.ethers.encodeBytes32String("AR-CBA");
    await vault.connect(signer).createPolicy({
      crop: 0,
      farmSizeHectares: 5,
      lat: -31400000,
      lon: -64200000,
      duration: 2592000,
      regionCode: regionCode
    });
    console.log("Success! No revert detected in Hardhat standalone test.");
  } catch (e) {
    console.log("CAUGHT EXACT REVERT:");
    console.error(e.message);
  }
}

main().catch(console.error);
