const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReinsurancePool", function () {
  async function deployFixture() {
    const [deployer, farmer, instLP, keeper] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const OracleConsumer = await ethers.getContractFactory("OracleConsumer");
    const oracle = await OracleConsumer.deploy(ethers.ZeroAddress, keeper.address);
    await oracle.waitForDeployment();

    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPool.deploy(await usdc.getAddress(), deployer.address);
    await pool.waitForDeployment();

    const ReinsurancePool = await ethers.getContractFactory("ReinsurancePool");
    const reinsurance = await ReinsurancePool.deploy(await usdc.getAddress(), deployer.address);
    await reinsurance.waitForDeployment();

    const PolicyVault = await ethers.getContractFactory("PolicyVault");
    const vault = await PolicyVault.deploy();
    await vault.waitForDeployment();
    
    await vault.initialize(
      await usdc.getAddress(),
      await oracle.getAddress(),
      await pool.getAddress(),
      deployer.address
    );

    // Link everything up
    await pool.setPolicyVault(await vault.getAddress());
    await pool.setReinsurancePool(await reinsurance.getAddress());
    await reinsurance.setPrimaryPool(await pool.getAddress());

    // Mint USDC internally
    await usdc.mint(deployer.address, ethers.parseUnits("1000", 6)); // Small primary pool
    await usdc.connect(deployer).approve(await pool.getAddress(), ethers.parseUnits("1000", 6));
    await pool.connect(deployer).stake(ethers.parseUnits("1000", 6));

    await usdc.mint(instLP.address, ethers.parseUnits("50000", 6)); // Huge institutional Reinsurance
    await usdc.connect(instLP).approve(await reinsurance.getAddress(), ethers.parseUnits("50000", 6));
    await reinsurance.connect(instLP).stake(ethers.parseUnits("50000", 6));

    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(farmer).approve(await vault.getAddress(), ethers.parseUnits("1000", 6));

    return { deployer, farmer, instLP, keeper, usdc, oracle, pool, reinsurance, vault };
  }

  it("mints shares on stake and locks for 30 days", async function () {
    const { instLP, usdc, reinsurance } = await deployFixture();
    
    // Attempt withdraw immediately should fail
    await expect(reinsurance.connect(instLP).withdraw(1)).to.be.revertedWith("Reinsurance: 30-day lockup active");

    // Fast forward 30 days
    await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(reinsurance.connect(instLP).withdraw(1)).to.not.be.reverted;
  });

  it("provides capital drawdown to primary pool during a black swan payout", async function () {
    const { farmer, keeper, usdc, oracle, pool, reinsurance, vault } = await deployFixture();

    const cropSoy = 0;
    const hectares = 5; // Coverage will be $5000
    const duration = 30 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-BA");

    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100);

    // Bypassing 120% CR check just for this test to force insolvency later
    // In our tests, totalLiabilities is $5000 but pool balance is only $1000 + $125 premium.
    // Instead of messing with the internal variables, let's artificially grant the pool enough capacity, 
    // then immediately drain it, then trigger the payout.
    
    // Step 1: Provide temporary liquidity to pass the `require 120%` check
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    await usdc.mint(farmer.address, ethers.parseUnits("10000", 6));
    await usdc.connect(farmer).approve(await pool.getAddress(), ethers.parseUnits("10000", 6));
    await pool.connect(farmer).stake(ethers.parseUnits("10000", 6));

    await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });
    const policyId = 1;

    // Step 2: Now the farmer withdraws their massive stake, returning the pool back to barely solvent
    // fast forward 7 days to allow withdrawal
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Withdraw all but the original $1000. Wait, the `withdraw` method enforces 120% CR check.
    // Let's just mock a transfer OUT of the pool to simulate a hacker or massive simultaneous withdrawal
    // Actually, mock transfer from contract address isn't possible directly. 
    // We will simulate insolvency by forcefully setting pool token balance using Hardhat storage or just creating a separate scenario where deficit triggers.
    // Easiest hack: use a backdoor mockUSDC function.
    await usdc.burnFrom(await pool.getAddress(), ethers.parseUnits("9000", 6)); 

    // Now balance of pool is ~$1125, but liability is on a $5000 payout. Black Swan!
    expect(await usdc.balanceOf(await pool.getAddress())).to.be.lt(ethers.parseUnits("5000", 6));

    // Step 3: Trigger the policy
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 90, 90, 90, 100); // 90 > 85 FULL Payout
    await vault.evaluateTrigger(policyId);
    
    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 90, 90, 90, 100); 
    await vault.evaluateTrigger(policyId); // Now claimable

    // Claim
    const farmerBalBefore = await usdc.balanceOf(farmer.address);
    const reinsuranceBalBefore = await usdc.balanceOf(await reinsurance.getAddress());

    await vault.connect(farmer).claimPayout(policyId);

    const farmerBalAfter = await usdc.balanceOf(farmer.address);
    const reinsuranceBalAfter = await usdc.balanceOf(await reinsurance.getAddress());

    const payoutReceived = farmerBalAfter - farmerBalBefore;
    const reinsuranceDrawn = reinsuranceBalBefore - reinsuranceBalAfter;

    // Verification
    expect(payoutReceived).to.equal(ethers.parseUnits("5000", 6));
    expect(reinsuranceDrawn).to.be.gt(0); // Should have drawn approx $3875
  });
});
