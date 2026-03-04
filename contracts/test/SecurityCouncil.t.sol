// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SecurityCouncil } from "../src/governance/SecurityCouncil.sol";
import { ISecurityCouncil } from "../src/interfaces/ISecurityCouncil.sol";
import { DAOGovernor } from "../src/governance/DAOGovernor.sol";
import { DelegateRegistry } from "../src/governance/DelegateRegistry.sol";
import { Timelock } from "../src/governance/Timelock.sol";
import { vTON } from "../src/token/vTON.sol";

/// @notice Mock TON token for SC integration test
contract MockTONForSC is ERC20 {
    constructor() ERC20("TON", "TON") {
        _mint(msg.sender, 1_000_000 ether);
    }
}

/// @notice Mock target contract for testing
contract MockTarget {
    bool public paused;
    uint256 public value;

    function pause() external {
        paused = true;
    }

    function unpause() external {
        paused = false;
    }

    function setValue(uint256 _value) external {
        value = _value;
    }
}

contract SecurityCouncilTest is Test {
    SecurityCouncil public council;
    MockTarget public target;

    address public daoGovernor;
    address public timelock;
    address public foundationMember;
    address public external1;
    address public external2;

    function setUp() public {
        daoGovernor = makeAddr("daoGovernor");
        timelock = makeAddr("timelock");
        foundationMember = makeAddr("foundationMember");
        external1 = makeAddr("external1");
        external2 = makeAddr("external2");

        target = new MockTarget();

        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = external2;

        council = new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(target)
        );
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(council.memberCount(), 3);
        assertEq(council.foundationMemberCount(), 1);
        assertEq(council.externalMemberCount(), 2);
        assertEq(council.threshold(), 2); // 2/3
        assertTrue(council.isMember(foundationMember));
        assertTrue(council.isMember(external1));
        assertTrue(council.isMember(external2));
    }

    function test_GetMembers() public view {
        ISecurityCouncil.Member[] memory members = council.getMembers();
        assertEq(members.length, 3);

        // Foundation member should be first
        assertEq(members[0].account, foundationMember);
        assertTrue(members[0].isFoundation);

        // External members
        assertEq(members[1].account, external1);
        assertFalse(members[1].isFoundation);
    }

    /*//////////////////////////////////////////////////////////////
                         EMERGENCY ACTIONS
    //////////////////////////////////////////////////////////////*/

    function test_ProposeEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Set value to 42"
        );

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertEq(action.id, actionId);
        assertEq(uint256(action.actionType), uint256(ISecurityCouncil.ActionType.Custom));
        assertEq(action.target, address(target));
        assertEq(action.reason, "Set value to 42");
        assertFalse(action.executed);
        assertEq(action.approvers.length, 1);
    }

    function test_ProposeEmergencyActionRevertsIfNotMember() public {
        address nonMember = makeAddr("nonMember");
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(nonMember);
        vm.expectRevert(SecurityCouncil.NotMember.selector);
        council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );
    }

    function test_ApproveEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertEq(action.approvers.length, 2);
        assertTrue(council.isActionApproved(actionId));
    }

    function test_ApproveEmergencyActionRevertsIfAlreadyApproved() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.AlreadyApproved.selector);
        council.approveEmergencyAction(actionId);
    }

    function test_ExecuteEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        vm.prank(external2);
        council.executeEmergencyAction(actionId);

        assertEq(target.value(), 42);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertTrue(action.executed);
    }

    function test_ExecuteEmergencyActionRevertsIfNotApproved() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // Only 1 approval, need 2
        vm.prank(external1);
        vm.expectRevert(SecurityCouncil.ActionNotApproved.selector);
        council.executeEmergencyAction(actionId);
    }

    function test_CancelEmergencyAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(foundationMember);
        council.cancelEmergencyAction(actionId);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertTrue(action.canceled); // Marked as canceled to prevent reuse
        assertFalse(action.executed);
    }

    /*//////////////////////////////////////////////////////////////
                        CONVENIENCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_PauseProtocol() public {
        vm.prank(foundationMember);
        council.pauseProtocol("Emergency pause");

        uint256[] memory pending = council.getPendingActions();
        assertEq(pending.length, 1);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(pending[0]);
        assertEq(uint256(action.actionType), uint256(ISecurityCouncil.ActionType.PauseProtocol));
    }

    function test_UnpauseProtocol() public {
        vm.prank(foundationMember);
        council.unpauseProtocol();

        uint256[] memory pending = council.getPendingActions();
        assertEq(pending.length, 1);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(pending[0]);
        assertEq(uint256(action.actionType), uint256(ISecurityCouncil.ActionType.UnpauseProtocol));
    }

    /*//////////////////////////////////////////////////////////////
                         MEMBER MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function test_AddMember() public {
        address newMember = makeAddr("newMember");

        vm.prank(daoGovernor);
        council.addMember(newMember, false);

        assertTrue(council.isMember(newMember));
        assertEq(council.memberCount(), 4);
    }

    function test_AddMemberRevertsIfNotDAO() public {
        address newMember = makeAddr("newMember");

        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.OnlyDAOCanModifyMembers.selector);
        council.addMember(newMember, false);
    }

    function test_RemoveMember() public {
        vm.prank(daoGovernor);
        council.removeMember(external2);

        assertFalse(council.isMember(external2));
        assertEq(council.memberCount(), 2);
    }

    function test_RemoveMemberRevertsIfTooFewMembers() public {
        vm.startPrank(daoGovernor);
        council.removeMember(external2);

        vm.expectRevert(SecurityCouncil.NotEnoughMembers.selector);
        council.removeMember(external1);
        vm.stopPrank();
    }

    function test_SetThreshold() public {
        vm.prank(daoGovernor);
        council.setThreshold(3);

        assertEq(council.threshold(), 3);
    }

    function test_SetThresholdRevertsIfInvalid() public {
        vm.prank(daoGovernor);
        vm.expectRevert(SecurityCouncil.InvalidThreshold.selector);
        council.setThreshold(4); // More than member count
    }

    /*//////////////////////////////////////////////////////////////
                             VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_GetPendingActions() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test1"
        );

        vm.prank(external1);
        council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test2"
        );

        uint256[] memory pending = council.getPendingActions();
        assertEq(pending.length, 2);
    }

    function test_IsActionApproved() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // Only 1 approval
        assertFalse(council.isActionApproved(actionId));

        // Add second approval
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // Now approved
        assertTrue(council.isActionApproved(actionId));
    }

    /*//////////////////////////////////////////////////////////////
                        FULL FLOW TESTS
    //////////////////////////////////////////////////////////////*/

    function test_FullPauseProtocolFlow() public {
        // foundationMember proposes pause
        vm.prank(foundationMember);
        council.pauseProtocol("Emergency");

        uint256[] memory pending = council.getPendingActions();
        uint256 actionId = pending[0];

        // external1 approves the action
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // external2 executes the action
        vm.prank(external2);
        council.executeEmergencyAction(actionId);

        // Verify target is paused
        assertTrue(target.paused());
    }

    function test_FullUnpauseFlow() public {
        // First pause the target directly
        target.pause();
        assertTrue(target.paused());

        // foundationMember proposes unpause
        vm.prank(foundationMember);
        council.unpauseProtocol();

        uint256[] memory pending = council.getPendingActions();
        uint256 actionId = pending[0];

        // external1 approves
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // foundationMember executes
        vm.prank(foundationMember);
        council.executeEmergencyAction(actionId);

        // Verify target is unpaused
        assertFalse(target.paused());
    }

    function test_CancelProposalFullFlow() public {
        uint256 someProposalId = 123;

        // foundationMember proposes cancel
        vm.prank(foundationMember);
        council.cancelProposal(someProposalId);

        uint256[] memory pending = council.getPendingActions();
        uint256 actionId = pending[0];

        // Verify the action was created correctly
        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertEq(uint256(action.actionType), uint256(ISecurityCouncil.ActionType.CancelProposal));
        assertEq(action.target, daoGovernor);
        assertEq(action.data, abi.encodeWithSignature("cancel(uint256)", someProposalId));
        assertFalse(action.executed);

        // external1 approves
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // Verify the action is approved (don't execute)
        assertTrue(council.isActionApproved(actionId));
    }

    /*//////////////////////////////////////////////////////////////
                    AUTO-THRESHOLD RECALCULATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AddMemberRecalculatesThreshold() public {
        address newMember = makeAddr("newMember");

        // Start: 3 members, threshold = 2
        assertEq(council.threshold(), 2);

        vm.prank(daoGovernor);
        council.addMember(newMember, false);

        // 4 members: threshold = (4*2+2)/3 = 10/3 = 3
        assertEq(council.threshold(), 3);
        assertEq(council.memberCount(), 4);
    }

    function test_RemoveMemberRecalculatesThreshold() public {
        // Start: 3 members, threshold = 2
        assertEq(council.threshold(), 2);

        vm.prank(daoGovernor);
        council.removeMember(external2);

        // 2 members: threshold = (2*2+2)/3 = 6/3 = 2
        assertEq(council.threshold(), 2);
        assertEq(council.memberCount(), 2);
    }

    /*//////////////////////////////////////////////////////////////
                    CANCEL RESTRICTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CancelEmergencyActionOnlyProposer() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // external1 (non-proposer) tries to cancel -> should revert
        vm.prank(external1);
        vm.expectRevert(SecurityCouncil.OnlyProposerCanCancel.selector);
        council.cancelEmergencyAction(actionId);

        // foundationMember (proposer) can cancel
        vm.prank(foundationMember);
        council.cancelEmergencyAction(actionId);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertTrue(action.canceled);
        assertFalse(action.executed);
    }

    /*//////////////////////////////////////////////////////////////
                    ACTION EXPIRY TESTS
    //////////////////////////////////////////////////////////////*/

    function test_EmergencyActionExpiry() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // Warp past TTL
        vm.warp(block.timestamp + 7 days + 1);

        // Approve should revert
        vm.prank(external1);
        vm.expectRevert(SecurityCouncil.ActionExpired.selector);
        council.approveEmergencyAction(actionId);
    }

    function test_ExecuteEmergencyActionExpiry() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // Approve within TTL
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // Warp past TTL
        vm.warp(block.timestamp + 7 days + 1);

        // Execute should revert
        vm.prank(external2);
        vm.expectRevert(SecurityCouncil.ActionExpired.selector);
        council.executeEmergencyAction(actionId);
    }

    /*//////////////////////////////////////////////////////////////
                    CANCELED STATE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CanceledActionState() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(foundationMember);
        council.cancelEmergencyAction(actionId);

        ISecurityCouncil.EmergencyAction memory action = council.getEmergencyAction(actionId);
        assertTrue(action.canceled);
        assertFalse(action.executed);

        // Cannot approve canceled action
        vm.prank(external1);
        vm.expectRevert(SecurityCouncil.ActionAlreadyCanceled.selector);
        council.approveEmergencyAction(actionId);
    }

    /*//////////////////////////////////////////////////////////////
                    MISSING EVENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_EmitDAOGovernorUpdatedEvent() public {
        address newGovernor = makeAddr("newGovernor");

        vm.prank(daoGovernor);
        vm.expectEmit(true, true, true, true);
        emit ISecurityCouncil.DAOGovernorUpdated(daoGovernor, newGovernor);
        council.setDAOGovernor(newGovernor);
    }

    function test_EmitProtocolTargetUpdatedEvent() public {
        address newTarget = makeAddr("newTarget");

        vm.prank(daoGovernor);
        vm.expectEmit(true, true, true, true);
        emit ISecurityCouncil.ProtocolTargetUpdated(address(target), newTarget);
        council.setProtocolTarget(newTarget);
    }

    /*//////////////////////////////////////////////////////////////
                FOUNDATION MEMBER REMOVAL PROTECTION
    //////////////////////////////////////////////////////////////*/

    function test_RemoveLastFoundationMemberReverts() public {
        // There is 1 foundation member. Removing it should revert.
        vm.prank(daoGovernor);
        vm.expectRevert(SecurityCouncil.CannotRemoveLastFoundationMember.selector);
        council.removeMember(foundationMember);
    }

    /*//////////////////////////////////////////////////////////////
                DUPLICATE MEMBER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AddDuplicateMemberReverts() public {
        vm.prank(daoGovernor);
        vm.expectRevert(SecurityCouncil.AlreadyMember.selector);
        council.addMember(external1, false);
    }

    function test_ConstructorRevertsDuplicateExternalMembers() public {
        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = external1; // duplicate

        vm.expectRevert(SecurityCouncil.AlreadyMember.selector);
        new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(target)
        );
    }

    function test_ConstructorRevertsExternalSameAsFoundation() public {
        address[] memory externalMembers = new address[](2);
        externalMembers[0] = foundationMember; // same as foundation
        externalMembers[1] = external2;

        vm.expectRevert(SecurityCouncil.AlreadyMember.selector);
        new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(target)
        );
    }

    /*//////////////////////////////////////////////////////////////
                ZERO ADDRESS ADMIN FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetDAOGovernorRevertsOnZeroAddress() public {
        vm.prank(daoGovernor);
        vm.expectRevert(SecurityCouncil.ZeroAddress.selector);
        council.setDAOGovernor(address(0));
    }

    function test_SetProtocolTargetRevertsOnZeroAddress() public {
        vm.prank(daoGovernor);
        vm.expectRevert(SecurityCouncil.ZeroAddress.selector);
        council.setProtocolTarget(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                EXECUTION FAILED REVERT TEST
    //////////////////////////////////////////////////////////////*/

    function test_ExecuteEmergencyActionRevertsOnExecutionFailed() public {
        // Call a function that doesn't exist on the target → execution will fail
        bytes memory data = abi.encodeWithSignature("nonexistentFunction()");

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Will fail"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        vm.prank(external2);
        vm.expectRevert(SecurityCouncil.ExecutionFailed.selector);
        council.executeEmergencyAction(actionId);
    }

    /*//////////////////////////////////////////////////////////////
                CONSTRUCTOR VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ConstructorRevertsOnZeroFoundationMember() public {
        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = external2;

        vm.expectRevert(SecurityCouncil.ZeroAddress.selector);
        new SecurityCouncil(
            address(0), externalMembers, daoGovernor, timelock, address(target)
        );
    }

    function test_ConstructorRevertsOnZeroDAOGovernor() public {
        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = external2;

        vm.expectRevert(SecurityCouncil.ZeroAddress.selector);
        new SecurityCouncil(
            foundationMember, externalMembers, address(0), timelock, address(target)
        );
    }

    function test_ConstructorRevertsOnZeroExternalMember() public {
        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = address(0);

        vm.expectRevert(SecurityCouncil.ZeroAddress.selector);
        new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(target)
        );
    }

    /*//////////////////////////////////////////////////////////////
                    AUDIT FIX VERIFICATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_StaleApprovalAfterMemberRemoval() public {
        // M-2 verification: approvals from removed members don't count
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        // foundationMember proposes
        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // external1 approves (2 approvals now: foundationMember + external1)
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // Remove external1 via DAO
        vm.prank(daoGovernor);
        council.removeMember(external1);

        // Now try to execute — foundationMember's approval is valid, external1's is stale
        // Threshold is 2 (for 2 members), valid approvals = 1 (only foundationMember)
        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.ActionNotApproved.selector);
        council.executeEmergencyAction(actionId);
    }

    function test_ThresholdDropDoesNotEnableStaleExecution() public {
        // Add a 4th member to make threshold = 3
        address external3 = makeAddr("external3");
        vm.prank(daoGovernor);
        council.addMember(external3, false);
        assertEq(council.threshold(), 3);

        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        // foundationMember proposes (1 approval)
        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // external1 approves (2 approvals)
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // external3 approves (3 approvals)
        vm.prank(external3);
        council.approveEmergencyAction(actionId);

        // Remove external3 (valid approvals drop to 2, threshold for 3 members = 2)
        vm.prank(daoGovernor);
        council.removeMember(external3);
        assertEq(council.threshold(), 2);

        // Should still execute since 2 valid approvals >= threshold 2
        vm.prank(foundationMember);
        council.executeEmergencyAction(actionId);
        assertEq(target.value(), 42);
    }

    function test_CancelAlreadyExecutedAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        vm.prank(external2);
        council.executeEmergencyAction(actionId);

        // Try to cancel an already executed action
        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.ActionAlreadyExecuted.selector);
        council.cancelEmergencyAction(actionId);
    }

    function test_ApproveAlreadyExecutedAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        vm.prank(external2);
        council.executeEmergencyAction(actionId);

        // Try to approve an already executed action
        vm.prank(external2);
        vm.expectRevert(SecurityCouncil.ActionAlreadyExecuted.selector);
        council.approveEmergencyAction(actionId);
    }

    function test_NonMemberCannotCancelAction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        address nonMember = makeAddr("nonMember");
        vm.prank(nonMember);
        vm.expectRevert(SecurityCouncil.NotMember.selector);
        council.cancelEmergencyAction(actionId);
    }

    function test_ConstructorRevertsOnZeroProtocolTarget() public {
        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = external2;

        vm.expectRevert(SecurityCouncil.ZeroAddress.selector);
        new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(0)
        );
    }

    function test_SetThresholdBelowMinimumReverts() public {
        // 3 members, minimum threshold = ceil(3 * 2/3) = 2
        // Setting to 1 should revert
        vm.prank(daoGovernor);
        vm.expectRevert(SecurityCouncil.InvalidThreshold.selector);
        council.setThreshold(1);
    }

    function test_ConstructorRevertsOnZeroExternalMembers() public {
        address[] memory externalMembers = new address[](0);

        vm.expectRevert(SecurityCouncil.NotEnoughMembers.selector);
        new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(target)
        );
    }

    function test_ConstructorRevertsOnOneExternalMember() public {
        address[] memory externalMembers = new address[](1);
        externalMembers[0] = external1;

        vm.expectRevert(SecurityCouncil.NotEnoughMembers.selector);
        new SecurityCouncil(
            foundationMember, externalMembers, daoGovernor, timelock, address(target)
        );
    }

    function test_NonDAOCallingSetDAOGovernorReverts() public {
        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.OnlyDAOCanModifyMembers.selector);
        council.setDAOGovernor(makeAddr("newGovernor"));
    }

    function test_NonDAOCallingSetProtocolTargetReverts() public {
        vm.prank(foundationMember);
        vm.expectRevert(SecurityCouncil.OnlyDAOCanModifyMembers.selector);
        council.setProtocolTarget(makeAddr("newTarget"));
    }

    /*//////////////////////////////////////////////////////////////
                CONVENIENCE FUNCTION EVENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CancelProposalEmitsApprovedEvent() public {
        uint256 someProposalId = 456;

        vm.prank(foundationMember);
        vm.expectEmit(true, true, true, true);
        emit ISecurityCouncil.EmergencyActionApproved(0, foundationMember);
        council.cancelProposal(someProposalId);
    }

    function test_PauseProtocolEmitsApprovedEvent() public {
        vm.prank(foundationMember);
        vm.expectEmit(true, true, true, true);
        emit ISecurityCouncil.EmergencyActionApproved(0, foundationMember);
        council.pauseProtocol("Emergency pause");
    }

    function test_UnpauseProtocolEmitsApprovedEvent() public {
        vm.prank(foundationMember);
        vm.expectEmit(true, true, true, true);
        emit ISecurityCouncil.EmergencyActionApproved(0, foundationMember);
        council.unpauseProtocol();
    }

    function test_IsActionApprovedAfterMemberRemoval() public {
        // Fix 1 verification: isActionApproved must return false when
        // a removed member's approval is no longer valid
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        // foundationMember proposes (1 approval)
        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        // external1 approves (2 approvals — meets threshold of 2)
        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        // Verify approved before removal
        assertTrue(council.isActionApproved(actionId));

        // Remove external1 via DAO
        vm.prank(daoGovernor);
        council.removeMember(external1);

        // isActionApproved should now return false:
        // only foundationMember's approval is valid, threshold is 2
        assertFalse(council.isActionApproved(actionId));
    }

    function test_ExecuteEmergencyActionByNonMemberReverts() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(foundationMember);
        uint256 actionId = council.proposeEmergencyAction(
            ISecurityCouncil.ActionType.Custom, address(target), data, "Test"
        );

        vm.prank(external1);
        council.approveEmergencyAction(actionId);

        address nonMember = makeAddr("nonMember");
        vm.prank(nonMember);
        vm.expectRevert(SecurityCouncil.NotMember.selector);
        council.executeEmergencyAction(actionId);
    }

    /*//////////////////////////////////////////////////////////////
            SC → DAOGovernor PAUSE INTEGRATION TEST
    //////////////////////////////////////////////////////////////*/

    function test_FullPauseProtocolFlow_WithGovernor() public {
        // Deploy real DAOGovernor as the protocolTarget
        address scOwner = makeAddr("scOwner");

        vm.startPrank(scOwner);
        MockTONForSC tonToken = new MockTONForSC();
        vTON vton = new vTON(scOwner);
        DelegateRegistry reg = new DelegateRegistry(address(vton), scOwner);
        Timelock tl = new Timelock(scOwner, 7 days);
        DAOGovernor gov = new DAOGovernor(
            address(tonToken), address(vton), address(reg), address(tl), scOwner
        );
        vm.stopPrank();

        // Create SecurityCouncil with governor as protocolTarget
        address[] memory externalMembers = new address[](2);
        externalMembers[0] = external1;
        externalMembers[1] = external2;

        SecurityCouncil scWithGov = new SecurityCouncil(
            foundationMember, externalMembers, address(gov), timelock, address(gov)
        );

        // Transfer governor ownership to SC so it can call pause()
        vm.prank(scOwner);
        gov.transferOwnership(address(scWithGov));

        // SC member proposes pause
        vm.prank(foundationMember);
        scWithGov.pauseProtocol("Emergency: vulnerability found");

        uint256[] memory pending = scWithGov.getPendingActions();
        uint256 actionId = pending[0];

        // Second member approves (reaching threshold 2/3)
        vm.prank(external1);
        scWithGov.approveEmergencyAction(actionId);

        // Execute the pause action
        vm.prank(external1);
        scWithGov.executeEmergencyAction(actionId);

        // Verify DAOGovernor is paused
        assertTrue(gov.paused());
    }
}
