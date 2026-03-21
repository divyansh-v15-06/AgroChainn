const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    // Load deployment addresses from file
    const deploymentsPath = path.join(__dirname, "../deployments.json");
    if (!fs.existsSync(deploymentsPath)) {
      console.log("❌ deployments.json not found!");
      console.log("\n   Please run: npx hardhat run scripts/deploy.js --network localhost");
      return;
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    const policyVaultAddress = deployments.policyVault;
    
    console.log(`📋 Using PolicyVault at: ${policyVaultAddress}`);
    
    const policyVault = await hre.ethers.getContractAt("PolicyVault", policyVaultAddress);

    // Get the next policy ID (which tells us how many policies exist)
    const nextPolicyId = await policyVault.nextPolicyId();
    console.log(`📊 Total policies created: ${nextPolicyId - 1n}`);

    if (nextPolicyId <= 1n) {
      console.log("\n❌ No policies exist yet!");
      console.log("   Please run: npx hardhat run scripts/simulate-drought-claim.js --network localhost");
      console.log("   Or create a policy via the frontend first.");
      return;
    }

    // Check the latest policy
    const policyId = nextPolicyId - 1n;
    console.log(`\n🔍 Evaluating policy trigger for ID ${policyId}...`);
    
    let tx = await policyVault.evaluateTrigger(policyId);
    await tx.wait();
    console.log("   ✅ Trigger evaluation complete");

    const policy = await policyVault.policies(policyId);
    console.log("\n📋 Policy Status:");
    console.log(`   Claimable: ${policy.claimable}`);
    console.log(`   Severity: ${policy.severity.toString()} (0=NONE, 1=PARTIAL, 2=FULL)`);
    console.log(`   Active: ${policy.active}`);
    console.log(`   Claimed: ${policy.claimed}`);

    if (policy.claimable) {
      console.log("\n✅ Ready to claim!");
    } else {
      console.log("\n⏳ Contract does not consider it claimable yet.");
      console.log("   The drought may not have persisted for 14+ days, or severity is insufficient.");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\nTroubleshooting:");
    console.log("   1. Ensure hardhat node is running: npx hardhat node");
    console.log("   2. Ensure contracts are deployed: npx hardhat run scripts/deploy.js --network localhost");
    console.log("   3. Ensure a policy exists: npx hardhat run scripts/simulate-drought-claim.js --network localhost");
  }
}

main().catch(console.error);
