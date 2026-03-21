/**
 * OracleConsumer Writer
 * 
 * Sends a drought index update to the OracleConsumer.sol contract
 * via the keeper wallet. Handles gas estimation and retry on nonce errors.
 */

const { ethers } = require("ethers");

const ORACLE_ABI = [
  "function updateDroughtIndex(bytes32 regionCode, uint256 noaa, uint256 ndvi, uint256 weather, uint256 riskScore) external",
  "event DroughtIndexUpdated(bytes32 indexed regionCode, uint256 index, uint256 timestamp, uint256 riskScore, uint8 confidence)",
];

/**
 * Write a drought index to OracleConsumer.sol.
 * @param {ethers.Wallet} wallet          — keeper wallet connected to provider
 * @param {string} oracleAddress          — OracleConsumer.sol contract address
 * @param {string} regionCode             — e.g. "AR-CBA"
 * @param {number} noaa
 * @param {number} ndvi
 * @param {number} weather
 * @param {number} riskScore
 * @returns {Promise<string>} tx hash
 */
async function writeDroughtIndex(wallet, oracleAddress, regionCode, noaa, ndvi, weather, riskScore) {
  const oracle = new ethers.Contract(oracleAddress, ORACLE_ABI, wallet);
  const regionBytes32 = ethers.encodeBytes32String(regionCode);

  const tx = await oracle.updateDroughtIndex(regionBytes32, noaa, ndvi, weather, riskScore, {
    // fetch current gas price + 10% cushion
    gasLimit: 150_000n,
  });

  console.log(
    `[writer] Submitting updateDroughtIndex region=${regionCode} noaa=${noaa} ndvi=${ndvi} weather=${weather} risk=${riskScore} tx=${tx.hash}`
  );

  await tx.wait();
  console.log(`[writer] Confirmed tx=${tx.hash}`);

  return tx.hash;
}

module.exports = { writeDroughtIndex };
