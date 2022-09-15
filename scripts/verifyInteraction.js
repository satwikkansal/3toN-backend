// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");


async function main() {

  const Contract = await hre.ethers.getContractFactory("ThreeToN");

  const contract = await Contract.attach("0xC30163Da03FcB887085935951E8D4697D62f1903");

  const fDaiXAddress = "0xF2d68898557cCb2Cf4C10c3Ef2B034b2a69DAD00";
 
  const participant_1_signer = new hre.ethers.Wallet(
    process.env.PRIVATE_KEY_2,
    hre.ethers.provider
  );

  const stream_id = "mystream";

  const startReceipt = await contract.start(stream_id, 10000000, fDaiXAddress);
  console.log(`Start Txn created ${JSON.stringify(startReceipt, null, 4)}`);

  const joinTxn = await contract.connect(participant_1_signer).join(stream_id);
  const joinReceipt = await joinTxn.wait();
  console.log(`Join Txn created ${JSON.stringify(joinReceipt, null, 4)}`);

  const hasJoined = await contract.connect(participant_1_signer).hasJoined(stream_id);
  console.log(`Has joined ${hasJoined}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
