// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { DAOGovernor } from "../src/governance/DAOGovernor.sol";

/// @title Set Proposal Guardian Script
/// @notice Sets the SecurityCouncil as the proposal guardian on DAOGovernor
/// @dev Run with: forge script script/SetProposalGuardian.s.sol:SetProposalGuardianScript --rpc-url $RPC_URL_SEPOLIA --broadcast -vvv
contract SetProposalGuardianScript is Script {
    // Sepolia addresses (from contracts.ts)
    address constant DAO_GOVERNOR = 0xdE3CEC4ABF6b3805D05A2fEf9554845EE9F5c5d8;
    address constant SECURITY_COUNCIL = 0xEe3eCf875c3d8f6b6a769414f6f7132B0DCdb86d;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("DAOGovernor:", DAO_GOVERNOR);
        console.log("SecurityCouncil:", SECURITY_COUNCIL);

        DAOGovernor governor = DAOGovernor(payable(DAO_GOVERNOR));

        // Check current proposal guardian
        address currentGuardian = governor.proposalGuardian();
        console.log("Current proposalGuardian:", currentGuardian);

        // Check owner
        address owner = governor.owner();
        console.log("DAOGovernor owner:", owner);

        if (currentGuardian == SECURITY_COUNCIL) {
            console.log("SecurityCouncil is already set as proposalGuardian");
            return;
        }

        vm.startBroadcast(deployerPrivateKey);

        // Set SecurityCouncil as proposal guardian
        governor.setProposalGuardian(SECURITY_COUNCIL);

        vm.stopBroadcast();

        // Verify
        address newGuardian = governor.proposalGuardian();
        console.log("New proposalGuardian:", newGuardian);
        console.log("Success:", newGuardian == SECURITY_COUNCIL);
    }
}
