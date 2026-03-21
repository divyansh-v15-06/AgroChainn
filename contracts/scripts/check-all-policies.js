const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    const deploymentsPath = path.join(__dirname, "../deployments.json");
    if (!fs.existsSync(deploymentsPath)) {
      console.log("❌ deployments.json not found!");
      return;
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    const vaultAddress = deployments.policyVault;
    
    const vault = await hre.ethers.getContractAt("PolicyVault", vaultAddress);
    
    // Get total policies count
    const nextPolicyId = await vault.nextPolicyId();
    const totalPolicies = nextPolicyId - 1n;
    
    console.log(`\n📊 TOTAL POLICIES CREATED: ${totalPolicies}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    if (totalPolicies === 0n) {
      console.log("❌ No policies exist yet!");
      return;
    }
    
    // Get farmer address
    const accounts = await hre.ethers.getSigners();
    const farmerAddress = accounts[1].address;
    
    console.log(`👨‍🌾 Farmer Address: ${farmerAddress}\n`);
    
    // List all policies
    for (let i = 1n; i <= totalPolicies; i++) {
      try {
        const policy = await vault.policies(i);
        const owner = await vault.ownerOf(i);
        
        const isOwned = owner.toLowerCase() === farmerAddress.toLowerCase();
        const ownerMark = isOwned ? "✅ OWNED" : "❌ NOT OWNED";
        
        console.log(`Policy #${i} ${ownerMark}`);
        console.log(`  Farmer: ${policy.farmer.substring(0, 10)}...`);
        console.log(`  Crop: ${policy.crop === 0n ? "SOY" : policy.crop === 1n ? "CORN" : "WHEAT"}`);
        console.log(`  Size: ${policy.farmSizeHectares} hectares`);
        console.log(`  Coverage: $${hre.ethers.formatUnits(policy.coverageAmount, 6)} USDC`);
        console.log(`  Premium: $${hre.ethers.formatUnits(policy.premium, 6)} USDC`);
        console.log(`  Active: ${policy.active}`);
        console.log(`  Claimable: ${policy.claimable}`);
        console.log(`  Claimed: ${policy.claimed}`);
        console.log(`  Severity: ${policy.severity === 0n ? "NONE" : policy.severity === 1n ? "PARTIAL" : "FULL"}`);
        console.log();
      } catch (e) {
        console.log(`❌ Policy #${i} error: ${e.message}\n`);
      }
    }
    
    // Check farmer's NFT balance
    const nftBalance = await vault.balanceOf(farmerAddress);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👛 Farmer's NFT Balance: ${nftBalance}`);
    console.log(`🎯 Expected NFTs: ${totalPolicies}`);
    
    if (nftBalance.toString() === totalPolicies.toString()) {
      console.log(`✅ All policies have corresponding NFTs!\n`);
    } else {
      console.log(`⚠️ Mismatch! Only ${nftBalance} NFTs but ${totalPolicies} policies exist\n`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
