// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { Client } = require("@xmtp/xmtp-js"); 

async function main() {
   const stream_id = "b3670kute70rw0up";
   const privateKey = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(stream_id));
   const chatroomWallet = new hre.ethers.Wallet(privateKey);
   const chatroomAddress = await chatroomWallet.getAddress();

   const userWallet = new hre.ethers.Wallet.createRandom();
   const userClient = await Client.create(userWallet);
   const userAddress = await userWallet.getAddress();
   console.log("User's address is", userAddress);
   
   const conversation = await userClient.conversations.newConversation(chatroomAddress);
   await conversation.send(`New message attempt from ${userAddress}`);
   await conversation.send(`One nmore message attempt from ${userAddress}`);
   await conversation.send(`Last message attempt from ${userAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
