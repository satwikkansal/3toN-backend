require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config()


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      forking: {
          url: process.env.GOERLI_RPC,
          gas: 21000000,
        },
        gas: 21000000,
    },
    mumbai: {
      url: process.env.MUMBAI_RPC,
      accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2, process.env.PRIVATE_KEY_3],
      gas: 2100000,
    },
    goerli: {
      url: process.env.GOERLI_RPC,
      accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2, process.env.PRIVATE_KEY_3],
      gas: 2100000,
    },
    polygon: {
      url: process.env.POLYGON_RPC,
      accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2, process.env.PRIVATE_KEY_3],
      gas: 2100000,
    },
    optimism: {
      url: process.env.OPTIMISM_RPC,
      accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2, process.env.PRIVATE_KEY_3],
      gas: 2100000,
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
};
