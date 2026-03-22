const hre = require("hardhat");

async function main() {
  console.log("\n⏩ STEP 2: Fast-Forwarding Time...");
  
  // Warp Time (15 days) to satisfy persistence
  const seconds = 15 * 24 * 60 * 60;
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
  
  console.log("   ✅ Time: Warped 15 days forward.");
  console.log("   The protocol's 14-day persistence rule is now satisfied.");
}

main().catch(console.error);
