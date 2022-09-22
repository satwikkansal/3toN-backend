// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  
  const Contract = await hre.ethers.getContractFactory("ThreeToN");
  const hostAddressMumbai = "0xEB796bdb90fFA0f28255275e16936D25d3418603";
  const cfaAddressMumbai = "0x49e565Ed1bdc17F3d220f72DF0857C26FA83F873";
  const hostAddressGoerli = "0x22ff293e14F1EC3A09B137e9e06084AFd63adDF9"
  const unlockAddressGoerli = "0x893F6B2A4A8CebeEDE4f1DeECDc39Bb7023DB902";

  const contract = await Contract.deploy(hostAddressGoerli, unlockAddressGoerli);

  await contract.deployed();

  console.log(
    `Deployed to ${contract.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
