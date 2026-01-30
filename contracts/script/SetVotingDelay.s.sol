// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DAOGovernor} from "../src/governance/DAOGovernor.sol";

contract SetVotingDelayScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address governorAddress = vm.envAddress("DAO_GOVERNOR_ADDRESS");
        uint256 newDelay = vm.envOr("VOTING_DELAY", uint256(0));

        DAOGovernor governor = DAOGovernor(payable(governorAddress));

        console.log("DAOGovernor address:", governorAddress);
        console.log("Current voting delay:", governor.votingDelay());
        console.log("New voting delay:", newDelay);

        vm.startBroadcast(deployerPrivateKey);
        governor.setVotingDelay(newDelay);
        vm.stopBroadcast();

        console.log("Voting delay updated successfully!");
        console.log("New voting delay:", governor.votingDelay());
    }
}
