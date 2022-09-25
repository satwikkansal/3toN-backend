// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { Framework } = require("@superfluid-finance/sdk-core");
const { BigNumber } = require("ethers");
const { networks } = require("./networkConfig.js");


// todo; create it properly with network addresses being easier to manage.
// todo; test on matic.
// todo; test on optimism.

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

async function main() {
  const Contract = await hre.ethers.getContractFactory("ThreeToN");
  let network = "goerli";
  let hostAddress = networks[network]['hostAddress'];
  let unlockAddress = networks[network]['unlockAddress'];
  let daiXAddress = networks[network]['daiXAddress'];
  let usdcXAddress = networks[network]['usdcXAddress'];
  let daiFaucet = networks[network]['daiFaucet'];
  let daiXfaucet = networks[network]['daiXfaucet'];

  const contract = await Contract.deploy(hostAddress, unlockAddress);
  await contract.deployed();

  console.log(
    `Deployed to ${contract.address}`
  );

  const participant_1_signer = await hre.ethers.getImpersonatedSigner(networks[network]["randomAddress1"]);
  const participant_2_signer = await hre.ethers.getImpersonatedSigner(networks[network]["randomAddress2"]);
  
  const faucet_signer = await hre.ethers.getImpersonatedSigner(daiFaucet);
  // const super_faucet_signer = await hre.ethers.getImpersonatedSigner(daiXfaucet);

  let streamId = "someid";
  let streamName = "My stream rocks";
  let rate = 10 ** 10;
  
  // start stream 
  let startTxn = await contract.start(streamId, rate, daiXAddress, streamName, 1000, 0);
  let startTxnReceipt = await startTxn.wait();

  console.log(`Stream ${streamId} started}`);

  let isLive = await contract.isStreamLive(streamId);
  let streamData = await contract.getStreamData(streamId);

  console.log(`Is live: ${isLive}. StreamData is ${streamData}`);

  // Participant 1 has to join the stream now
  // but first we have to make sure they have the stream token.
  let streamPaymentToken = await hre.ethers.getContractAt("ISuperToken", daiXAddress);

  let streamPaymentTokenName = await streamPaymentToken.name();
  let participant1_balance = await streamPaymentToken.balanceOf(participant_1_signer.address);
  let participant2_balance = await streamPaymentToken.balanceOf(participant_2_signer.address);

  // todo: test it with non hardhat accounts
  console.log(`Participant 1 ${participant_1_signer.address} has ${participant1_balance} ${streamPaymentTokenName} tokens`);
  console.log(`Participant 2 ${participant_2_signer.address} has ${participant2_balance} ${streamPaymentTokenName} tokens`)
  
  // the superfluid object
  const sf  = await Framework.create({
    chainId: 31337, // todo: fix this
    provider: hre.ethers.provider,
    resolverAddress: networks[network]["superfluidResolver"] // only needed to pass for local chain
  })

  // todo: if the balance is zero, we check which asset is wrapped, and check its balance
  // if the wrapped asset balance exists we add an approve + upgrade operation
  if (participant1_balance == 0) {
    console.log(`Participant 1 has zero balance of superTokens, checking if it has underlying tokens to be upgraded.`)
    let underlyingTokenAddress = await streamPaymentToken.getUnderlyingToken();
    let underlyingToken = await hre.ethers.getContractAt("IERC20", underlyingTokenAddress);
    let underlyingTokenName = underlyingToken.name;

    // todo: comment out later
    let txn = await underlyingToken.connect(faucet_signer).transfer(participant_1_signer.address, BigNumber.from(10).pow(19));
    let txnReceipt = await txn.wait();

    let underlyingTokenBalance = await underlyingToken.balanceOf(participant_1_signer.address);
    if (underlyingTokenBalance == 0) {
      console.log(`Please top up ${underlyingTokenName} or ${streamPaymentTokenName}`);
    } else {
      console.log(`Participant 1 ${participant_1_signer.address} has ${underlyingTokenBalance} ${underlyingTokenName} tokens. Time to upgrade.`);
      // time to convert some tokens
      // first need to check if the address has already given the one time approval
      let allowance = await underlyingToken.allowance(participant_1_signer.address, streamPaymentToken.address);
      console.log(`Participant 1 has approved allowance of ${allowance} ${underlyingTokenName} to ${streamPaymentTokenName}`);
      if (allowance == 0) {
        // Giving superToken the permission to spend
        let approvalTxn = await underlyingToken.connect(participant_1_signer).approve(streamPaymentToken.address, underlyingTokenBalance);
        await approvalTxn.wait();
        let allowanceNew = await underlyingToken.allowance(participant_1_signer.address, streamPaymentToken.address);
        console.log(`Allowance update to ${allowanceNew} ${underlyingTokenName}`);
      }

      console.log(`Calling upgrade to get super tokens`)
      // now we need to upgrade
      let upgradeTxn = await streamPaymentToken.connect(participant_1_signer).upgrade(underlyingTokenBalance);
      let upgradeTxnReceipt = await upgradeTxn.wait();
    }
  }

  participant1_balance = await streamPaymentToken.balanceOf(participant_1_signer.address);
  console.log(`Participant 1 ${participant_1_signer.address} now has ${participant1_balance} ${streamPaymentTokenName} tokens`);
 

  // we do similar for participant 2
  // ...

  //  now that we're pretty sure SuperToken balance exists, we can prepeare join


  // next we use superfluid sdk-core to allow operator permission to our smart contract to 
  // allow flow. Ofc we first have to check if it already exists, if it  does then we do nothing.

  let flowOperatorData = await sf.cfaV1.getFlowOperatorData(
    {superToken: daiXAddress, sender: participant_1_signer.address, flowOperator: contract.address,
      providerOrSigner: hre.ethers.provider
    });

  if (flowOperatorData.flowRateAllowance < streamData.rate) {
    console.log(`Enough Operator permissions don't exist for participant 1. Getting them`)
    let updateFlowOperatorOperation = await sf.cfaV1.updateFlowOperatorPermissions({
      flowOperator: contract.address,
      permissions: 5, // create or delete
      flowRateAllowance: 3858024691358020, // 1k per month, todo: https://docs.superfluid.finance/superfluid/developers/solidity-examples/cfa-access-control-list-acl#flow-rate-allowance
      superToken: streamPaymentToken.address
    });
    let txn = await updateFlowOperatorOperation.exec(participant_1_signer);
    let txnReceipt = await txn.wait();

    let flowOperatorData = await sf.cfaV1.getFlowOperatorData(
      {superToken: daiXAddress, sender: participant_1_signer.address, flowOperator: contract.address,
        providerOrSigner: hre.ethers.provider
      });
  
    let operatorPermissionsExist = flowOperatorData.flowRateAllowance < streamData.rate;
    console.log(`Granted ACL to ${contract.address}: ${operatorPermissionsExist}`);
  };

  let hasJoined = await contract.hasJoined(streamId, participant_1_signer.address);
  console.log(`Has joined participant 1? ${hasJoined}. Calling join next`);
  let earnings = await contract.earningSoFar(streamId);
  console.log(`Earnings so far are ${earnings}`);

  async function super_balance(token, address, label="", log=true) {
    let balance_static = await token.balanceOf(address);
    let balance_realtime, deposit, owedDeposit, timestamp;
    [balance_realtime, deposit, owedDeposit, timestamp] = await token.realtimeBalanceOfNow(address);

    let total_balance = balance_static.add(balance_realtime);

    let obj = {
      'static': balance_static.toString(),
      'realtime': balance_realtime.toString()
    };

    if (log) {
      console.log(`${label} @ ${timestamp} balance is ${JSON.stringify(obj, null, 2)}`);
    }

    return balance_realtime;
  }

  await super_balance(streamPaymentToken, streamData.owner, label="owner");

  let expenditure_1 = await contract.expenditureSoFar(streamId, participant_1_signer.address);
  console.log(`Participant 1 expenditure so far is ${expenditure_1} ${streamPaymentTokenName}`);

  let numJoinees = await contract.numJoinees(streamId);
  console.log(`Number of joinees so far are ${numJoinees}`);

  // next we need to call join function, which'd create flow on operators behalf
  let joinTxn = await contract.connect(participant_1_signer).join(streamId);
  let joinTxnReceipt = await joinTxn.wait();

  hasJoined = await contract.hasJoined(streamId, participant_1_signer.address);
  let participant1data = await contract.getParticipantData(streamId, participant_1_signer.address);
  console.log(`Has joined participant 1? ${hasJoined}. Data is ${participant1data}`);

  i = 0;

  while (i < 5) {
    earnings = await contract.earningSoFar(streamId);
    console.log(`Earnings so far are ${earnings}`);
    await super_balance(streamPaymentToken, streamData.owner, label="owner");
    await super_balance(streamPaymentToken, participant_1_signer.address, label="participant 1");
    let expenditure_1 = await contract.expenditureSoFar(streamId, participant_1_signer.address);
    console.log(`Participant 1 expenditure so far is ${expenditure_1} ${streamPaymentTokenName}`);
    let numJoinees = await contract.numJoinees(streamId);
    console.log(`Number of joinees so far are ${numJoinees}`);
    let txn = await contract.updateCounter();
    await txn.wait();
    await sleep(10000);
    i += 1;
  }

  let leaveTxn = await contract.connect(participant_1_signer).leaveStream(streamId);
  await leaveTxn.wait();

  hasJoined = await contract.hasJoined(streamId, participant_1_signer.address);
  console.log(`Participant 1 left: ${!hasJoined}`);

  // can join after leaving
  joinTxn = await contract.connect(participant_1_signer).join(streamId);
  joinTxnReceipt = await joinTxn.wait();

  hasJoined = await contract.hasJoined(streamId, participant_1_signer.address);
  console.log(`Participant 1 joined again: ${hasJoined}`);

  // leave finally
  leaveTxn = await contract.connect(participant_1_signer).leaveStream(streamId);
  leaveTxn.wait();

  while (i < 10) {
    earnings = await contract.earningSoFar(streamId);
    console.log(`Earnings so far are ${earnings}`);
    await super_balance(streamPaymentToken, streamData.owner, label="owner");
    await super_balance(streamPaymentToken, participant_1_signer.address, label="participant 1");
    let expenditure_1 = await contract.expenditureSoFar(streamId, participant_1_signer.address);
    console.log(`Participant 1 expenditure so far is ${expenditure_1} ${streamPaymentTokenName}`);
    let numJoinees = await contract.numJoinees(streamId);
    console.log(`Number of joinees so far are ${numJoinees}`);
    let txn = await contract.updateCounter();
    await txn.wait();
    await sleep(10000);
    i += 1;
  }

  // make participant 2 join, have it join without upgrade
  // check if balances are growing correctly

  // make participant 1 stop
  // check if participant 1 stream stopped

  // make the owner stop
  // check if participant 2 stream also stopped
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
