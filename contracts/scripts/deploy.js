const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);

  // For local testing, deploy a mock USDC. For live networks, set USDC_ADDRESS in env.
  let usdcAddress = process.env.USDC_ADDRESS;

  if (!usdcAddress) {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("MockUSDC:", usdcAddress);

    // Auto-fund the first 20 local hardhat accounts with mock USDC
    const accounts = await hre.ethers.getSigners();
    const amount = hre.ethers.parseUnits("100000", 6);
    console.log("Auto-funding 20 accounts with 100,000 USDC each...");
    try {
      for (let i = 0; i < accounts.length; i++) {
        await usdc.mint(accounts[i].address, amount);
      }
      console.log("Auto-funding complete.");
    } catch (e) {
      console.log("Auto-funding skipped (not local node)");
    }
  } else {
    console.log("USDC:", usdcAddress);
  }

  const keeper = process.env.KEEPER_ADDRESS || deployer.address;

  const OracleConsumer = await hre.ethers.getContractFactory("OracleConsumer");
  const oracle = await OracleConsumer.deploy(hre.ethers.ZeroAddress, keeper);
  await oracle.waitForDeployment();
  console.log("OracleConsumer:", await oracle.getAddress());

  const LiquidityPool = await hre.ethers.getContractFactory("LiquidityPool");
  const pool = await LiquidityPool.deploy(usdcAddress, deployer.address);
  await pool.waitForDeployment();
  console.log("LiquidityPool:", await pool.getAddress());

  const PolicyVault = await hre.ethers.getContractFactory("PolicyVault");
  const vault = await PolicyVault.deploy();
  await vault.waitForDeployment();
  console.log("PolicyVault:", await vault.getAddress());

  // Init PolicyVault
  await vault.initialize(
    usdcAddress,
    await oracle.getAddress(),
    await pool.getAddress(),
    deployer.address
  );
  console.log("PolicyVault initialized.");

  const ReinsurancePool = await hre.ethers.getContractFactory("ReinsurancePool");
  const reinsurance = await ReinsurancePool.deploy(usdcAddress, deployer.address);
  await reinsurance.waitForDeployment();
  console.log("ReinsurancePool:", await reinsurance.getAddress());

  // Link Contracts
  await pool.setPolicyVault(await vault.getAddress());
  await pool.setReinsurancePool(await reinsurance.getAddress());
  await reinsurance.setPrimaryPool(await pool.getAddress());
  console.log("Contracts linked successfully.");

  // Seed LiquidityPool with 50,000 USDC so it has sufficient CR for initial policies
  if (!process.env.USDC_ADDRESS) {
    console.log("Seeding LiquidityPool with 50,000 USDC...");
    const mockUsdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
    const amountToStake = hre.ethers.parseUnits("50000", 6);
    await mockUsdc.mint(deployer.address, amountToStake);
    await mockUsdc.connect(deployer).approve(await pool.getAddress(), amountToStake);
    await pool.connect(deployer).stake(amountToStake);
    console.log("LiquidityPool seeded.");
  }

  // Seed Oracle with initial mock data so the frontend wizard doesn't revert
  console.log("Seeding OracleConsumer with initial data for default regions...");
  const regionCBA = hre.ethers.encodeBytes32String("AR-CBA");
  await oracle.updateDroughtIndex(regionCBA, 50, 50, 50, 100);
  console.log("Oracle seeded.");

  // Save deployment addresses to a file for other scripts to use
  const fs = require('fs');
  const deployments = {
    mocked: true,
    deployedAt: new Date().toISOString(),
    network: hre.network.name,
    usdc: usdcAddress,
    oracle: await oracle.getAddress(),
    liquidityPool: await pool.getAddress(),
    policyVault: await vault.getAddress(),
    reinsurancePool: await reinsurance.getAddress(),
  };
  fs.writeFileSync('./deployments.json', JSON.stringify(deployments, null, 2));
  console.log("\n✅ Deployment addresses saved to deployments.json");

  console.log("\nNext steps:");
  console.log("- Set VITE_POLICY_VAULT_ADDRESS, VITE_LIQUIDITY_POOL_ADDRESS, and VITE_REINSURANCE_POOL_ADDRESS in frontend env");
  console.log("- Fund the oracle keeper (", keeper, ") with gas on this network");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

