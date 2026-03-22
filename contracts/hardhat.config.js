require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

task("fast-forward", "Fast forwards the local blockchain by X days to simulate a payout period")
  .addOptionalParam("days", "Number of days to fast forward", "15")
  .setAction(async (taskArgs, hre) => {
    const helpers = require("@nomicfoundation/hardhat-network-helpers");
    const daysStr = taskArgs.days;
    // ensure it's a valid number
    const daysToAdvance = parseInt(daysStr, 10);
    
    if (isNaN(daysToAdvance)) {
      console.error("Please provide a valid number of days");
      return;
    }

    const seconds = daysToAdvance * 24 * 60 * 60;
    
    console.log(`⏩ Fast-forwarding local blockchain by ${daysToAdvance} days (${seconds} seconds)...`);
    await helpers.time.increase(seconds);
    
    // Mine a new block to ensure the timestamp is cemented
    await helpers.mine();
    
    const latestTime = await helpers.time.latest();
    console.log(`✅ Success! New blockchain timestamp is: ${new Date(latestTime * 1000).toLocaleString()}`);
  });

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun"
    }
  },
  networks: {
    hardhat: {},
    fuji: {
      url: process.env.AVALANCHE_TESTNET_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 43113
    },
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 43114
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  }
};

module.exports = config;
