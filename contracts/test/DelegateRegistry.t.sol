// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { vTON } from "../src/token/vTON.sol";
import { DelegateRegistry } from "../src/governance/DelegateRegistry.sol";
import { IDelegateRegistry } from "../src/interfaces/IDelegateRegistry.sol";

contract DelegateRegistryTest is Test {
    vTON public token;
    DelegateRegistry public registry;

    address public owner;
    address public delegate1;
    address public delegate2;
    address public user1;
    address public user2;

    uint256 public constant INITIAL_BALANCE = 10_000 ether;

    function setUp() public {
        owner = makeAddr("owner");
        delegate1 = makeAddr("delegate1");
        delegate2 = makeAddr("delegate2");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy vTON
        vm.prank(owner);
        token = new vTON(owner);

        // Deploy DelegateRegistry
        vm.prank(owner);
        registry = new DelegateRegistry(address(token), owner);

        // Setup minter and mint tokens
        vm.startPrank(owner);
        token.setMinter(owner, true);
        token.mint(user1, INITIAL_BALANCE);
        token.mint(user2, INITIAL_BALANCE);
        vm.stopPrank();

        // Approve registry for users
        vm.prank(user1);
        token.approve(address(registry), type(uint256).max);

        vm.prank(user2);
        token.approve(address(registry), type(uint256).max);
    }

    /*//////////////////////////////////////////////////////////////
                        DELEGATE REGISTRATION
    //////////////////////////////////////////////////////////////*/

    function test_RegisterDelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Long-term value", "No conflicts");

        IDelegateRegistry.DelegateInfo memory info = registry.getDelegateInfo(delegate1);
        assertEq(info.profile, "Alice");
        assertEq(info.votingPhilosophy, "Long-term value");
        assertEq(info.interests, "No conflicts");
        assertTrue(info.isActive);
        assertGt(info.registeredAt, 0);
    }

    function test_RegisterDelegateRevertsIfAlreadyRegistered() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.AlreadyRegisteredDelegate.selector);
        registry.registerDelegate("Alice2", "Philosophy2", "Interests2");
    }

    function test_RegisterDelegateRevertsWithEmptyProfile() public {
        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.EmptyProfile.selector);
        registry.registerDelegate("", "Philosophy", "Interests");
    }

    function test_UpdateDelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");

        vm.prank(delegate1);
        registry.updateDelegate("Alice Updated", "Philosophy2", "Interests2");

        IDelegateRegistry.DelegateInfo memory info = registry.getDelegateInfo(delegate1);
        assertEq(info.profile, "Alice Updated");
        assertEq(info.votingPhilosophy, "Philosophy2");
    }

    function test_DeactivateDelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        registry.deactivateDelegate();

        assertFalse(registry.isRegisteredDelegate(delegate1));
    }

    /*//////////////////////////////////////////////////////////////
                              DELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Delegate() public {
        // Register delegate first
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        assertEq(registry.getTotalDelegated(delegate1), amount);
        assertEq(token.balanceOf(address(registry)), amount);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE - amount);

        IDelegateRegistry.DelegationInfo memory delegation =
            registry.getDelegation(user1, delegate1);
        assertEq(delegation.delegate, delegate1);
        assertEq(delegation.amount, amount);
    }

    function test_DelegateRevertsIfNotRegistered() public {
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.DelegateNotActive.selector);
        registry.delegate(delegate1, 1000 ether);
    }

    function test_DelegateRevertsIfDelegateInactive() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        registry.deactivateDelegate();

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.DelegateNotActive.selector);
        registry.delegate(delegate1, 1000 ether);
    }

    function test_SelfDelegationAllowed() public {
        vm.prank(user1);
        registry.registerDelegate("User1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(user1, 1000 ether);

        assertEq(registry.getTotalDelegated(user1), 1000 ether);
    }

    function test_DelegateFullBalance() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Delegate user1's full balance (10_000) - should succeed without cap
        vm.prank(user1);
        registry.delegate(delegate1, INITIAL_BALANCE);

        assertEq(registry.getTotalDelegated(delegate1), INITIAL_BALANCE);
        assertEq(token.balanceOf(user1), 0);
    }

    /*//////////////////////////////////////////////////////////////
                            UNDELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Undelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 delegateAmount = 1000 ether;
        uint256 undelegateAmount = 400 ether;

        vm.prank(user1);
        registry.delegate(delegate1, delegateAmount);

        vm.prank(user1);
        registry.undelegate(delegate1, undelegateAmount);

        assertEq(registry.getTotalDelegated(delegate1), delegateAmount - undelegateAmount);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE - delegateAmount + undelegateAmount);
    }

    function test_UndelegateAll() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        vm.prank(user1);
        registry.undelegate(delegate1, amount);

        assertEq(registry.getTotalDelegated(delegate1), 0);
        assertEq(token.balanceOf(user1), INITIAL_BALANCE);
    }

    function test_UndelegateRevertsIfInsufficientDelegation() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.InsufficientDelegation.selector);
        registry.undelegate(delegate1, 1001 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            REDELEGATION
    //////////////////////////////////////////////////////////////*/

    function test_Redelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");

        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy2", "Interests2");

        uint256 amount = 1000 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        vm.prank(user1);
        registry.redelegate(delegate1, delegate2, amount);

        assertEq(registry.getTotalDelegated(delegate1), 0);
        assertEq(registry.getTotalDelegated(delegate2), amount);
    }

    function test_RedelegatePartial() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");

        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy2", "Interests2");

        uint256 amount = 1000 ether;
        uint256 redelegateAmount = 400 ether;

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        vm.prank(user1);
        registry.redelegate(delegate1, delegate2, redelegateAmount);

        assertEq(registry.getTotalDelegated(delegate1), amount - redelegateAmount);
        assertEq(registry.getTotalDelegated(delegate2), redelegateAmount);
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_SetAutoExpiryPeriod() public {
        vm.prank(owner);
        registry.setAutoExpiryPeriod(30 days);

        assertEq(registry.autoExpiryPeriod(), 30 days);
    }

    /*//////////////////////////////////////////////////////////////
                             FUZZ TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzz_DelegateAnyAmount(uint256 amount) public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Can delegate any amount up to user's balance
        amount = bound(amount, 1, INITIAL_BALANCE);

        vm.prank(user1);
        registry.delegate(delegate1, amount);

        assertEq(registry.getTotalDelegated(delegate1), amount);
    }

    /*//////////////////////////////////////////////////////////////
                       VOTING POWER SNAPSHOT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_GetVotingPowerAtSnapshot() public {
        // Register delegate1
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Roll to a known block for the first delegation
        vm.roll(100);

        // user1 delegates 1000 ether to delegate1 at block 100
        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Roll forward 10 blocks to block 110
        vm.roll(110);

        // user1 delegates another 500 ether at block 110
        vm.prank(user1);
        registry.delegate(delegate1, 500 ether);

        // Roll to block 120 so we can query past blocks
        vm.roll(120);

        // Verify getVotingPower at block 100 returns 1000 ether (not 1500)
        assertEq(registry.getVotingPower(delegate1, 100, 0), 1000 ether);

        // Verify getVotingPower at block 110 returns 1500 ether
        assertEq(registry.getVotingPower(delegate1, 110, 0), 1500 ether);
    }

    /*//////////////////////////////////////////////////////////////
                         BURN & UNDELEGATE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UndelegateAfterBurn() public {
        // Register delegate1
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Set governor to this test contract
        vm.prank(owner);
        registry.setGovernor(address(this));

        // user1 delegates 1000 ether
        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Burn 200 ether from delegate1 (as governor)
        registry.burnFromDelegate(delegate1, 200 ether);

        // Now totalDelegated = 800, totalBurned = 200
        assertEq(registry.getTotalDelegated(delegate1), 800 ether);
        assertEq(registry.getTotalBurnedFromDelegate(delegate1), 200 ether);

        uint256 user1BalanceBefore = token.balanceOf(user1);

        // user1 undelegates 1000 ether (their full delegation amount)
        // actualReturn = 1000 * 800 / (800 + 200) = 800
        vm.prank(user1);
        registry.undelegate(delegate1, 1000 ether);

        // Verify user1 received 800 ether (not 1000)
        assertEq(token.balanceOf(user1) - user1BalanceBefore, 800 ether);

        // Verify totalDelegated is 0
        assertEq(registry.getTotalDelegated(delegate1), 0);

        // Verify totalBurned is 0
        assertEq(registry.getTotalBurnedFromDelegate(delegate1), 0);
    }

    function test_MultipleBurnsThenUndelegate() public {
        // Register delegate1
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Set governor to this test contract
        vm.prank(owner);
        registry.setGovernor(address(this));

        // user1 delegates 500 ether, user2 delegates 500 ether (total 1000)
        vm.prank(user1);
        registry.delegate(delegate1, 500 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 500 ether);

        assertEq(registry.getTotalDelegated(delegate1), 1000 ether);

        // Burn 100 from delegate1 -> totalDelegated=900, burned=100
        registry.burnFromDelegate(delegate1, 100 ether);
        assertEq(registry.getTotalDelegated(delegate1), 900 ether);
        assertEq(registry.getTotalBurnedFromDelegate(delegate1), 100 ether);

        // Burn 100 more -> totalDelegated=800, burned=200
        registry.burnFromDelegate(delegate1, 100 ether);
        assertEq(registry.getTotalDelegated(delegate1), 800 ether);
        assertEq(registry.getTotalBurnedFromDelegate(delegate1), 200 ether);

        // user1 undelegates 500: actualReturn = 500 * 800 / (800+200) = 400
        uint256 user1BalanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        registry.undelegate(delegate1, 500 ether);

        // Verify user1 got 400 ether back
        assertEq(token.balanceOf(user1) - user1BalanceBefore, 400 ether);

        // totalDelegated should be 400, burned should be 100 (200 - 100)
        assertEq(registry.getTotalDelegated(delegate1), 400 ether);
        assertEq(registry.getTotalBurnedFromDelegate(delegate1), 100 ether);

        // user2 undelegates 500: actualReturn = 500 * 400 / (400+100) = 400
        uint256 user2BalanceBefore = token.balanceOf(user2);
        vm.prank(user2);
        registry.undelegate(delegate1, 500 ether);

        // Verify user2 got 400 ether back
        assertEq(token.balanceOf(user2) - user2BalanceBefore, 400 ether);

        // totalDelegated=0, burned=0
        assertEq(registry.getTotalDelegated(delegate1), 0);
        assertEq(registry.getTotalBurnedFromDelegate(delegate1), 0);
    }

    /*//////////////////////////////////////////////////////////////
                       TOTAL DELEGATED ALL TESTS
    //////////////////////////////////////////////////////////////*/

    function test_TotalDelegatedAll() public {
        // Register delegate1 and delegate2
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");

        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy2", "Interests2");

        // user1 delegates 1000 to delegate1
        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);
        assertEq(registry.totalDelegatedAll(), 1000 ether);

        // user2 delegates 2000 to delegate2
        vm.prank(user2);
        registry.delegate(delegate2, 2000 ether);
        assertEq(registry.totalDelegatedAll(), 3000 ether);

        // user1 undelegates 500 from delegate1
        vm.prank(user1);
        registry.undelegate(delegate1, 500 ether);
        assertEq(registry.totalDelegatedAll(), 2500 ether);
    }

    /*//////////////////////////////////////////////////////////////
                    REDELEGATE WITH BURN TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RedelegateWithBurn() public {
        // Register delegates
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");
        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy2", "Interests2");

        // Set governor
        vm.prank(owner);
        registry.setGovernor(address(this));

        // user1 delegates 1000 to delegate1
        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Burn 200 from delegate1
        registry.burnFromDelegate(delegate1, 200 ether);

        uint256 totalAllBefore = registry.totalDelegatedAll();
        uint256 totalByBefore = registry.getTotalDelegatedBy(user1);

        // Redelegate 1000 from delegate1 to delegate2
        // proportionalAmount = 1000 * 800 / (800 + 200) = 800
        // burnShare = 1000 - 800 = 200
        vm.prank(user1);
        registry.redelegate(delegate1, delegate2, 1000 ether);

        // delegate1 should have 0 delegated
        assertEq(registry.getTotalDelegated(delegate1), 0);
        // delegate2 should have 800 (proportional amount)
        assertEq(registry.getTotalDelegated(delegate2), 800 ether);
        // totalDelegatedAll should decrease by burnShare (200)
        assertEq(registry.totalDelegatedAll(), totalAllBefore - 200 ether);
        // totalDelegatedBy should decrease by burnShare (200)
        assertEq(registry.getTotalDelegatedBy(user1), totalByBefore - 200 ether);
    }

    function test_GetTotalDelegatedByAfterRedelegate() public {
        // Register delegates
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy1", "Interests1");
        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy2", "Interests2");

        vm.prank(owner);
        registry.setGovernor(address(this));

        // user1 delegates 1000 to delegate1
        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // No burn, redelegate 500
        vm.prank(user1);
        registry.redelegate(delegate1, delegate2, 500 ether);

        // No burn, so totalDelegatedBy should be unchanged
        assertEq(registry.getTotalDelegatedBy(user1), 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                    REACTIVATE DELEGATE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ReactivateDelegate() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        registry.deactivateDelegate();
        assertFalse(registry.isRegisteredDelegate(delegate1));

        vm.prank(delegate1);
        registry.reactivateDelegate();
        assertTrue(registry.isRegisteredDelegate(delegate1));
    }

    function test_ReactivateRevertsIfNotRegistered() public {
        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.NotRegisteredDelegate.selector);
        registry.reactivateDelegate();
    }

    function test_ReactivateRevertsIfAlreadyActive() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.AlreadyRegisteredDelegate.selector);
        registry.reactivateDelegate();
    }

    function test_DeactivatedDelegateExistingDelegations() public {
        // Register and delegate
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Deactivate delegate
        vm.prank(delegate1);
        registry.deactivateDelegate();

        // Existing delegation should still be undelegatable
        vm.prank(user1);
        registry.undelegate(delegate1, 1000 ether);

        assertEq(token.balanceOf(user1), INITIAL_BALANCE);
    }

    function test_RedelegateToSelf() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Redelegate to self should work
        vm.prank(user1);
        registry.redelegate(delegate1, delegate1, 500 ether);

        assertEq(registry.getTotalDelegated(delegate1), 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                    GOVERNOR UPDATED EVENT TEST
    //////////////////////////////////////////////////////////////*/

    function test_SetGovernorEmitsEvent() public {
        address newGovernor = makeAddr("newGovernor");

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDelegateRegistry.GovernorUpdated(address(0), newGovernor);
        registry.setGovernor(newGovernor);
    }

    /*//////////////////////////////////////////////////////////////
                    ZERO ADDRESS EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DelegateRevertsOnZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAddress.selector);
        registry.delegate(address(0), 1000 ether);
    }

    function test_UndelegateRevertsOnZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAddress.selector);
        registry.undelegate(address(0), 1000 ether);
    }

    function test_RedelegateRevertsOnZeroFromAddress() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAddress.selector);
        registry.redelegate(address(0), delegate1, 1000 ether);
    }

    function test_RedelegateRevertsOnZeroToAddress() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAddress.selector);
        registry.redelegate(delegate1, address(0), 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                    REDELEGATE TO INACTIVE DELEGATE TEST
    //////////////////////////////////////////////////////////////*/

    function test_RedelegateToInactiveDelegateReverts() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Deactivate destination delegate
        vm.prank(delegate2);
        registry.deactivateDelegate();

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.DelegateNotActive.selector);
        registry.redelegate(delegate1, delegate2, 500 ether);
    }

    /*//////////////////////////////////////////////////////////////
                    ZERO AMOUNT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DelegateRevertsOnZeroAmount() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAmount.selector);
        registry.delegate(delegate1, 0);
    }

    function test_UndelegateRevertsOnZeroAmount() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAmount.selector);
        registry.undelegate(delegate1, 0);
    }

    function test_RedelegateRevertsOnZeroAmount() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");
        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAmount.selector);
        registry.redelegate(delegate1, delegate2, 0);
    }

    /*//////////////////////////////////////////////////////////////
                    SET GOVERNOR ZERO ADDRESS TEST
    //////////////////////////////////////////////////////////////*/

    function test_SetGovernorRevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(DelegateRegistry.ZeroAddress.selector);
        registry.setGovernor(address(0));
    }

    /*//////////////////////////////////////////////////////////////
                    BURN FROM DELEGATE EXCEEDING TEST
    //////////////////////////////////////////////////////////////*/

    function test_BurnFromDelegateRevertsOnInsufficientDelegation() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(owner);
        registry.setGovernor(address(this));

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Try to burn more than delegated
        vm.expectRevert(DelegateRegistry.InsufficientDelegation.selector);
        registry.burnFromDelegate(delegate1, 1001 ether);
    }

    /*//////////////////////////////////////////////////////////////
                    GET ALL DELEGATES TEST
    //////////////////////////////////////////////////////////////*/

    function test_GetAllDelegates() public {
        // Initially no delegates
        address[] memory delegates = registry.getAllDelegates();
        assertEq(delegates.length, 0);

        // Register two delegates
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy", "Interests");

        delegates = registry.getAllDelegates();
        assertEq(delegates.length, 2);
        assertEq(delegates[0], delegate1);
        assertEq(delegates[1], delegate2);
    }

    /*//////////////////////////////////////////////////////////////
                    AUDIT FIX VERIFICATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_UpdateDelegateRevertsIfNotRegistered() public {
        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.NotRegisteredDelegate.selector);
        registry.updateDelegate("New", "New", "New");
    }

    function test_DeactivateDelegateRevertsIfNotRegistered() public {
        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.NotRegisteredDelegate.selector);
        registry.deactivateDelegate();
    }

    function test_DeactivateDelegateIdempotency() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(delegate1);
        registry.deactivateDelegate();

        // Second deactivation should revert (already inactive)
        vm.prank(delegate1);
        vm.expectRevert(DelegateRegistry.NotRegisteredDelegate.selector);
        registry.deactivateDelegate();
    }

    function test_AutoExpiryFieldSetCorrectly() public {
        vm.prank(owner);
        registry.setAutoExpiryPeriod(90 days);

        assertEq(registry.autoExpiryPeriod(), 90 days);
    }

    function test_BurnFromDelegateByNonGovernorReverts() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // user1 tries to burn — should revert since they're not governor
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.NotGovernor.selector);
        registry.burnFromDelegate(delegate1, 100 ether);
    }

    function test_SetAutoExpiryPeriodRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.setAutoExpiryPeriod(30 days);
    }

    function test_SetGovernorRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.setGovernor(makeAddr("newGov"));
    }

    function test_SelfRedelegateWithActiveBurns() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(owner);
        registry.setGovernor(address(this));

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Burn 200 from delegate1
        registry.burnFromDelegate(delegate1, 200 ether);

        // Self-redelegate (from delegate1 to delegate1)
        vm.prank(user1);
        registry.redelegate(delegate1, delegate1, 1000 ether);

        // After self-redelegate with burn:
        // proportionalAmount = 1000 * 800 / (800 + 200) = 800
        // burnShare = 1000 - 800 = 200
        // delegate1 totalDelegated stays at 800
        assertEq(registry.getTotalDelegated(delegate1), 800 ether);
    }

    function test_RedelegateWithNoPriorDelegationReverts() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");
        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy", "Interests");

        // user1 never delegated to delegate1
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.InsufficientDelegation.selector);
        registry.redelegate(delegate1, delegate2, 100 ether);
    }

    function test_GetVotingPowerAtBlockZero() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // Voting power at block 0 should be 0
        assertEq(registry.getVotingPower(delegate1, 0, 0), 0);
    }

    function test_GetAllDelegatesIncludesDeactivated() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");
        vm.prank(delegate2);
        registry.registerDelegate("Bob", "Philosophy", "Interests");

        // Deactivate delegate1
        vm.prank(delegate1);
        registry.deactivateDelegate();

        // getAllDelegates should still include deactivated delegates
        address[] memory delegates = registry.getAllDelegates();
        assertEq(delegates.length, 2);
    }

    /*//////////////////////////////////////////////////////////////
                    REGISTER DELEGATE FOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_RegisterDelegateFor() public {
        vm.prank(user1);
        registry.registerDelegateFor(delegate1, "Alice", "Long-term value", "No conflicts");

        IDelegateRegistry.DelegateInfo memory info = registry.getDelegateInfo(delegate1);
        assertEq(info.profile, "Alice");
        assertEq(info.votingPhilosophy, "Long-term value");
        assertEq(info.interests, "No conflicts");
        assertTrue(info.isActive);
        assertGt(info.registeredAt, 0);
        assertTrue(registry.isRegisteredDelegate(delegate1));
    }

    function test_RegisterDelegateForRevertsIfAlreadyRegistered() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.AlreadyRegisteredDelegate.selector);
        registry.registerDelegateFor(delegate1, "Alice2", "Philosophy2", "Interests2");
    }

    function test_RegisterDelegateForRevertsWithEmptyProfile() public {
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.EmptyProfile.selector);
        registry.registerDelegateFor(delegate1, "", "Philosophy", "Interests");
    }

    function test_RegisterDelegateForRevertsOnZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.ZeroAddress.selector);
        registry.registerDelegateFor(address(0), "Alice", "Philosophy", "Interests");
    }

    /*//////////////////////////////////////////////////////////////
                    PERMIT DELEGATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_DelegateWithPermit() public {
        // Register delegate1
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;
        uint256 deadline = block.timestamp + 1 hours;

        // Create a user with a known private key for signing
        uint256 userPk = 0xA11CE;
        address userAddr = vm.addr(userPk);

        // Mint tokens to the user
        vm.prank(owner);
        token.mint(userAddr, INITIAL_BALANCE);

        // Build EIP-712 permit digest
        bytes32 PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        uint256 nonce = token.nonces(userAddr);

        bytes32 structHash = keccak256(abi.encode(
            PERMIT_TYPEHASH,
            userAddr,
            address(registry),
            amount,
            nonce,
            deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, digest);

        // Call delegateWithPermit
        vm.prank(userAddr);
        registry.delegateWithPermit(delegate1, amount, deadline, v, r, s);

        // Verify delegation
        assertEq(registry.getTotalDelegated(delegate1), amount);
        assertEq(token.balanceOf(userAddr), INITIAL_BALANCE - amount);
        assertEq(token.balanceOf(address(registry)), amount);

        IDelegateRegistry.DelegationInfo memory delegation = registry.getDelegation(userAddr, delegate1);
        assertEq(delegation.delegate, delegate1);
        assertEq(delegation.amount, amount);
    }

    function test_RegisterDelegateForAndDelegateWithPermit() public {
        uint256 amount = 500 ether;
        uint256 deadline = block.timestamp + 1 hours;

        // Create a user with a known private key for signing
        uint256 userPk = 0xB0B;
        address userAddr = vm.addr(userPk);

        // Mint tokens to the user
        vm.prank(owner);
        token.mint(userAddr, INITIAL_BALANCE);

        // Build EIP-712 permit digest
        bytes32 PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        uint256 nonce = token.nonces(userAddr);

        bytes32 structHash = keccak256(abi.encode(
            PERMIT_TYPEHASH,
            userAddr,
            address(registry),
            amount,
            nonce,
            deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, digest);

        // delegate1 is not registered yet
        assertFalse(registry.isRegisteredDelegate(delegate1));

        // Call registerDelegateForAndDelegateWithPermit
        vm.prank(userAddr);
        registry.registerDelegateForAndDelegateWithPermit(
            delegate1,
            "Agent",
            "Automated voting",
            "governance",
            amount,
            deadline,
            v, r, s
        );

        // Verify registration
        assertTrue(registry.isRegisteredDelegate(delegate1));
        IDelegateRegistry.DelegateInfo memory info = registry.getDelegateInfo(delegate1);
        assertEq(info.profile, "Agent");

        // Verify delegation
        assertEq(registry.getTotalDelegated(delegate1), amount);
        assertEq(token.balanceOf(userAddr), INITIAL_BALANCE - amount);
    }

    function test_DelegateWithPermitRevertsOnExpiredDeadline() public {
        // Register delegate1
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        uint256 amount = 1000 ether;
        uint256 deadline = block.timestamp - 1; // Already expired

        uint256 userPk = 0xDEAD;
        address userAddr = vm.addr(userPk);

        vm.prank(owner);
        token.mint(userAddr, INITIAL_BALANCE);

        // Build permit digest with expired deadline
        bytes32 PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        uint256 nonce = token.nonces(userAddr);

        bytes32 structHash = keccak256(abi.encode(
            PERMIT_TYPEHASH,
            userAddr,
            address(registry),
            amount,
            nonce,
            deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPk, digest);

        // Should revert with ERC2612ExpiredSignature
        vm.prank(userAddr);
        vm.expectRevert();
        registry.delegateWithPermit(delegate1, amount, deadline, v, r, s);
    }

    function test_GetTotalDelegatedByPerUserIsolation() public {
        vm.prank(delegate1);
        registry.registerDelegate("Alice", "Philosophy", "Interests");

        // user1 delegates 500
        vm.prank(user1);
        registry.delegate(delegate1, 500 ether);

        // user2 delegates 300
        vm.prank(user2);
        registry.delegate(delegate1, 300 ether);

        // Each user's totalDelegatedBy should be independent
        assertEq(registry.getTotalDelegatedBy(user1), 500 ether);
        assertEq(registry.getTotalDelegatedBy(user2), 300 ether);
    }
}
