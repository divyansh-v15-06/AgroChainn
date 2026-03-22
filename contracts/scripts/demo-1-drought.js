const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    console.log("❌ deployments.json not found!");
    return;
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const oracleAddress = deployments.oracle;
  const oracle = await hre.ethers.getContractAt("OracleConsumer", oracleAddress);

  // Push High Drought Score (95)
  const vaultAddress = deployments.policyVault;
  const vault = await hre.ethers.getContractAt("PolicyVault", vaultAddress);
  
  // Auto-detect the latest Policy ID
  const nextId = await vault.nextPolicyId();
  const policyId = (nextId > 1n) ? (nextId - 1n).toString() : "0";

  console.log(`\n🌡️ STEP 1: Sending Drought Signal for Policy #${policyId}...`);
  const regionCode = hre.ethers.encodeBytes32String("AR-CBA");
  
  const tx = await oracle.updateDroughtIndex(regionCode, 95, 95, 95, 120);
  await tx.wait();
  console.log("   ✅ Oracle: Drought Index set to 95 (CRITICAL)");

  // Start the trigger in the vault
  const tx2 = await vault.evaluateTrigger(policyId);
  await tx2.wait();
  
  console.log(`   ✅ Vault: Trigger registered for Policy #${policyId}.`);
  console.log("   Check the UI now—you should see the drought risk indicators turn RED.");
}

main().catch(console.error);
