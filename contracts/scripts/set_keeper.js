const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const oracleAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const newKeeper = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const oracle = await hre.ethers.getContractAt("OracleConsumer", oracleAddress);
  
  const tx = await oracle.connect(deployer).setKeeper(newKeeper);
  await tx.wait();
  
  console.log("Keeper transferred to:", newKeeper);
}

main().catch(console.error);
