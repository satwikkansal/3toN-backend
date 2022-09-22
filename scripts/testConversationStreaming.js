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
   console.log("private key is", privateKey);
   const wallet = new hre.ethers.Wallet(privateKey);
   const chatroom = await Client.create(wallet);
   
   let existingConversations = await chatroom.conversations.list();

   // This is inefficient, but will work for thousand messages easily
   while (true) {
    let allMessages = [];
    for (const conversation of existingConversations) {
        const messagesInConversation = await conversation.messages();
        allMessages = allMessages.concat(messagesInConversation);
    }
    allMessages.sort((a , b) => (a.sent.getTime() > b.sent.getTime() ? 1 : -1));
    // todo: sort
    console.log("All messages", allMessages.length);
    for (message of allMessages) {
      let messageString = `${message.sent} : ${message.senderAddress} : ${message.content}`;
      console.log(messageString);
    }
    existingConversations = await chatroom.conversations.list();
   }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
