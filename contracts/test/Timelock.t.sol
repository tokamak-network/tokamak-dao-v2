// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { Timelock } from "../src/governance/Timelock.sol";

/// @notice Mock target contract for testing
contract MockTarget {
    uint256 public value;

    function setValue(uint256 _value) external {
        value = _value;
    }

    receive() external payable { }
}

/// @notice Mock target that always reverts
contract RevertingTarget {
    fallback() external payable {
        revert("always reverts");
    }
}

contract TimelockTest is Test {
    Timelock public timelock;
    MockTarget public target;
    RevertingTarget public revertingTarget;

    address public admin;
    address public governor;
    address public securityCouncil;
    address public alice;

    uint256 public constant DELAY = 7 days;

    function setUp() public {
        admin = makeAddr("admin");
        governor = makeAddr("governor");
        securityCouncil = makeAddr("securityCouncil");
        alice = makeAddr("alice");

        timelock = new Timelock(admin, DELAY);
        target = new MockTarget();
        revertingTarget = new RevertingTarget();

        // Set governor and security council
        vm.startPrank(admin);
        timelock.setGovernor(governor);
        timelock.setSecurityCouncil(securityCouncil);
        vm.stopPrank();

        // Fund the timelock with ETH for value transfers
        vm.deal(address(timelock), 100 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(timelock.admin(), admin);
        assertEq(timelock.governor(), governor);
        assertEq(timelock.securityCouncil(), securityCouncil);
        assertEq(timelock.delay(), DELAY);
        assertEq(timelock.MINIMUM_DELAY(), 1 days);
        assertEq(timelock.MAXIMUM_DELAY(), 30 days);
        assertEq(timelock.GRACE_PERIOD(), 14 days);
    }

    function test_DeploymentRevertsIfAdminIsZeroAddress() public {
        vm.expectRevert(Timelock.ZeroAddress.selector);
        new Timelock(address(0), DELAY);
    }

    function test_DeploymentRevertsIfDelayTooSmall() public {
        vm.expectRevert(Timelock.InvalidDelay.selector);
        new Timelock(admin, 1 days - 1);
    }

    function test_DeploymentRevertsIfDelayTooLarge() public {
        vm.expectRevert(Timelock.InvalidDelay.selector);
        new Timelock(admin, 30 days + 1);
    }

    function test_DeploymentWithMinimumDelay() public {
        Timelock t = new Timelock(admin, 1 days);
        assertEq(t.delay(), 1 days);
    }

    function test_DeploymentWithMaximumDelay() public {
        Timelock t = new Timelock(admin, 30 days);
        assertEq(t.delay(), 30 days);
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS - setGovernor
    //////////////////////////////////////////////////////////////*/

    function test_SetGovernor() public {
        address newGovernor = makeAddr("newGovernor");

        vm.prank(admin);
        timelock.setGovernor(newGovernor);

        assertEq(timelock.governor(), newGovernor);
    }

    function test_SetGovernorEmitsEvent() public {
        address newGovernor = makeAddr("newGovernor");

        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit Timelock.GovernorUpdated(governor, newGovernor);
        timelock.setGovernor(newGovernor);
    }

    function test_SetGovernorRevertsIfNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(Timelock.NotAdmin.selector);
        timelock.setGovernor(alice);
    }

    function test_SetGovernorRevertsIfZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(Timelock.ZeroAddress.selector);
        timelock.setGovernor(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                    ADMIN FUNCTIONS - setSecurityCouncil
    //////////////////////////////////////////////////////////////*/

    function test_SetSecurityCouncil() public {
        address newCouncil = makeAddr("newCouncil");

        vm.prank(admin);
        timelock.setSecurityCouncil(newCouncil);

        assertEq(timelock.securityCouncil(), newCouncil);
    }

    function test_SetSecurityCouncilEmitsEvent() public {
        address newCouncil = makeAddr("newCouncil");

        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit Timelock.SecurityCouncilUpdated(securityCouncil, newCouncil);
        timelock.setSecurityCouncil(newCouncil);
    }

    function test_SetSecurityCouncilRevertsIfNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(Timelock.NotAdmin.selector);
        timelock.setSecurityCouncil(alice);
    }

    function test_SetSecurityCouncilRevertsIfZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(Timelock.ZeroAddress.selector);
        timelock.setSecurityCouncil(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTIONS - setDelay
    //////////////////////////////////////////////////////////////*/

    function test_SetDelay() public {
        uint256 newDelay = 14 days;

        vm.prank(admin);
        timelock.setDelay(newDelay);

        assertEq(timelock.delay(), newDelay);
    }

    function test_SetDelayEmitsEvent() public {
        uint256 newDelay = 14 days;

        vm.prank(admin);
        vm.expectEmit(true, true, true, true);
        emit Timelock.DelayUpdated(DELAY, newDelay);
        timelock.setDelay(newDelay);
    }

    function test_SetDelayRevertsIfNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(Timelock.NotAdmin.selector);
        timelock.setDelay(14 days);
    }

    function test_SetDelayRevertsIfTooSmall() public {
        vm.prank(admin);
        vm.expectRevert(Timelock.InvalidDelay.selector);
        timelock.setDelay(1 days - 1);
    }

    function test_SetDelayRevertsIfTooLarge() public {
        vm.prank(admin);
        vm.expectRevert(Timelock.InvalidDelay.selector);
        timelock.setDelay(30 days + 1);
    }

    /*//////////////////////////////////////////////////////////////
                    ADMIN FUNCTIONS - 2-step admin transfer
    //////////////////////////////////////////////////////////////*/

    function test_TwoStepAdminTransfer() public {
        address newAdmin = makeAddr("newAdmin");

        vm.prank(admin);
        timelock.setPendingAdmin(newAdmin);
        assertEq(timelock.pendingAdmin(), newAdmin);

        vm.prank(newAdmin);
        timelock.acceptAdmin();
        assertEq(timelock.admin(), newAdmin);
        assertEq(timelock.pendingAdmin(), address(0));
    }

    function test_SetPendingAdminRevertsIfNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert(Timelock.NotAdmin.selector);
        timelock.setPendingAdmin(alice);
    }

    function test_SetPendingAdminRevertsIfZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(Timelock.ZeroAddress.selector);
        timelock.setPendingAdmin(address(0));
    }

    function test_AcceptAdminRevertsIfNotPending() public {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(admin);
        timelock.setPendingAdmin(newAdmin);

        vm.prank(alice);
        vm.expectRevert(Timelock.NotPendingAdmin.selector);
        timelock.acceptAdmin();
    }

    function test_PendingAdminCanBeOverwritten() public {
        address newAdmin1 = makeAddr("newAdmin1");
        address newAdmin2 = makeAddr("newAdmin2");

        vm.startPrank(admin);
        timelock.setPendingAdmin(newAdmin1);
        timelock.setPendingAdmin(newAdmin2);
        vm.stopPrank();

        assertEq(timelock.pendingAdmin(), newAdmin2);

        vm.prank(newAdmin2);
        timelock.acceptAdmin();
        assertEq(timelock.admin(), newAdmin2);
    }

    /*//////////////////////////////////////////////////////////////
                          QUEUE TRANSACTION
    //////////////////////////////////////////////////////////////*/

    function test_QueueTransaction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        assertTrue(timelock.queuedTransactions(txHash));
        uint256 expectedEta = block.timestamp + DELAY;
        assertEq(timelock.transactionEta(txHash), expectedEta);
    }

    function test_QueueTransactionEmitsEvent() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);
        uint256 expectedEta = block.timestamp + DELAY;
        bytes32 expectedHash = keccak256(abi.encode(address(target), uint256(0), data, expectedEta));

        vm.prank(governor);
        vm.expectEmit(true, true, true, true);
        emit Timelock.TransactionQueued(expectedHash, address(target), 0, data, expectedEta);
        timelock.queueTransaction(address(target), 0, data);
    }

    function test_QueueTransactionReturnsCorrectHash() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);
        uint256 expectedEta = block.timestamp + DELAY;
        bytes32 expectedHash = keccak256(abi.encode(address(target), uint256(0), data, expectedEta));

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        assertEq(txHash, expectedHash);
    }

    function test_QueueTransactionRevertsIfNotGovernor() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(alice);
        vm.expectRevert(Timelock.NotGovernor.selector);
        timelock.queueTransaction(address(target), 0, data);
    }

    function test_QueueTransactionRevertsIfAlreadyQueued() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        timelock.queueTransaction(address(target), 0, data);

        // Queueing at same timestamp produces same hash => revert
        vm.prank(governor);
        vm.expectRevert(Timelock.TransactionAlreadyQueued.selector);
        timelock.queueTransaction(address(target), 0, data);
    }

    /*//////////////////////////////////////////////////////////////
                         EXECUTE TRANSACTION
    //////////////////////////////////////////////////////////////*/

    function test_ExecuteTransaction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Warp to eta
        vm.warp(eta);

        vm.prank(governor);
        timelock.executeTransaction(address(target), 0, data, eta);

        assertEq(target.value(), 42);
        assertFalse(timelock.queuedTransactions(txHash));
    }

    function test_ExecuteTransactionWithValue() public {
        bytes memory data = "";

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 1 ether, data);

        uint256 eta = timelock.transactionEta(txHash);
        vm.warp(eta);

        uint256 targetBalanceBefore = address(target).balance;

        vm.prank(governor);
        timelock.executeTransaction(address(target), 1 ether, data, eta);

        assertEq(address(target).balance, targetBalanceBefore + 1 ether);
    }

    function test_ExecuteTransactionEmitsEvent() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);
        vm.warp(eta);

        vm.prank(governor);
        vm.expectEmit(true, true, true, true);
        emit Timelock.TransactionExecuted(txHash, address(target), 0, data);
        timelock.executeTransaction(address(target), 0, data, eta);
    }

    function test_ExecuteTransactionRevertsIfNotGovernor() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);
        vm.warp(eta);

        vm.prank(alice);
        vm.expectRevert(Timelock.NotGovernor.selector);
        timelock.executeTransaction(address(target), 0, data, eta);
    }

    function test_ExecuteTransactionRevertsIfNotQueued() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);
        uint256 eta = block.timestamp + DELAY;

        vm.warp(eta);

        vm.prank(governor);
        vm.expectRevert(Timelock.TransactionNotQueued.selector);
        timelock.executeTransaction(address(target), 0, data, eta);
    }

    function test_ExecuteTransactionRevertsIfNotReady() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Warp to 1 second before eta
        vm.warp(eta - 1);

        vm.prank(governor);
        vm.expectRevert(Timelock.TransactionNotReady.selector);
        timelock.executeTransaction(address(target), 0, data, eta);
    }

    function test_ExecuteTransactionRevertsIfExpired() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Warp past grace period
        vm.warp(eta + 14 days + 1);

        vm.prank(governor);
        vm.expectRevert(Timelock.TransactionExpired.selector);
        timelock.executeTransaction(address(target), 0, data, eta);
    }

    function test_ExecuteTransactionRevertsIfCanceled() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Cancel the transaction
        vm.prank(securityCouncil);
        timelock.cancelTransactionByHash(txHash);

        // Warp to eta
        vm.warp(eta);

        vm.prank(governor);
        vm.expectRevert(Timelock.TransactionAlreadyCanceled.selector);
        timelock.executeTransaction(address(target), 0, data, eta);
    }

    function test_ExecuteTransactionRevertsIfExecutionFails() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(revertingTarget), 0, data);

        uint256 eta = timelock.transactionEta(txHash);
        vm.warp(eta);

        vm.prank(governor);
        vm.expectRevert(Timelock.ExecutionFailed.selector);
        timelock.executeTransaction(address(revertingTarget), 0, data, eta);
    }

    /*//////////////////////////////////////////////////////////////
                         CANCEL TRANSACTION
    //////////////////////////////////////////////////////////////*/

    function test_CancelTransaction() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        vm.prank(securityCouncil);
        timelock.cancelTransaction(address(target), 0, data, eta);

        assertTrue(timelock.canceledTransactions(txHash));
    }

    function test_CancelTransactionEmitsEvent() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        vm.prank(securityCouncil);
        vm.expectEmit(true, true, true, true);
        emit Timelock.TransactionCanceled(txHash);
        timelock.cancelTransaction(address(target), 0, data, eta);
    }

    function test_CancelTransactionRevertsIfNotSecurityCouncil() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        vm.prank(alice);
        vm.expectRevert(Timelock.NotSecurityCouncil.selector);
        timelock.cancelTransaction(address(target), 0, data, eta);
    }

    function test_CancelTransactionRevertsIfNotQueued() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);
        uint256 eta = block.timestamp + DELAY;

        vm.prank(securityCouncil);
        vm.expectRevert(Timelock.TransactionNotQueued.selector);
        timelock.cancelTransaction(address(target), 0, data, eta);
    }

    /*//////////////////////////////////////////////////////////////
                      CANCEL TRANSACTION BY HASH
    //////////////////////////////////////////////////////////////*/

    function test_CancelTransactionByHash() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        vm.prank(securityCouncil);
        timelock.cancelTransactionByHash(txHash);

        assertTrue(timelock.canceledTransactions(txHash));
    }

    function test_CancelTransactionByHashEmitsEvent() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        vm.prank(securityCouncil);
        vm.expectEmit(true, true, true, true);
        emit Timelock.TransactionCanceled(txHash);
        timelock.cancelTransactionByHash(txHash);
    }

    function test_CancelTransactionByHashRevertsIfNotSecurityCouncil() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        vm.prank(alice);
        vm.expectRevert(Timelock.NotSecurityCouncil.selector);
        timelock.cancelTransactionByHash(txHash);
    }

    function test_CancelTransactionByHashRevertsIfNotQueued() public {
        bytes32 fakeHash = keccak256("fake");

        vm.prank(securityCouncil);
        vm.expectRevert(Timelock.TransactionNotQueued.selector);
        timelock.cancelTransactionByHash(fakeHash);
    }

    /*//////////////////////////////////////////////////////////////
                          GRACE PERIOD TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ExecuteAtExactEta() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 100);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Execute at exact eta
        vm.warp(eta);

        vm.prank(governor);
        timelock.executeTransaction(address(target), 0, data, eta);

        assertEq(target.value(), 100);
    }

    function test_ExecuteAtEndOfGracePeriod() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 200);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Execute at the last second of the grace period
        vm.warp(eta + 14 days);

        vm.prank(governor);
        timelock.executeTransaction(address(target), 0, data, eta);

        assertEq(target.value(), 200);
    }

    function test_ExecuteRevertsOneSecondAfterGracePeriod() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 300);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // One second past grace period
        vm.warp(eta + 14 days + 1);

        vm.prank(governor);
        vm.expectRevert(Timelock.TransactionExpired.selector);
        timelock.executeTransaction(address(target), 0, data, eta);
    }

    function test_ExecuteInMiddleOfGracePeriod() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 400);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Execute in the middle of grace period
        vm.warp(eta + 7 days);

        vm.prank(governor);
        timelock.executeTransaction(address(target), 0, data, eta);

        assertEq(target.value(), 400);
    }

    /*//////////////////////////////////////////////////////////////
                           VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_IsQueued() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        assertTrue(timelock.isQueued(txHash));
    }

    function test_IsQueuedReturnsFalseForUnqueued() public view {
        bytes32 fakeHash = keccak256("fake");
        assertFalse(timelock.isQueued(fakeHash));
    }

    function test_IsQueuedReturnsFalseForCanceled() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        vm.prank(securityCouncil);
        timelock.cancelTransactionByHash(txHash);

        assertFalse(timelock.isQueued(txHash));
    }

    function test_IsQueuedReturnsFalseAfterExecution() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);
        vm.warp(eta);

        vm.prank(governor);
        timelock.executeTransaction(address(target), 0, data, eta);

        assertFalse(timelock.isQueued(txHash));
    }

    function test_IsReady() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        // Before eta - not ready
        assertFalse(timelock.isReady(txHash));

        // At eta - ready
        vm.warp(eta);
        assertTrue(timelock.isReady(txHash));

        // At end of grace period - still ready
        vm.warp(eta + 14 days);
        assertTrue(timelock.isReady(txHash));

        // Past grace period - not ready
        vm.warp(eta + 14 days + 1);
        assertFalse(timelock.isReady(txHash));
    }

    function test_IsReadyReturnsFalseForUnqueued() public view {
        bytes32 fakeHash = keccak256("fake");
        assertFalse(timelock.isReady(fakeHash));
    }

    function test_IsReadyReturnsFalseForCanceled() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(governor);
        bytes32 txHash = timelock.queueTransaction(address(target), 0, data);

        uint256 eta = timelock.transactionEta(txHash);

        vm.prank(securityCouncil);
        timelock.cancelTransactionByHash(txHash);

        vm.warp(eta);
        assertFalse(timelock.isReady(txHash));
    }

    function test_GetTransactionHash() public view {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);
        uint256 eta = block.timestamp + DELAY;

        bytes32 expected = keccak256(abi.encode(address(target), uint256(0), data, eta));
        bytes32 actual = timelock.getTransactionHash(address(target), 0, data, eta);

        assertEq(actual, expected);
    }

    /*//////////////////////////////////////////////////////////////
                         RECEIVE ETH
    //////////////////////////////////////////////////////////////*/

    function test_ReceiveEth() public {
        uint256 balanceBefore = address(timelock).balance;

        vm.deal(alice, 10 ether);
        vm.prank(alice);
        (bool success,) = address(timelock).call{ value: 1 ether }("");

        assertTrue(success);
        assertEq(address(timelock).balance, balanceBefore + 1 ether);
    }
}
