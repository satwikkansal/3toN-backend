// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import { 
    ISuperfluid 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import { 
    ISuperfluidToken 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluidToken.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";


import { 
    IConstantFlowAgreementV1 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {
    CFAv1Library
} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";


// Uncomment this line to use console.log
// import "hardhat/console.sol";


contract ThreeToN {
    
    using CFAv1Library for CFAv1Library.InitData;
    CFAv1Library.InitData public cfaV1;

    struct StreamData {
        address owner;
        int96 rate; 
        address token;
        uint start_time;
        string sid;
    }

    event StreamStarted(address owner, int96 rate, address token, string streamId);
    event StreamStopped(address owner, int256 earnings, string streamId);

    mapping(string => StreamData) streams;

    constructor(
        address hostAddress
    ) {
    
    ISuperfluid host = ISuperfluid(hostAddress);
    //initialize InitData struct, and set equal to cfaV1
    cfaV1 = CFAv1Library.InitData(
        host,
        //here, we are deriving the address of the CFA using the host contract
        IConstantFlowAgreementV1(
            address(host.getAgreementClass(
                    keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1")
                ))
            )
        );
    }

    function start(string memory sid, int96 rate, address token) external returns (uint) {
        // todo: assert EOA
        // todo: assert no existing stream, or better close existing stream if it exists
        streams[sid] = StreamData(msg.sender, rate, token, block.timestamp, sid);
        emit StreamStarted(msg.sender, rate, token, sid);
        return block.timestamp;
    }

    function stop(string memory sid) external returns (uint) {
        StreamData memory data = streams[sid];
        require(msg.sender == data.owner, "Only stream owner can stop the stream");
        // todo: add logic for earnings
        emit StreamStopped(msg.sender, 0, sid);
        delete streams[sid];
        return block.timestamp;
    }

    function isStreamLive(string memory sid) external view returns (bool) {
        StreamData memory data = streams[sid];
        return data.owner != address(0);
    }

    function getStreamData(string memory sid) external view returns (StreamData memory) {
        return streams[sid];
    }

    function join(string memory sid) external {
        // todo: assert if msg.sender has granted access control 
        StreamData memory data = streams[sid];
        cfaV1.createFlowByOperator(msg.sender, data.owner, ISuperfluidToken(data.token), data.rate, "0x");
    }

    function hasJoined(string memory sid, address paritcipant_address) external view returns (bool) {

        StreamData memory data = streams[sid];

        uint256 timestamp;
        int96 flowRate;
        uint256 deposit;
        uint256 owedDeposit;

        (timestamp, flowRate, deposit, owedDeposit) = cfaV1.cfa.getFlow(ISuperfluidToken(data.token), paritcipant_address, data.owner);
        return flowRate >= data.rate;
    }

    function earningSoFar(string memory sid) external view returns (int256) {
        StreamData memory data = streams[sid];
        ISuperfluidToken token = ISuperfluidToken(data.token);
        (int256 availableBalance, uint d, uint o) = token.realtimeBalanceOf(data.owner, data.start_time);
        (int256 availableBalanceNow, uint dNow, uint oNow, uint timestamp) = token.realtimeBalanceOfNow(data.owner);
        return availableBalanceNow - availableBalance;
    }
}
