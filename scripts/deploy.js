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

  const contract = await Contract.deploy(hostAddressGoerli);

  await contract.deployed();

  console.log(
    `Deployed to ${contract.address}`
  );

  const fDaiXAddress = "0xF2d68898557cCb2Cf4C10c3Ef2B034b2a69DAD00";
 
  const participant_1_signer = new hre.ethers.Wallet(
    process.env.PRIVATE_KEY_2,
    hre.ethers.provider
  );

  const participant_2_signer = new hre.ethers.Wallet(
    process.env.PRIVATE_KEY_3,
    hre.ethers.provider
  );
  
  let streamId = "someid";
  let rate = 10 ^ 10;
  
  // start stream 
  let startTxn = await contract.start(streamId, rate, fDaiXAddress);
  let startTxnReceipt = await startTxn.wait();

  console.log(`Start stream: ${JSON.stringify(startTxnReceipt)}`);

  let isLive = await contract.isStreamLive(streamId);
  let streamData = await contract.getStreamData(streamId);

  console.log(`Is live: ${isLive}. StreamData is ${streamData}`);

  // Participant 1 has to join the stream now

  // but first we have to make sure they have the stream token.
  let streamPaymentToken = await hre.ethers.getContractAt("IERC20", fDaiXAddress);
  let streamPaymentTokenName = streamPaymentToken.name;
  let participant1_balance = await streamPaymentToken.balanceOf(participant_1_signer.address);
  let participant2_balance = await streamPaymentToken.balanceOf(participant_2_signer.address);

  // todo: test it with non hardhat accounts
  console.log(`Participant 1 ${participant_1_signer.address} has ${participant1_balance} ${streamPaymentTokenName} tokens`);
  console.log(`Participant 2 ${participant_2_signer.address} has ${participant2_balance} tokens`)
 
  // todo: if the balance is zero, we check which asset is wrapped, and check its balance
  // if the wrapped asset balance exists we add an approve + upgrade operation

  // next we use superfluid sdk-core to allow operator permission to our smart contract to 
  // allow flow. Ofc we first have to check if it already exists, if it  does then we do nothing.

  // next we need to call join function, which'd create flow on operators behalf

  // next calling hasJoined should return true

  //
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
