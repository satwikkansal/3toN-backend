// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import { 
    ISuperfluid 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import { 
    ISuperfluidToken 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluidToken.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import { 
    ISuperAgreement 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperAgreement.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import { 
    IConstantFlowAgreementV1 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import {
    CFAv1Library
} from "@superfluid-finance/ethereum-contracts/contracts/apps/CFAv1Library.sol";

import {IUnlockV11} from  "@unlock-protocol/contracts/dist/Unlock/IUnlockV11.sol";
import {IPublicLockV11} from  "@unlock-protocol/contracts/dist/PublicLock/IPublicLockV11.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";


contract ThreeToN {
    
    using CFAv1Library for CFAv1Library.InitData;
    CFAv1Library.InitData public cfaV1;
    IUnlockV11 unlockContract;

    mapping(string => uint) viewCounter;
    uint epochCounter; // ignore this, only for testing.

    struct StreamData {
        address owner;
        int96 rate; 
        address token;
        uint start_time;
        string sid;
        string stream_name;
        address lock_address;
        int256 owner_initial_balance;
        bool islive;
    }

    struct ParticipantData {
        address participant;
        string sid;
        int256 participant_initial_balance;
    }

    event StreamStarted(address indexed owner, int96 rate, address token, string streamId);
    event StreamStopped(address indexed owner, int256 earnings, string streamId);
    event StreamJoined(address indexed joinee, string streamId);

    mapping(string => StreamData) streams;
    mapping (string => mapping (address => ParticipantData)) participants;

    constructor(
        address hostAddress, address unlockFactoryAddress
    ) {
    
    unlockContract = IUnlockV11(unlockFactoryAddress);
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

    function updateCounter() external {
        epochCounter = epochCounter + 1;
    }

    function start(string memory sid, int96 rate, address token, string memory stream_name) external returns (uint) {
        // todo: assert EOA
        // todo: assert no existing stream, or better close existing stream if it exists

        address lockAdress = unlockContract.createLock(0, token, 0, 100000, sid, "");
        ISuperfluidToken tokenContract = ISuperfluidToken(token);
        (int256 availableBalance, uint d, uint o, uint timestamp) = tokenContract.realtimeBalanceOfNow(msg.sender);
        streams[sid] = StreamData(msg.sender, rate, token, block.timestamp, sid, stream_name, lockAdress, availableBalance, true);
        emit StreamStarted(msg.sender, rate, token, sid);
        return block.timestamp;
    }

    function stop(string memory sid) external returns (uint) {
        StreamData storage data = streams[sid];
        require(msg.sender == data.owner, "Only stream owner can stop the stream");
        data.islive = false;
        emit StreamStopped(msg.sender, 0, sid);
        // delete streams[sid]; // delete happens inside leaveStream method.
        return block.timestamp;
    }

    function isStreamLive(string memory sid) external view returns (bool) {
        StreamData memory data = streams[sid];
        return data.islive;
    }

    function getStreamData(string memory sid) external view returns (StreamData memory) {
        return streams[sid];
    }

    function getParticipantData(string memory sid, address participant_address) external view returns (ParticipantData memory) {
        return participants[sid][participant_address];
    }


    function join(string memory sid) external {
        // todo: assert if msg.sender has granted access control 
        StreamData memory data = streams[sid];
        cfaV1.createFlowByOperator(msg.sender, data.owner, ISuperfluidToken(data.token), data.rate, "0x");
        
        IPublicLockV11 publicLock = IPublicLockV11(data.lock_address);
        address[] memory addresses = new address[](1);
        addresses[0] = msg.sender;
        uint[] memory exps = new uint[](1);
        exps[0] = 1695383525;
        address[] memory keyManagers = new address[](1);
        keyManagers[0] = address(this);
        publicLock.grantKeys(addresses, exps, keyManagers);
        viewCounter[sid] += 1;

        ISuperfluidToken tokenContract = ISuperfluidToken(data.token);
        (int256 availableBalance, uint d, uint o, uint timestamp) = tokenContract.realtimeBalanceOfNow(msg.sender);
        participants[sid][msg.sender] = ParticipantData(msg.sender, sid, availableBalance);
    }

    function hasJoined(string memory sid, address paritcipant_address) external view returns (bool) {

        StreamData memory data = streams[sid];
        IPublicLockV11 publicLock = IPublicLockV11(data.lock_address);
        uint balance = publicLock.balanceOf(paritcipant_address);

        uint256 timestamp;
        int96 flowRate;
        uint256 deposit;
        uint256 owedDeposit;

        (timestamp, flowRate, deposit, owedDeposit) = cfaV1.cfa.getFlow(ISuperfluidToken(data.token), paritcipant_address, data.owner);
        return flowRate >= data.rate && balance > 0;
    }

    function numJoinees(string memory sid) external view returns (uint) {
        return viewCounter[sid];
    }

    function earningSoFar(string memory sid) external view returns (int256) {
        StreamData memory data = streams[sid];
        ISuperfluidToken token = ISuperfluidToken(data.token);
        (int256 availableBalanceNow, uint dNow, uint oNow, uint timestamp) = token.realtimeBalanceOfNow(data.owner);
        return availableBalanceNow - data.owner_initial_balance;
    }

    function expenditureSoFar(string memory sid, address participant_address) external view returns (int256) {
        StreamData memory data = streams[sid];
        ParticipantData memory pdata = participants[sid][participant_address];
        if (pdata.participant != address(0)) {
            ISuperfluidToken token = ISuperfluidToken(data.token);
            (int256 availableBalanceNow, uint dNow, uint oNow, uint timestamp) = token.realtimeBalanceOfNow(participant_address);
            return pdata.participant_initial_balance - availableBalanceNow;
        }
        return 0;
    }

    function leaveStream(string memory sid)  external returns (bool) {
        StreamData memory data = streams[sid];
        if (data.owner != address(0)) {
            cfaV1.deleteFlowByOperator(msg.sender, data.owner, ISuperfluidToken(data.token));
            viewCounter[sid] -= 1;
            delete participants[sid][msg.sender];
            if (viewCounter[sid] == 0 && data.islive == false) {
                // stream ended by the creator and the last participant left
                delete streams[sid];
            }
            return true;
        }
        return false;
    }
}
