// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import { ISuperfluid } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

import { IConstantFlowAgreementV1 } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";

import { IInstantDistributionAgreementV1 } from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IInstantDistributionAgreementV1.sol";

import { 
    ISuperfluidToken 
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluidToken.sol"; //"@superfluid-finance/ethereum-monorepo/packages/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";


// Uncomment this line to use console.log
// import "hardhat/console.sol";


contract ThreeToNRaw {
    
    struct StreamData {
        address owner;
        uint rate; 
        ISuperfluidToken token;
    }

    // todo: use bytes instead of string?
    mapping(string => StreamData) streams;

    ISuperfluid host;
    IConstantFlowAgreementV1 cfa;

    constructor (address hostAdress, address cfaAddress) {
        host = ISuperfluid(hostAdress);
        cfa = IConstantFlowAgreementV1(cfaAddress);
    }

    function start(string memory sid, uint rate, ISuperfluidToken token) external {
        // todo: assert EOA
        // todo: assert no existing stream, or better close existing stream if it exists
        streams[sid] = StreamData(msg.sender, rate, token);
    }

    function join(string memory sid) external {
        StreamData memory data = streams[sid];
        // cfaV1.authorizeFlowOperatorWithFullControl(address(this), data.token);
        // cfaV1.createFlowByOperator(msg.sender, data.owner, data.token, data.rate);

        host.callAgreement(
            cfa,
            abi.encodeWithSelector(
                cfa.authorizeFlowOperatorWithFullControl.selector,
                address(this),
                data.token,
                new bytes(0)
            ),
            "0x"
        );

        host.callAgreement(
            cfa,
            abi.encodeWithSelector(
                cfa.createFlow.selector,
                data.token,
                data.owner,
                data.rate,
                new bytes(0)
            ),
            "0x"
        );
    }

    function hasJoined(string memory sid) external view returns (bool) {

        StreamData memory data = streams[sid];

        uint256 timestamp;
        int96 flowRate;
        uint256 deposit;
        uint256 owedDeposit;


        // (timestamp, flowRate, deposit, owedDeposit) = cfaV1.getFlow(data.token, msg.sender, data.owner);
        // return flowRate >= data.rate;
        return true;
    }
}
