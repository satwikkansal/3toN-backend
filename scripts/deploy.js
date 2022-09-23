// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { network } = require("hardhat");
const hre = require("hardhat");
const {networks} = require("./networkConfig.js");

async function main() {
  const network = "goerli";
  const Contract = await hre.ethers.getContractFactory("ThreeToN");
  const contract = await Contract.deploy(networks[network]["hostAddress"], networks[network]["unlockAddress"]);

  await contract.deployed();

  console.log(`Deployed to ${contract.address} on ${network} network` );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
