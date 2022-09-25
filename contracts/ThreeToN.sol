// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

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


// import {ILockValidKeyHook} from "@unlock-protocol/contracts/dist/Hooks/ILockValidKeyHook.sol";

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
        uint256 lock_expiry;
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
    event StreamLeft(address indexed joinee, string streamId);

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

    function start(
            string memory sid, int96 rate, address token,
            string memory stream_name, uint256 maxParticipants, uint256 expiry) external returns (uint) {
        require(streams[sid].islive == false, "Stream already running");

        address lockAdress = unlockContract.createLock(expiry, token, 1, maxParticipants, sid, "0x");
        // address lockAdress = address(0);
        int256 availableBalance = getAvailableSuperBalance(token, msg.sender);
        streams[sid] = StreamData(msg.sender, rate, token, block.timestamp, sid, stream_name, lockAdress, expiry, availableBalance, true);
        emit StreamStarted(msg.sender, rate, token, sid);
        return block.timestamp;
    }

    function getAvailableSuperBalance(address tokenAddress, address account) internal view returns (int256) {
        ISuperfluidToken tokenContract = ISuperfluidToken(tokenAddress);
        (int256 availableBalance, uint d, uint o, uint timestamp) = tokenContract.realtimeBalanceOfNow(account);
        return availableBalance;
    }

    function stop(string memory sid) external returns (uint) {
        require(streams[sid].islive == true, "Stream already stopped");
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
        require(streams[sid].islive == true, "Stream is not live");
        require(participants[sid][msg.sender].participant == address(0), "Stream joined already");
        
        StreamData memory data = streams[sid];
        // int96 existingFlowRate = getExistingFlowRate(data.token, msg.sender, data.owner);
        // require(existingFlowRate == 0, "Existing flow there already");

        cfaV1.createFlowByOperator(msg.sender, data.owner, ISuperfluidToken(data.token), data.rate, "0x");
        
        IPublicLockV11 publicLock = IPublicLockV11(data.lock_address);
        address[] memory addresses = new address[](1);
        addresses[0] = msg.sender;
        uint[] memory exps = new uint[](1);
        exps[0] = data.lock_expiry > block.timestamp ? data.lock_expiry : 1695383525;
        address[] memory keyManagers = new address[](1);
        keyManagers[0] = address(this);
        publicLock.grantKeys(addresses, exps, keyManagers);

        viewCounter[sid] += 1;

        ISuperfluidToken tokenContract = ISuperfluidToken(data.token);
        (int256 availableBalance, uint d, uint o, uint timestamp) = tokenContract.realtimeBalanceOfNow(msg.sender);
        participants[sid][msg.sender] = ParticipantData(msg.sender, sid, availableBalance);
    }

    function getExistingFlowRate(address token, address from, address to) internal view returns (int96) {
        uint256 timestamp;
        int96 flowRate;
        uint256 deposit;
        uint256 owedDeposit;

        (timestamp, flowRate, deposit, owedDeposit) = cfaV1.cfa.getFlow(ISuperfluidToken(token), from, to);
    }

    function hasJoined(string memory sid, address paritcipant_address) external view returns (bool) {
        bool participantExists = participants[sid][paritcipant_address].participant == paritcipant_address;
        
        StreamData memory data = streams[sid];
        IPublicLockV11 publicLock = IPublicLockV11(data.lock_address);
        uint balance = publicLock.balanceOf(paritcipant_address);

        int96 flowRate = getExistingFlowRate(data.token, paritcipant_address, data.owner);
        return participantExists && flowRate >= data.rate && balance > 0;
    }

    function numJoinees(string memory sid) external view returns (uint) {
        return viewCounter[sid];
    }

    function earningSoFar(string memory sid) external view returns (int256) {
        StreamData memory data = streams[sid];
        int256 availableBalanceNow = getAvailableSuperBalance(data.token, data.owner);
        return availableBalanceNow - data.owner_initial_balance;
    }

    function expenditureSoFar(string memory sid, address participant_address) external view returns (int256) {
        StreamData memory data = streams[sid];
        ParticipantData memory pdata = participants[sid][participant_address];
        if (pdata.participant != address(0)) {
            int256 availableBalanceNow = getAvailableSuperBalance(data.token, participant_address);
            return pdata.participant_initial_balance - availableBalanceNow;
        }
        return 0;
    }

    function leaveStream(string memory sid)  external returns (bool) {
        StreamData memory data = streams[sid];
        require(data.owner != address(0), "Stream does not exist");
        require(participants[sid][msg.sender].participant == msg.sender, "Stream not joined already");
        
        // burn the access keys
        IPublicLockV11 publicLock = IPublicLockV11(data.lock_address);
        uint256 keyId = publicLock.tokenOfOwnerByIndex(msg.sender, 0); 
        publicLock.burn(keyId);

        // stop the payment stream
        cfaV1.deleteFlowByOperator(msg.sender, data.owner, ISuperfluidToken(data.token));
            viewCounter[sid] -= 1;
            delete participants[sid][msg.sender];
            if (viewCounter[sid] == 0 && data.islive == false) {
                // stream ended by the creator and the last participant left
                delete streams[sid];
            }
            emit StreamLeft(msg.sender, sid);
            return true;
        }
}

// Needed for Custom Unlock hooks, would be useful in case we use unlock's paywall
// library to do the frontend gating.

// interface StreamAccessChecker {
//      function hasJoined(string memory sid, address paritcipant_address) external view returns (bool); 
// }


// contract StreamAccessHook is ILockValidKeyHook {
//     string stream_id;
//     StreamAccessChecker accessChecker;

//     constructor (string memory sid) {
//         // the calling contract should implement the interface
//         accessChecker = StreamAccessChecker(msg.sender);
//         stream_id = sid;
//     }

//     function hasValidKey(address _lockAddress, address _keyOwner, uint256, // _expirationTimestamp, 
//                          bool isValidKey) external view returns (bool) {
//         if (isValidKey) return true;
//         return accessChecker.hasJoined(stream_id, _keyOwner);
//     }
// }

