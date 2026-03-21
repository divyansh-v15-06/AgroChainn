const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PolicyVault", function () {
  async function deployFixture() {
    const [deployer, farmer, keeper] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const OracleConsumer = await ethers.getContractFactory("OracleConsumer");
    const oracle = await OracleConsumer.deploy(ethers.ZeroAddress, keeper.address);
    await oracle.waitForDeployment();

    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPool.deploy(await usdc.getAddress(), deployer.address);
    await pool.waitForDeployment();

    const PolicyVault = await ethers.getContractFactory("PolicyVault");
    
    // Deploy Upgradeable Proxy (simulated by deploying impl and calling initialize directly for this simple test)
    const vault = await PolicyVault.deploy();
    await vault.waitForDeployment();
    
    await vault.initialize(
      await usdc.getAddress(),
      await oracle.getAddress(),
      await pool.getAddress(),
      deployer.address
    );
    await pool.setPolicyVault(await vault.getAddress());

    // pre-fund the pool so it meets the 120% collateral ratio requirement
    await usdc.mint(deployer.address, ethers.parseUnits("100000", 6));
    await usdc.connect(deployer).approve(await pool.getAddress(), ethers.parseUnits("100000", 6));
    await pool.connect(deployer).stake(ethers.parseUnits("100000", 6));

    return { deployer, farmer, keeper, usdc, oracle, pool, vault };
  }

  it("creates policy and becomes claimable after sustained drought", async function () {
    const { farmer, keeper, usdc, oracle, vault } = await deployFixture();

    // fund farmer and approve premium
    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(farmer).approve(await vault.getAddress(), ethers.parseUnits("125", 6));

    const cropSoy = 0; // SOY
    const hectares = 5; // 5 ha
    const duration = 30 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");

    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100);
    // Expected: 5 ha * $1000 = $5000 coverage. Soy (2.5%) = $125 premium
    await expect(
      vault
        .connect(farmer)
        .createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode })
    ).to.emit(vault, "PolicyCreated");

    const policyId = 1;

    // simulate drought index > threshold for 14 days
    const fourteenDays = 14 * 24 * 60 * 60;
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100);

    // first evaluation starts the consecutive-day window
    await vault.evaluateTrigger(policyId);

    // fast-forward time and refresh oracle (simulates daily keeper update)
    await ethers.provider.send("evm_increaseTime", [fourteenDays + 1]);
    await ethers.provider.send("evm_mine", []);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100);

    // second evaluation after time elapsed should mark claimable
    await vault.evaluateTrigger(policyId);
    const policy = await vault.policies(policyId);
    expect(policy.claimable).to.equal(true);
  });

  it("allows farmer to claim payout once claimable", async function () {
    const { deployer, farmer, keeper, usdc, oracle, vault } = await deployFixture();

    const cropSoy = 0;
    const hectares = 5;
    const duration = 30 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");

    // formula outputs for 5ha Soybean
    const expectedCoverage = ethers.parseUnits("5000", 6);
    const expectedPremium = ethers.parseUnits("125", 6);

    // fund farmer for premium
    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));

    await usdc.connect(farmer).approve(await vault.getAddress(), expectedPremium);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100); await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });

    const policyId = 1;

    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100);
    await vault.evaluateTrigger(policyId);

    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100); // refresh oracle

    await vault.evaluateTrigger(policyId);

    const farmerBalBefore = await usdc.balanceOf(farmer.address);
    await expect(vault.connect(farmer).claimPayout(policyId)).to.emit(vault, "PolicyClaimed");
    const farmerBalAfter = await usdc.balanceOf(farmer.address);

    // Because drought index was 80 (Phase 1), they only get 50% partial payout!
    const expectedPayout = expectedCoverage / 2n;
    expect(farmerBalAfter - farmerBalBefore).to.equal(expectedPayout);

    const policy = await vault.policies(policyId);
    expect(policy.active).to.equal(false);
    expect(policy.claimed).to.equal(true);
  });

  it("prevents non-farmer from claiming", async function () {
    const { deployer, farmer, keeper, usdc, oracle, vault } = await deployFixture();
    const [, , , attacker] = await ethers.getSigners();

    const cropSoy = 0;
    const hectares = 5;
    const duration = 30 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");

    const expectedCoverage = ethers.parseUnits("5000", 6);
    const expectedPremium = ethers.parseUnits("125", 6);

    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));

    await usdc.connect(farmer).approve(await vault.getAddress(), expectedPremium);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100); await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });

    const policyId = 1;
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100);
    await vault.evaluateTrigger(policyId);
    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100); // refresh oracle
    await vault.evaluateTrigger(policyId);

    await expect(vault.connect(attacker).claimPayout(policyId)).to.be.revertedWith("PolicyVault: Only NFT owner can claim");
  });

  it("expires policy after endTime", async function () {
    const { farmer, usdc, oracle, keeper, vault } = await deployFixture();

    const cropSoy = 0;
    const hectares = 5;
    const duration = 7 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");

    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(farmer).approve(await vault.getAddress(), ethers.parseUnits("125", 6));
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100); await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });

    // even if oracle updates, expiry should still work after duration
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 0, 0, 0, 100);

    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(vault.expirePolicy(1)).to.emit(vault, "PolicyExpired");
    const policy = await vault.policies(1);
    expect(policy.active).to.equal(false);
  });

  it("expirePolicy releases capital liability back to pool", async function () {
    const { farmer, keeper, usdc, oracle, vault, pool } = await deployFixture();

    const cropSoy = 0;
    const hectares = 5;
    const duration = 7 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");
    const expectedPremium = ethers.parseUnits("125", 6);
    const expectedCoverage = ethers.parseUnits("5000", 6);

    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(farmer).approve(await vault.getAddress(), expectedPremium);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100); 
    await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });

    const liabilitiesBefore = await pool.totalLiabilities();

    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine", []);

    await vault.expirePolicy(1);

    const liabilitiesAfter = await pool.totalLiabilities();
    expect(liabilitiesBefore - liabilitiesAfter).to.equal(expectedCoverage);
  });

  it("expirePolicy reverts if policy is claimable (trigger active)", async function () {
    const { farmer, keeper, usdc, oracle, vault } = await deployFixture();

    const cropSoy = 0;
    const hectares = 5;
    const duration = 90 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");
    const expectedPremium = ethers.parseUnits("125", 6);

    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(farmer).approve(await vault.getAddress(), expectedPremium);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100); await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });

    // trigger drought and make claimable
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100);
    await vault.evaluateTrigger(1);

    await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100); // refresh oracle
    await vault.evaluateTrigger(1);

    // policy is now claimable — expiry beyond duration should be blocked
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine", []);

    await expect(vault.expirePolicy(1)).to.be.revertedWith(
      "PolicyVault: trigger active - farmer must claim first"
    );
  });

  it("evaluateTrigger reverts on stale oracle data (>48h)", async function () {
    const { farmer, keeper, usdc, oracle, vault } = await deployFixture();

    const cropSoy = 0;
    const hectares = 5;
    const duration = 90 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");

    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(farmer).approve(await vault.getAddress(), ethers.parseUnits("125", 6));
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100); await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });

    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100);

    // fast-forward 49 hours so oracle data is stale
    await ethers.provider.send("evm_increaseTime", [49 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await expect(vault.evaluateTrigger(1)).to.be.revertedWith("PolicyVault: stale oracle");
  });

  it("trigger counter resets when drought index drops below threshold", async function () {
    const { farmer, keeper, usdc, oracle, vault } = await deployFixture();

    const cropSoy = 0;
    const hectares = 5;
    const duration = 90 * 24 * 60 * 60;
    const regionCode = ethers.encodeBytes32String("AR-CBA");

    await usdc.mint(farmer.address, ethers.parseUnits("1000", 6));
    await usdc.connect(farmer).approve(await vault.getAddress(), ethers.parseUnits("125", 6));
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 50, 50, 50, 100); await vault.connect(farmer).createPolicy({ crop: cropSoy, farmSizeHectares: hectares, lat: 0, lon: 0, duration, regionCode });

    // drought starts — trigger window begins
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 80, 80, 80, 100);
    await vault.evaluateTrigger(1);
    let policy = await vault.policies(1);
    expect(policy.triggerStartTimestamp).to.be.gt(0n);

    // rain! — drought resolves, counter should reset
    await oracle.connect(keeper).updateDroughtIndex(regionCode, 20, 20, 20, 100);
    await vault.evaluateTrigger(1);
    policy = await vault.policies(1);
    expect(policy.triggerStartTimestamp).to.equal(0n);
    expect(policy.claimable).to.equal(false);
  });
});

