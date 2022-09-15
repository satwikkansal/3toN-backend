// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


async function main() {

  const Host = await hre.ethers.getContractFactory("ISuperfluid");

  const goerliHost = "0x22ff293e14F1EC3A09B137e9e06084AFd63adDF9";
  const goerliCfa = "0xEd6BcbF6907D4feEEe8a8875543249bEa9D308E8";
  const goerlifdaiX = "0xF2d68898557cCb2Cf4C10c3Ef2B034b2a69DAD00";

  const host = await Contract.attach(goerliHost);

  const participant_1_signer = new hre.ethers.Wallet(
    process.env.PRIVATE_KEY_2,
    hre.ethers.provider
  );

  const participant_2_signer = new hre.ethers.Wallet(
    process.env.PRIVATE_KEY_3,
    hre.ethers.provider
  );

  // testing createFlow first
  

  //   const stream_id = "mystream";  
  //   const startReceipt = await contract.start(stream_id, 10000000, goerlifdaiX);
  //   console.log(`Start Txn created ${JSON.stringify(startReceipt, null, 4)}`);

  

//   const joinReceipt = await contract.connect(participant_1_signer).join(stream_id);

//   console.log(`Join Txn created ${JSON.stringify(joinReceipt, null, 4)}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
