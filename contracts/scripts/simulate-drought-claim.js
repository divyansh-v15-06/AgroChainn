const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Load deployment addresses
  const deploymentsPath = path.join(__dirname, "../deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    console.log("❌ deployments.json not found!");
    console.log("   Please run: npx hardhat run scripts/deploy.js --network localhost");
    return;
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  const usdcAddress = deployments.usdc;
  const vaultAddress = deployments.policyVault;
  const oracleAddress = deployments.oracle;

  const accounts = await hre.ethers.getSigners();
  // Use Account #1 (the one the user connects with MetaMask)
  const farmer = accounts[1]; 
  console.log(`Farmer wallet: ${farmer.address} (Account #1)`);

  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
  const vault = await hre.ethers.getContractAt("PolicyVault", vaultAddress);
  const oracle = await hre.ethers.getContractAt("OracleConsumer", oracleAddress);

  // ---------- Step 1: Buy a policy ----------
  console.log("\n📋 Step 1: Buying a policy for the farmer...");
  const regionCode = hre.ethers.encodeBytes32String("AR-CBA");

  // Approve a large amount to cover the dynamic premium
  const approveAmount = hre.ethers.parseUnits("10000", 6);
  let tx = await usdc.connect(farmer).approve(vaultAddress, approveAmount);
  await tx.wait();
  console.log("   ✅ USDC approved");

  tx = await vault.connect(farmer).createPolicy({
    crop: 0, // SOY
    farmSizeHectares: 5,
    lat: -31400000,
    lon: -64200000,
    duration: 2592000, // 30 days
    regionCode: regionCode,
  });
  await tx.wait();
  const policyId = (await vault.nextPolicyId()) - 1n;
  console.log(`   ✅ Policy #${policyId} created!`);

  // ---------- Step 2: Fast-forward 15 days ----------
  console.log("\n⏩ Step 2: Fast-forwarding blockchain by 15 days...");
  const seconds = 15 * 24 * 60 * 60;
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
  console.log("   ✅ Time warped 15 days into the future");

  // ---------- Step 3: Push fresh oracle score after time warp ----------
  console.log("\n🌡️ Step 3: Pushing fresh drought score (95) to Oracle...");
  tx = await oracle.updateDroughtIndex(regionCode, 95, 95, 95, 100);
  await tx.wait();
  console.log("   ✅ Oracle updated with drought score 95");

  // ---------- Step 4: Evaluate the trigger ----------
  console.log("\n🔍 Step 4: Evaluating drought trigger...");
  tx = await vault.evaluateTrigger(policyId);
  await tx.wait();

  let policy = await vault.policies(policyId);
  console.log(`   Internal Step: After first evaluation...`);
  console.log(`   Claimable: ${policy.claimable}`);
  console.log(`   triggerStartTimestamp: ${policy.triggerStartTimestamp}`);

  // The contract needs the drought to persist for 14 days AFTER the first trigger.
  console.log("\n⏩ Step 4b: Fast-forwarding another 15 days to satisfy persistence...");
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
  
  // Push fresh oracle data again after the second time warp
  tx = await oracle.updateDroughtIndex(regionCode, 95, 95, 95, 100);
  await tx.wait();
  
  tx = await vault.evaluateTrigger(policyId);
  await tx.wait();
  
  policy = await vault.policies(policyId);
  console.log(`   Claimable: ${policy.claimable}`);
  console.log(`   Severity:  ${policy.severity} (2 = FULL, 1 = PARTIAL)`);
  
  if (policy.claimable) {
    console.log("\n🎉 SUCCESS! The policy is now CLAIMABLE!");
    console.log("   Go to the frontend dashboard and click 'Claim Payout' to collect.");
  } else {
    console.log("\n❌ Still not claimable. Check your contract MIN_TRIGGER_DAYS logic.");
  }
}

main().catch(console.error);
