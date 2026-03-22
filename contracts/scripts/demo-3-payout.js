const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const vaultAddress = deployments.policyVault;
  const oracleAddress = deployments.oracle;

  const vault = await hre.ethers.getContractAt("PolicyVault", vaultAddress);
  const oracle = await hre.ethers.getContractAt("OracleConsumer", oracleAddress);

  // Auto-detect the latest Policy ID
  const nextId = await vault.nextPolicyId();
  const policyId = (nextId > 1n) ? (nextId - 1n).toString() : "0";

  console.log(`\n🔍 STEP 3: Finalizing Payout for Policy #${policyId}...`);

  // Ensure drought still persists
  const regionCode = hre.ethers.encodeBytes32String("AR-CBA");
  let tx = await oracle.updateDroughtIndex(regionCode, 98, 98, 98, 150);
  await tx.wait();

  // Evaluate Trigger
  tx = await vault.evaluateTrigger(policyId);
  await tx.wait();

  const policy = await vault.policies(policyId);
  if (policy.claimable) {
    console.log(`\n🎉 SUCCESS! Policy #${policyId} is now CLAIMABLE.`);
    console.log("   The 'Claim Payout' button should now be visible on the dashboard.");
  } else {
    console.log("\n❌ Still not claimable. Ensure Step 1 and Step 2 were run correctly.");
  }
}

main().catch(console.error);
