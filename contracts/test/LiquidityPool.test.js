const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidityPool", function () {
  async function deployFixture() {
    const [owner, lp1, lp2] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPool.deploy(await usdc.getAddress(), owner.address);
    await pool.waitForDeployment();
    await pool.setPolicyVault(owner.address);

    return { owner, lp1, lp2, usdc, pool };
  }

  it("mints shares on stake and returns funds on withdraw", async function () {
    const { lp1, usdc, pool } = await deployFixture();

    const amount = ethers.parseUnits("100", 6);
    await usdc.mint(lp1.address, amount);
    await usdc.connect(lp1).approve(await pool.getAddress(), amount);

    await expect(pool.connect(lp1).stake(amount)).to.emit(pool, "Staked");

    const shares = await pool.sharesOf(lp1.address);
    expect(shares).to.equal(amount);

    const balBefore = await usdc.balanceOf(lp1.address);
    // Should revert because of 7-day lockup
    await expect(pool.connect(lp1).withdraw(shares)).to.be.revertedWith("LiquidityPool: 7-day lockup active");
    
    // Fast forward 7 days
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    await expect(pool.connect(lp1).withdraw(shares)).to.emit(pool, "Withdrawn");
    const balAfter = await usdc.balanceOf(lp1.address);

    expect(balAfter - balBefore).to.equal(amount);
  });

  it("mints proportional shares for later LPs", async function () {
    const { lp1, lp2, usdc, pool } = await deployFixture();

    const a1 = ethers.parseUnits("100", 6);
    const a2 = ethers.parseUnits("50", 6);

    await usdc.mint(lp1.address, a1);
    await usdc.connect(lp1).approve(await pool.getAddress(), a1);
    await pool.connect(lp1).stake(a1);

    await usdc.mint(lp2.address, a2);
    await usdc.connect(lp2).approve(await pool.getAddress(), a2);
    await pool.connect(lp2).stake(a2);

    const s1 = await pool.sharesOf(lp1.address);
    const s2 = await pool.sharesOf(lp2.address);

    // With no yield/loss between deposits, shares should be proportional to deposits.
    expect(s1).to.equal(a1);
    expect(s2).to.equal(a2);
  });
});

