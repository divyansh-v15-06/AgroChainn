const hre = require("hardhat");

async function main() {
  const oracleAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const OracleConsumer = await hre.ethers.getContractAt("OracleConsumer", oracleAddress);

  console.log("Seeding OracleConsumer with initial data for 'AR-CBA'...");
  const regionCode = hre.ethers.encodeBytes32String("AR-CBA");
  const tx = await OracleConsumer.updateDroughtIndex(regionCode, 50, 50, 50, 100);
  await tx.wait();
  console.log("Oracle seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
