const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OracleConsumer", function () {
  async function deployFixture() {
    const [deployer, keeper, other] = await ethers.getSigners();

    const OracleConsumer = await ethers.getContractFactory("OracleConsumer");
    const oracle = await OracleConsumer.deploy(ethers.ZeroAddress, keeper.address);
    await oracle.waitForDeployment();

    return { deployer, keeper, other, oracle };
  }

  it("keeper can update drought index", async function () {
    const { keeper, oracle } = await deployFixture();
    const region = ethers.encodeBytes32String("AR-CBA");

    await expect(oracle.connect(keeper).updateDroughtIndex(region, 75, 75, 75, 100))
      .to.emit(oracle, "DroughtIndexUpdated")
      .withArgs(region, 75, (v) => v > 0n, 100, 2); // 2 is HIGH confidence

    const [index, ts, riskScore] = await oracle.getDroughtIndex(region);
    expect(index).to.equal(75);
    expect(riskScore).to.equal(100);
    expect(ts).to.be.gt(0);
  });

  it("non-keeper cannot update drought index", async function () {
    const { other, oracle } = await deployFixture();
    const region = ethers.encodeBytes32String("AR-CBA");

    await expect(
      oracle.connect(other).updateDroughtIndex(region, 50, 50, 50, 100)
    ).to.be.revertedWith("OracleConsumer: not keeper");
  });

  it("reverts when index > 100", async function () {
    const { keeper, oracle } = await deployFixture();
    const region = ethers.encodeBytes32String("AR-CBA");

    await expect(
      oracle.connect(keeper).updateDroughtIndex(region, 101, 50, 50, 100)
    ).to.be.revertedWith("OracleConsumer: index out of range");
  });

  it("returns zero index and zero timestamp for unknown region", async function () {
    const { oracle } = await deployFixture();
    const region = ethers.encodeBytes32String("XX-UNKNOWN");

    const [index, ts, riskScore] = await oracle.getDroughtIndex(region);
    expect(index).to.equal(0);
    expect(ts).to.equal(0);
    expect(riskScore).to.equal(0);
  });

  it("keeper can transfer keeper role", async function () {
    const { keeper, other, oracle } = await deployFixture();

    await expect(oracle.connect(keeper).setKeeper(other.address))
      .to.emit(oracle, "KeeperUpdated")
      .withArgs(other.address);

    // old keeper can no longer update
    const region = ethers.encodeBytes32String("AR-CBA");
    await expect(
      oracle.connect(keeper).updateDroughtIndex(region, 50, 50, 50, 100)
    ).to.be.revertedWith("OracleConsumer: not keeper");

    // new keeper can update
    await expect(oracle.connect(other).updateDroughtIndex(region, 50, 50, 50, 100)).to.not.be.reverted;
  });

  it("keeper can update ftso registry address", async function () {
    const { keeper, other, oracle } = await deployFixture();

    await expect(oracle.connect(keeper).setFtsoRegistry(other.address))
      .to.emit(oracle, "FtsoRegistryUpdated")
      .withArgs(other.address);

    expect(await oracle.ftsoRegistry()).to.equal(other.address);
  });
});
