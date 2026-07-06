// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
// Import all V1 mocks
import {MockDAOCommitteeProxy} from "../src/migration/MockDAOCommitteeProxy.sol";
import {MockDAOAgendaManager} from "../src/migration/MockDAOAgendaManager.sol";
import {MockDAOVault} from "../src/migration/MockDAOVault.sol";
import {MockCandidateFactory} from "../src/migration/MockCandidateFactory.sol";
import {MockSeigManager} from "../src/migration/MockSeigManager.sol";
import {IMigrationEvents} from "../src/migration/IMigrationEvents.sol";
// Import V2 contracts
import {vTON} from "../src/token/vTON.sol";
import {DelegateRegistry} from "../src/governance/DelegateRegistry.sol";
import {DAOGovernor} from "../src/governance/DAOGovernor.sol";
import {SecurityCouncil} from "../src/governance/SecurityCouncil.sol";
import {Timelock} from "../src/governance/Timelock.sol";
// Reuse MockTON from Deploy.s.sol
import {MockTON} from "./Deploy.s.sol";

/// @title MigrationSimulationScript
/// @notice Simulates the full Tokamak DAO V1 -> V2 migration lifecycle
/// @dev Run with: forge script script/MigrationSimulation.s.sol:MigrationSimulationScript --broadcast -vvvv
contract MigrationSimulationScript is Script, IMigrationEvents {
    // Test accounts (same as existing local config)
    address constant TEST_ACCOUNT_1 = 0x488f3660FCD32099F2A250633822a6fbF6Eb771B;
    address constant TEST_ACCOUNT_2 = 0x31b4873B1730D924124A8118bbA84eE5672BE446;

    // V1 contracts
    MockTON public ton;
    MockDAOCommitteeProxy public daoCommitteeProxy;
    MockDAOAgendaManager public daoAgendaManager;
    MockDAOVault public daoVault;
    MockCandidateFactory public candidateFactory;
    MockSeigManager public seigManager;

    // V2 contracts
    vTON public vton;
    DelegateRegistry public delegateRegistry;
    Timelock public timelock;
    DAOGovernor public governor;
    SecurityCouncil public securityCouncil;

    function run() public {
        vm.startBroadcast();
        address deployer = msg.sender;

        _phase0DeployV1(deployer);
        _phase1DeployV2(deployer);
        _phase2Configure(deployer);
        _phase3Transition(deployer);
        _phase4DeprecateV1(deployer);

        vm.stopBroadcast();

        _logFinalState();
    }

    /*//////////////////////////////////////////////////////////////
                        PHASE 0: DEPLOY V1 (PRE-MIGRATION)
    //////////////////////////////////////////////////////////////*/

    function _phase0DeployV1(address deployer) internal {
        emit MigrationPhaseStarted(0, "V1 Deploy");
        console.log("\n=== Phase 0: Deploy V1 Contracts ===");

        // Step 1: Deploy MockTON (constructor mints 1M to deployer)
        ton = new MockTON();
        emit MigrationStep(0, 1, "Deploy MockTON", address(ton));
        console.log("  [0-1] MockTON deployed at:", address(ton));
        console.log("        Deployer TON balance:", ton.balanceOf(deployer) / 1 ether, "TON");

        // Step 2: Deploy MockDAOVault
        daoVault = new MockDAOVault(deployer, address(ton));
        emit MigrationStep(0, 2, "Deploy MockDAOVault", address(daoVault));
        console.log("  [0-2] MockDAOVault deployed at:", address(daoVault));

        // Step 3: Deploy MockDAOCommitteeProxy
        daoCommitteeProxy = new MockDAOCommitteeProxy(deployer, address(daoVault));
        emit MigrationStep(0, 3, "Deploy MockDAOCommitteeProxy", address(daoCommitteeProxy));
        console.log("  [0-3] MockDAOCommitteeProxy deployed at:", address(daoCommitteeProxy));

        // Step 4: Deploy MockDAOAgendaManager
        daoAgendaManager = new MockDAOAgendaManager(address(daoCommitteeProxy));
        emit MigrationStep(0, 4, "Deploy MockDAOAgendaManager", address(daoAgendaManager));
        console.log("  [0-4] MockDAOAgendaManager deployed at:", address(daoAgendaManager));

        // Step 5: Deploy MockCandidateFactory
        candidateFactory = new MockCandidateFactory();
        emit MigrationStep(0, 5, "Deploy MockCandidateFactory", address(candidateFactory));
        console.log("  [0-5] MockCandidateFactory deployed at:", address(candidateFactory));

        // Step 6: Deploy MockSeigManager
        seigManager = new MockSeigManager(deployer);
        emit MigrationStep(0, 6, "Deploy MockSeigManager", address(seigManager));
        console.log("  [0-6] MockSeigManager deployed at:", address(seigManager));

        // Step 7: Mint TON to daoVault and test accounts
        ton.mint(address(daoVault), 100_000 ether);
        ton.mint(TEST_ACCOUNT_1, 10_000 ether);
        ton.mint(TEST_ACCOUNT_2, 10_000 ether);
        emit MigrationStep(0, 7, "Mint TON to vault and test accounts", address(ton));
        console.log("  [0-7] Minted 100K TON to DAOVault, 10K TON to each test account");

        // Step 8: Deploy 2 mock candidates via factory
        address candidate1 = candidateFactory.deploy(TEST_ACCOUNT_1);
        address candidate2 = candidateFactory.deploy(TEST_ACCOUNT_2);
        emit MigrationStep(0, 8, "Deploy mock candidates via factory", address(candidateFactory));
        console.log("  [0-8] Candidate 1:", candidate1);
        console.log("        Candidate 2:", candidate2);

        emit MigrationPhaseCompleted(0);
        console.log("  Phase 0 completed.");
    }

    /*//////////////////////////////////////////////////////////////
                        PHASE 1: DEPLOY V2
    //////////////////////////////////////////////////////////////*/

    function _phase1DeployV2(address deployer) internal {
        emit MigrationPhaseStarted(1, "V2 Deploy");
        console.log("\n=== Phase 1: Deploy V2 Contracts ===");

        // Step 1: Deploy vTON
        vton = new vTON(deployer);
        emit MigrationStep(1, 1, "Deploy vTON", address(vton));
        console.log("  [1-1] vTON deployed at:", address(vton));

        // Step 2: Deploy DelegateRegistry
        delegateRegistry = new DelegateRegistry(address(vton), deployer);
        emit MigrationStep(1, 2, "Deploy DelegateRegistry", address(delegateRegistry));
        console.log("  [1-2] DelegateRegistry deployed at:", address(delegateRegistry));

        // Step 3: Deploy Timelock (7 days minimum delay)
        timelock = new Timelock(deployer, 7 days);
        emit MigrationStep(1, 3, "Deploy Timelock (7 days delay)", address(timelock));
        console.log("  [1-3] Timelock deployed at:", address(timelock));

        // Step 4: Deploy DAOGovernor
        governor = new DAOGovernor(
            address(ton),
            address(vton),
            address(delegateRegistry),
            address(timelock),
            deployer
        );
        emit MigrationStep(1, 4, "Deploy DAOGovernor", address(governor));
        console.log("  [1-4] DAOGovernor deployed at:", address(governor));

        // Step 5: Deploy SecurityCouncil
        // Requires exactly 2 external members per constructor validation
        address[] memory extMembers = new address[](2);
        extMembers[0] = TEST_ACCOUNT_2;
        extMembers[1] = address(uint160(uint256(keccak256("external_member_2"))));

        securityCouncil = new SecurityCouncil(
            TEST_ACCOUNT_1,  // foundationMember
            extMembers,
            address(governor),
            address(timelock),
            address(vton)    // protocolTarget for pause
        );
        emit MigrationStep(1, 5, "Deploy SecurityCouncil", address(securityCouncil));
        console.log("  [1-5] SecurityCouncil deployed at:", address(securityCouncil));
        console.log("        Foundation member:", TEST_ACCOUNT_1);
        console.log("        External member 1:", extMembers[0]);
        console.log("        External member 2:", extMembers[1]);

        emit MigrationPhaseCompleted(1);
        console.log("  Phase 1 completed.");
    }

    /*//////////////////////////////////////////////////////////////
                    PHASE 2: CONFIGURE CONNECTIONS
    //////////////////////////////////////////////////////////////*/

    function _phase2Configure(address deployer) internal {
        emit MigrationPhaseStarted(2, "Configure Connections");
        console.log("\n=== Phase 2: Configure Connections ===");

        // Step 1: Timelock -> Governor
        timelock.setGovernor(address(governor));
        emit MigrationStep(2, 1, "Timelock.setGovernor", address(governor));
        console.log("  [2-1] Timelock.governor set to DAOGovernor");

        // Step 2: Timelock -> SecurityCouncil
        timelock.setSecurityCouncil(address(securityCouncil));
        emit MigrationStep(2, 2, "Timelock.setSecurityCouncil", address(securityCouncil));
        console.log("  [2-2] Timelock.securityCouncil set");

        // Step 3: DelegateRegistry -> Governor
        delegateRegistry.setGovernor(address(governor));
        emit MigrationStep(2, 3, "DelegateRegistry.setGovernor", address(governor));
        console.log("  [2-3] DelegateRegistry.governor set to DAOGovernor");

        // Step 4: Governor -> SecurityCouncil as proposal guardian
        governor.setProposalGuardian(address(securityCouncil));
        emit MigrationStep(2, 4, "Governor.setProposalGuardian", address(securityCouncil));
        console.log("  [2-4] Governor.proposalGuardian set to SecurityCouncil");

        // Step 5: Set voting delay (0 = immediate, which is MIN_VOTING_DELAY)
        governor.setVotingDelay(0);
        emit MigrationStep(2, 5, "Governor.setVotingDelay(0)", address(governor));
        console.log("  [2-5] Governor.votingDelay set to 0");

        // Step 6: Set voting period (minimum 7200 blocks ~= 1 day)
        governor.setVotingPeriod(7200);
        emit MigrationStep(2, 6, "Governor.setVotingPeriod(7200)", address(governor));
        console.log("  [2-6] Governor.votingPeriod set to 7200");

        // Step 7: Set deployer as vTON minter
        vton.setMinter(deployer, true);
        emit MigrationStep(2, 7, "vTON.setMinter(deployer)", address(vton));
        console.log("  [2-7] vTON minter set: deployer");

        // Step 8: Set SeigManager as vTON minter
        vton.setMinter(address(seigManager), true);
        emit MigrationStep(2, 8, "vTON.setMinter(seigManager)", address(seigManager));
        console.log("  [2-8] vTON minter set: SeigManager");

        // Step 9: Connect SeigManager to vTON
        seigManager.setVTON(address(vton));
        emit MigrationStep(2, 9, "SeigManager.setVTON", address(vton));
        console.log("  [2-9] SeigManager.vtonAddress set to vTON");

        emit MigrationPhaseCompleted(2);
        console.log("  Phase 2 completed.");
    }

    /*//////////////////////////////////////////////////////////////
                PHASE 3: GOVERNANCE TRANSITION (SIMULATED)
    //////////////////////////////////////////////////////////////*/

    function _phase3Transition(address deployer) internal {
        emit MigrationPhaseStarted(3, "Governance Transition");
        console.log("\n=== Phase 3: Governance Transition ===");

        // Step 1: Mint vTON to test accounts (simulate airdrop)
        vton.mint(TEST_ACCOUNT_1, 50_000 ether);
        vton.mint(TEST_ACCOUNT_2, 50_000 ether);
        emit MigrationStep(3, 1, "Mint 50K vTON to test accounts (airdrop)", address(vton));
        console.log("  [3-1] Minted 50K vTON to TEST_ACCOUNT_1 and TEST_ACCOUNT_2");

        // Step 2: Simulate seigniorage distribution via SeigManager
        seigManager.updateSeigniorage(deployer, 1000 ether);
        emit MigrationStep(3, 2, "SeigManager.updateSeigniorage(deployer, 1000)", address(seigManager));
        console.log("  [3-2] Seigniorage simulated: 1000 vTON minted to deployer via SeigManager");

        // Step 3: Transfer DelegateRegistry ownership to Timelock
        delegateRegistry.transferOwnership(address(timelock));
        emit MigrationStep(3, 3, "DelegateRegistry.transferOwnership -> Timelock", address(delegateRegistry));
        console.log("  [3-3] DelegateRegistry ownership transferred to Timelock");

        // Step 4: Transfer DAOGovernor ownership to Timelock
        governor.transferOwnership(address(timelock));
        emit MigrationStep(3, 4, "Governor.transferOwnership -> Timelock", address(governor));
        console.log("  [3-4] DAOGovernor ownership transferred to Timelock");

        // Step 5: Transfer vTON ownership to Timelock (2-step: initiates pending)
        vton.transferOwnership(address(timelock));
        emit MigrationStep(3, 5, "vTON.transferOwnership -> Timelock (pending)", address(vton));
        console.log("  [3-5] vTON ownership transfer initiated (pendingOwner = Timelock)");
        console.log("        NOTE: acceptOwnership() must be called by Timelock via governance proposal in production");

        // Step 6: Set Timelock pending admin to itself (self-referencing for DAO control)
        timelock.setPendingAdmin(address(timelock));
        emit MigrationStep(3, 6, "Timelock.setPendingAdmin(self)", address(timelock));
        console.log("  [3-6] Timelock.pendingAdmin set to Timelock (self-governing)");
        console.log("        NOTE: acceptAdmin() must be called by Timelock via governance proposal in production");

        emit MigrationPhaseCompleted(3);
        console.log("  Phase 3 completed.");
    }

    /*//////////////////////////////////////////////////////////////
                    PHASE 4: V1 DEPRECATION
    //////////////////////////////////////////////////////////////*/

    function _phase4DeprecateV1(address deployer) internal {
        emit MigrationPhaseStarted(4, "V1 Deprecation");
        console.log("\n=== Phase 4: V1 Deprecation ===");

        // Step 1: Transfer DAOVault ownership to Timelock (treasury under V2 control)
        daoVault.transferOwnership(address(timelock));
        emit MigrationStep(4, 1, "DAOVault.transferOwnership -> Timelock", address(daoVault));
        console.log("  [4-1] DAOVault ownership transferred to Timelock (V2 treasury control)");

        // Step 2: Pause V1 governance proxy
        daoCommitteeProxy.setPauseProxy(true);
        emit MigrationStep(4, 2, "DAOCommitteeProxy.setPauseProxy(true)", address(daoCommitteeProxy));
        console.log("  [4-2] DAOCommitteeProxy paused");

        // Step 3: Verify pause state
        bool paused = daoCommitteeProxy.pauseProxy();
        require(paused, "V1 governance should be paused");
        emit MigrationStep(4, 3, "Verify V1 pauseProxy == true", address(daoCommitteeProxy));
        console.log("  [4-3] Verified: pauseProxy =", paused);

        emit MigrationCompleted();
        emit MigrationPhaseCompleted(4);
        console.log("  Phase 4 completed. Migration complete!");
    }

    /*//////////////////////////////////////////////////////////////
                        FINAL STATE LOGGING
    //////////////////////////////////////////////////////////////*/

    function _logFinalState() internal view {
        console.log("\n========================================");
        console.log("=== Migration Complete ===");
        console.log("========================================");

        console.log("\nV1 Contracts:");
        console.log("  MockTON:", address(ton));
        console.log("  DAOCommitteeProxy:", address(daoCommitteeProxy));
        console.log("    pauseProxy:", daoCommitteeProxy.pauseProxy());
        console.log("  DAOVault:", address(daoVault));
        console.log("    owner:", daoVault.owner());
        console.log("  DAOAgendaManager:", address(daoAgendaManager));
        console.log("  CandidateFactory:", address(candidateFactory));
        console.log("    candidateCount:", candidateFactory.candidateCount());
        console.log("  SeigManager:", address(seigManager));
        console.log("    vtonAddress:", seigManager.vtonAddress());

        console.log("\nV2 Contracts:");
        console.log("  vTON:", address(vton));
        console.log("    totalSupply:", vton.totalSupply() / 1 ether, "vTON");
        console.log("    owner:", vton.owner());
        console.log("    pendingOwner:", vton.pendingOwner());
        console.log("  DelegateRegistry:", address(delegateRegistry));
        console.log("    owner:", delegateRegistry.owner());
        console.log("  Timelock:", address(timelock));
        console.log("    admin:", timelock.admin());
        console.log("    pendingAdmin:", timelock.pendingAdmin());
        console.log("    governor:", timelock.governor());
        console.log("    securityCouncil:", timelock.securityCouncil());
        console.log("    delay:", timelock.delay());
        console.log("  DAOGovernor:", address(governor));
        console.log("    owner:", governor.owner());
        console.log("    votingDelay:", governor.votingDelay());
        console.log("    votingPeriod:", governor.votingPeriod());
        console.log("  SecurityCouncil:", address(securityCouncil));
        console.log("    threshold:", securityCouncil.threshold());

        console.log("\nFinal State:");
        console.log("  V1 pauseProxy:", daoCommitteeProxy.pauseProxy());
        console.log("  DAOVault.owner:", daoVault.owner(), "(Timelock)");
        console.log("  vTON.pendingOwner:", vton.pendingOwner(), "(Timelock)");
        console.log("  Timelock.pendingAdmin:", timelock.pendingAdmin(), "(Timelock self)");
        console.log("  Governor.owner:", governor.owner(), "(Timelock)");
        console.log("  DelegateRegistry.owner:", delegateRegistry.owner(), "(Timelock)");
        console.log("\n========================================");
    }
}
