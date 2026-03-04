// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test, console } from "forge-std/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { vTON } from "../src/token/vTON.sol";
import { DelegateRegistry } from "../src/governance/DelegateRegistry.sol";
import { DAOGovernor } from "../src/governance/DAOGovernor.sol";
import { Timelock } from "../src/governance/Timelock.sol";
import { IDAOGovernor } from "../src/interfaces/IDAOGovernor.sol";
import { SecurityCouncil } from "../src/governance/SecurityCouncil.sol";
import { ISecurityCouncil } from "../src/interfaces/ISecurityCouncil.sol";

/// @notice Mock execution target for testing proposal execution
contract MockExecutionTarget {
    uint256 public value;

    function setValue(uint256 _value) external payable {
        value = _value;
    }
}

/// @notice Mock TON token for testing
contract MockTON is ERC20 {
    constructor() ERC20("Tokamak Network Token", "TON") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DAOGovernorTest is Test {
    MockTON public ton;
    vTON public vton;
    DelegateRegistry public registry;
    Timelock public timelock;
    DAOGovernor public governor;

    address public owner;
    address public delegate1;
    address public user1;
    address public user2;

    uint256 public constant INITIAL_BALANCE = 100_000 ether;
    uint256 public constant PROPOSAL_COST = 10 ether;

    function setUp() public {
        owner = makeAddr("owner");
        delegate1 = makeAddr("delegate1");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy contracts
        vm.startPrank(owner);

        ton = new MockTON();
        vton = new vTON(owner);
        registry = new DelegateRegistry(address(vton), owner);
        timelock = new Timelock(owner, 7 days);

        governor = new DAOGovernor(
            address(ton), address(vton), address(registry), address(timelock), owner
        );

        // Setup
        vton.setMinter(owner, true);
        vton.mint(user1, INITIAL_BALANCE);
        vton.mint(user2, INITIAL_BALANCE);

        timelock.setGovernor(address(governor));

        // Set maturity period to 0 for existing tests (test maturity separately)
        governor.setMaturityPeriod(0);

        vm.stopPrank();

        // Setup approvals
        vm.prank(user1);
        ton.approve(address(governor), type(uint256).max);

        vm.prank(user1);
        vton.approve(address(registry), type(uint256).max);

        vm.prank(user2);
        vton.approve(address(registry), type(uint256).max);

        // Give user1 some TON for proposal creation
        vm.prank(owner);
        ton.transfer(user1, 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Deployment() public view {
        assertEq(address(governor.ton()), address(ton));
        assertEq(address(governor.vTON()), address(vton));
        assertEq(address(governor.delegateRegistry()), address(registry));
        assertEq(governor.timelock(), address(timelock));
        assertEq(governor.proposalCreationCost(), PROPOSAL_COST);
        assertEq(governor.quorum(), 400); // 4%
    }

    /*//////////////////////////////////////////////////////////////
                           PROPOSAL CREATION
    //////////////////////////////////////////////////////////////*/

    function test_CreateProposal() public {
        // Register as delegate (required to interact with governance)
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        string memory description = "Update quorum to 5%";

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, description, 0);

        assertGt(proposalId, 0);
        assertEq(governor.proposalCount(), 1);

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.proposer, user1);
        assertEq(proposal.targets[0], address(governor));
    }

    function test_CreateProposalBurnsTON() public {
        uint256 balanceBefore = ton.balanceOf(user1);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        governor.propose(targets, values, calldatas, "Test", 0);

        // TON should be burned (sent to 0xdead)
        assertEq(ton.balanceOf(user1), balanceBefore - PROPOSAL_COST);
        assertEq(ton.balanceOf(address(0xdead)), PROPOSAL_COST);
    }

    /*//////////////////////////////////////////////////////////////
                               VOTING
    //////////////////////////////////////////////////////////////*/

    function test_CastVote() public {
        // Setup: Register delegate and delegate vTON
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Wait for delegation period
        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        // Move to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Cast vote as delegate
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        assertTrue(governor.hasVoted(proposalId, delegate1));

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertGt(proposal.forVotes, 0);
    }

    function test_CastVoteRevertsIfNotDelegate() public {
        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        // Move to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Try to vote as non-delegate
        vm.prank(user1);
        vm.expectRevert(DAOGovernor.NotDelegate.selector);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
    }

    function test_CastVoteWithReason() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(delegate1);
        governor.castVoteWithReason(proposalId, IDAOGovernor.VoteType.For, "I support this");

        assertTrue(governor.hasVoted(proposalId, delegate1));
    }

    /*//////////////////////////////////////////////////////////////
                           PROPOSAL STATES
    //////////////////////////////////////////////////////////////*/

    function test_ProposalStatePending() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Pending));
    }

    function test_ProposalStateActive() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Active));
    }

    function test_CancelProposal() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        vm.prank(user1);
        governor.cancel(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    function test_CancelProposalRevertsIfNotProposerOrGuardian() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        vm.prank(user2);
        vm.expectRevert(IDAOGovernor.NotAuthorizedToCancel.selector);
        governor.cancel(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function test_SetQuorum() public {
        vm.prank(owner);
        governor.setQuorum(500);

        assertEq(governor.quorum(), 500);
    }

    function test_SetProposalCreationCost() public {
        vm.prank(owner);
        governor.setProposalCreationCost(200 ether);

        assertEq(governor.proposalCreationCost(), 200 ether);
    }

    function test_SetVotingDelay() public {
        vm.prank(owner);
        governor.setVotingDelay(14_400);

        assertEq(governor.votingDelay(), 14_400);
    }

    function test_SetVotingPeriod() public {
        vm.prank(owner);
        governor.setVotingPeriod(100_800);

        assertEq(governor.votingPeriod(), 100_800);
    }

    /*//////////////////////////////////////////////////////////////
                           HASH PROPOSAL
    //////////////////////////////////////////////////////////////*/

    function test_HashProposal() public view {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        bytes32 descHash = keccak256(bytes("Test"));

        uint256 hash1 = governor.hashProposal(targets, values, calldatas, descHash);
        uint256 hash2 = governor.hashProposal(targets, values, calldatas, descHash);

        assertEq(hash1, hash2);
    }

    /*//////////////////////////////////////////////////////////////
                        PROPOSAL GUARDIAN TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetProposalGuardian() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        assertEq(governor.proposalGuardian(), guardian);
    }

    function test_SetProposalGuardianEmitsEvent() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.ProposalGuardianSet(address(0), guardian);
        governor.setProposalGuardian(guardian);
    }

    function test_SetProposalGuardianOnlyOwner() public {
        address guardian = makeAddr("guardian");

        vm.prank(user1);
        vm.expectRevert();
        governor.setProposalGuardian(guardian);
    }

    function test_GuardianCanCancelPendingProposal() public {
        address guardian = makeAddr("guardian");

        // Set guardian
        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Create proposal (state: Pending)
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Pending));

        // Guardian cancels
        vm.prank(guardian);
        governor.cancel(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    function test_GuardianCanCancelActiveProposal() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        // Move to voting period (state: Active)
        vm.roll(block.number + governor.votingDelay() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Active));

        // Guardian cancels
        vm.prank(guardian);
        governor.cancel(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    function test_GuardianCanCancelSucceededProposal() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Setup delegate with voting power
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        // Wait for delegation period
        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        // Move to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Cast vote
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // Move past voting period (state: Succeeded)
        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));

        // Guardian cancels
        vm.prank(guardian);
        governor.cancel(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    function test_GuardianCanCancelQueuedProposal() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Setup delegate with voting power
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        vm.roll(block.number + governor.votingPeriod() + 1);

        // Queue proposal (state: Queued)
        governor.queue(proposalId);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Queued));

        // Guardian cancels
        vm.prank(guardian);
        governor.cancel(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    function test_GuardianCannotCancelDefeatedProposal() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        // Move past voting period without any votes (state: Defeated due to no quorum)
        vm.roll(block.number + governor.votingDelay() + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Defeated));

        // Guardian cannot cancel Defeated proposal
        vm.prank(guardian);
        vm.expectRevert(IDAOGovernor.InvalidProposalState.selector);
        governor.cancel(proposalId);
    }

    function test_GuardianCannotCancelExpiredProposal() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Setup delegate with voting power
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        vm.roll(block.number + governor.votingPeriod() + 1);

        // Queue proposal
        governor.queue(proposalId);

        // Move past grace period (state: Expired)
        vm.warp(block.timestamp + 7 days + 14 days + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Expired));

        // Guardian cannot cancel Expired proposal
        vm.prank(guardian);
        vm.expectRevert(IDAOGovernor.InvalidProposalState.selector);
        governor.cancel(proposalId);
    }

    function test_NonGuardianCannotCancelOthersProposal() public {
        address guardian = makeAddr("guardian");
        address nonGuardian = makeAddr("nonGuardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        // Non-guardian cannot cancel others' proposal
        vm.prank(nonGuardian);
        vm.expectRevert(IDAOGovernor.NotAuthorizedToCancel.selector);
        governor.cancel(proposalId);
    }

    function test_ProposerCannotCancelDefeatedProposal() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        // Move past voting period without any votes (state: Defeated)
        vm.roll(block.number + governor.votingDelay() + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Defeated));

        // Proposer cannot cancel Defeated proposal (only Pending/Active)
        vm.prank(user1);
        vm.expectRevert(IDAOGovernor.InvalidProposalState.selector);
        governor.cancel(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                           BURN RATE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CreateProposalWithBurnRate() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 3000); // 30%

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.burnRate, 3000);
    }

    function test_CreateProposalInvalidBurnRate() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        vm.expectRevert(IDAOGovernor.InvalidBurnRate.selector);
        governor.propose(targets, values, calldatas, "Test", 10001); // 100.01% - invalid
    }

    function test_CastVoteWithBurn() public {
        // Setup: Register delegate and delegate vTON
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Set governor on registry
        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal with 30% burn rate
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 3000); // 30%

        vm.roll(block.number + governor.votingDelay() + 1);

        uint256 delegateTotalBefore = registry.getTotalDelegated(delegate1);
        uint256 deadBalanceBefore = vton.balanceOf(address(0xdead));

        // Cast vote - should burn 30% of voting power
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        uint256 delegateTotalAfter = registry.getTotalDelegated(delegate1);
        uint256 deadBalanceAfter = vton.balanceOf(address(0xdead));

        // Voting power was 1000 ether, burn 30% = 300 ether
        assertEq(delegateTotalBefore - delegateTotalAfter, 300 ether);
        assertEq(deadBalanceAfter - deadBalanceBefore, 300 ether);

        // Vote should still count with full weight (1000 ether)
        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.forVotes, 1000 ether);
    }

    function test_CastVoteZeroBurnRate() public {
        // Setup: Register delegate and delegate vTON
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal with 0% burn rate
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        uint256 delegateTotalBefore = registry.getTotalDelegated(delegate1);

        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        uint256 delegateTotalAfter = registry.getTotalDelegated(delegate1);

        // No burn with 0% rate
        assertEq(delegateTotalBefore, delegateTotalAfter);
    }

    function test_CastVoteInsufficientBalanceForBurn() public {
        // Setup: Register delegate and delegate vTON
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        // Delegate only 100 ether
        vm.prank(user1);
        registry.delegate(delegate1, 100 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal with 100% burn rate
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 10000); // 100%

        vm.roll(block.number + governor.votingDelay() + 1);

        // Cast vote - should burn 100% (100 ether)
        // First vote succeeds
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // After voting, delegate should have 0 total delegated
        assertEq(registry.getTotalDelegated(delegate1), 0);
    }

    function test_BurnFromDelegateOnlyGovernor() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        // Try to call burnFromDelegate without being governor
        vm.prank(user1);
        vm.expectRevert(DelegateRegistry.NotGovernor.selector);
        registry.burnFromDelegate(delegate1, 100 ether);
    }

    function test_VoteBurnEvent() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test", 3000); // 30%

        vm.roll(block.number + governor.votingDelay() + 1);

        // Expect VoteBurn event
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.VoteBurn(delegate1, proposalId, 300 ether);

        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
    }

    /*//////////////////////////////////////////////////////////////
                    PROPOSAL FULL LIFECYCLE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ProposalFullLifecycle() public {
        // Deploy mock execution target
        MockExecutionTarget target = new MockExecutionTarget();
        assertEq(target.value(), 0);

        // Register delegate and delegate 10k vTON from user1 and user2
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        // Set governor on registry (for burn compatibility)
        vm.prank(owner);
        registry.setGovernor(address(governor));

        // Wait for delegation period (7+ days)
        vm.warp(block.timestamp + 8 days);

        // Create proposal: target.setValue(42)
        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Set value to 42", 0);

        // Verify Pending state
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Pending));

        // Roll to voting period, verify Active
        vm.roll(block.number + governor.votingDelay() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Active));

        // Cast For vote
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // Roll past voting period, verify Succeeded
        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));

        // Queue, verify Queued
        governor.queue(proposalId);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Queued));

        // Warp past timelock delay (7 days), execute
        vm.warp(block.timestamp + 7 days + 1);
        governor.execute(proposalId);

        // Verify Executed state and effect
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Executed));
        assertEq(target.value(), 42);
    }

    function test_ExecuteRevertsBeforeTimelock() public {
        // Deploy mock execution target
        MockExecutionTarget target = new MockExecutionTarget();

        // Setup delegate with voting power
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Set value to 42", 0);

        // Move to voting, vote, move past voting, queue
        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.roll(block.number + governor.votingPeriod() + 1);
        governor.queue(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Queued));

        // Try to execute before timelock delay expires
        vm.expectRevert(DAOGovernor.TimelockNotReady.selector);
        governor.execute(proposalId);
    }

    function test_ExecuteRevertsAfterGracePeriod() public {
        // Deploy mock execution target
        MockExecutionTarget target = new MockExecutionTarget();

        // Setup delegate with voting power
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Set value to 42", 0);

        // Move to voting, vote, move past voting, queue
        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.roll(block.number + governor.votingPeriod() + 1);
        governor.queue(proposalId);

        // Warp past timelock + grace period (7 days + 14 days + 1)
        vm.warp(block.timestamp + 7 days + 14 days + 1);

        // State should be Expired
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Expired));

        // Trying to execute should fail (state is not Queued)
        vm.expectRevert(DAOGovernor.ProposalNotQueued.selector);
        governor.execute(proposalId);
    }

    function test_DefeatedByVotes() public {
        // Register delegate1 and delegate2
        address delegate2 = makeAddr("delegate2");

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(delegate2);
        registry.registerDelegate("Delegate2", "Philosophy2", "Interests2");

        // Delegate 10k from user1 to delegate1, 10k from user2 to delegate2
        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate2, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        // Wait for delegation period
        vm.warp(block.timestamp + 8 days);

        // Create proposal with 0 burn rate
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test defeated", 0);

        // Roll to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // delegate1 votes For, delegate2 votes Against (equal votes)
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        vm.prank(delegate2);
        governor.castVote(proposalId, IDAOGovernor.VoteType.Against);

        // Roll past voting period
        vm.roll(block.number + governor.votingPeriod() + 1);

        // Should be Defeated: forPercentage = 50% which is NOT > passRate 50%
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Defeated));
    }

    function test_DoubleVotePrevention() public {
        // Register delegate and delegate vTON
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test double vote", 0);

        // Roll to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Vote once For
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // Try to vote again
        vm.prank(delegate1);
        vm.expectRevert(DAOGovernor.AlreadyVoted.selector);
        governor.castVote(proposalId, IDAOGovernor.VoteType.Against);
    }

    function test_InsufficientProposalThreshold() public {
        // Give user2 some TON for proposal creation
        vm.prank(owner);
        ton.transfer(user2, 100 ether);
        vm.prank(user2);
        ton.approve(address(governor), type(uint256).max);

        // Set threshold to 5001 basis points (50.01%)
        // Required: 200_000 ether * 5001 / 10_000 = 100_020 ether
        // user2 has 100_000 ether vTON balance + 0 delegated = 100_000 ether (insufficient)
        vm.prank(owner);
        governor.setProposalThreshold(5001);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user2);
        vm.expectRevert(DAOGovernor.InsufficientVTON.selector);
        governor.propose(targets, values, calldatas, "Threshold test", 0);
    }

    /*//////////////////////////////////////////////////////////////
                    QUORUM SNAPSHOT TESTS (H3)
    //////////////////////////////////////////////////////////////*/

    function test_QuorumUsesSnapshotValue() public {
        // Register delegate and delegate
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal — totalDelegatedAtSnapshot = 20k
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Quorum snapshot test", 0);

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.totalDelegatedAtSnapshot, 20_000 ether);

        // Add more delegations AFTER proposal creation (should NOT affect quorum)
        address user3 = makeAddr("user3");
        vm.prank(owner);
        vton.mint(user3, 100_000 ether);
        vm.prank(user3);
        vton.approve(address(registry), type(uint256).max);
        vm.prank(user3);
        registry.delegate(delegate1, 100_000 ether);

        // Now totalDelegatedAll = 120k, but quorum should still use snapshot value 20k
        // requiredQuorum = 20k * 400 / 10000 = 800

        // Roll to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Cast vote
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // Roll past voting period
        vm.roll(block.number + governor.votingPeriod() + 1);

        // Should be Succeeded (totalVotes=130k votes > requiredQuorum=800)
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));
    }

    /*//////////////////////////////////////////////////////////////
                    DELEGATION MATURITY TESTS (H2)
    //////////////////////////////////////////////////////////////*/

    function test_DelegationMaturityEnforced() public {
        // Set maturity period to a small value for testing
        vm.prank(owner);
        governor.setMaturityPeriod(100);

        // Register delegate
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        // Roll to block 200 so we have room
        vm.roll(200);

        // Delegate just before proposal creation (at block 200)
        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        // Create proposal at block 200
        // snapshot = 200 - 100 = 100
        // But delegation was made at block 200, which is AFTER snapshot block 100
        // So voting power at block 100 = 0

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Maturity test", 0);

        // Roll to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Cast vote — weight should be 0 (delegation after snapshot)
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.forVotes, 0);
    }

    /*//////////////////////////////////////////////////////////////
                SC SELF-DEFENSE RESTRICTION TESTS (H4)
    //////////////////////////////////////////////////////////////*/

    function test_SCCannotCancelSCProposals() public {
        address guardian = makeAddr("guardian");

        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Create proposal targeting the guardian (SC) address
        address[] memory targets = new address[](1);
        targets[0] = guardian; // Target is the SC/guardian itself

        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("removeMember(address)", makeAddr("someMember"));

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "SC targeting proposal", 0);

        // Guardian tries to cancel — should revert with CannotCancelSCProposal
        vm.prank(guardian);
        vm.expectRevert(IDAOGovernor.CannotCancelSCProposal.selector);
        governor.cancel(proposalId);

        // Proposer can still cancel
        vm.prank(user1);
        governor.cancel(proposalId);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    /*//////////////////////////////////////////////////////////////
                PROPOSER+GUARDIAN OVERLAP TESTS (M2)
    //////////////////////////////////////////////////////////////*/

    function test_ProposerAndGuardianSameAddress() public {
        // Set user1 as guardian (user1 is also the proposer)
        vm.prank(owner);
        governor.setProposalGuardian(user1);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Overlap test", 0);

        // Move to Defeated state
        vm.roll(block.number + governor.votingDelay() + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Defeated));

        // user1 is both proposer AND guardian — proposer rules take priority (stricter)
        // Proposer cannot cancel Defeated proposals
        vm.prank(user1);
        vm.expectRevert(IDAOGovernor.InvalidProposalState.selector);
        governor.cancel(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                PARAMETER BOUNDS VALIDATION TESTS (M3)
    //////////////////////////////////////////////////////////////*/

    function test_ParameterBoundsValidation() public {
        // setQuorum: must be 0 < value <= BASIS_POINTS
        vm.startPrank(owner);

        vm.expectRevert(IDAOGovernor.InvalidParameter.selector);
        governor.setQuorum(0);

        vm.expectRevert(IDAOGovernor.InvalidParameter.selector);
        governor.setQuorum(10_001);

        // setVotingDelay: value > 0
        vm.expectRevert(IDAOGovernor.InvalidParameter.selector);
        governor.setVotingDelay(0);

        // setVotingPeriod: value > 0
        vm.expectRevert(IDAOGovernor.InvalidParameter.selector);
        governor.setVotingPeriod(0);

        // setGracePeriod: value >= 1 days
        vm.expectRevert(IDAOGovernor.InvalidParameter.selector);
        governor.setGracePeriod(1 days - 1);

        // setProposalThreshold: value <= BASIS_POINTS (0 is allowed = no restriction)
        vm.expectRevert(IDAOGovernor.InvalidParameter.selector);
        governor.setProposalThreshold(10_001);

        // Valid calls should succeed
        governor.setQuorum(500);
        governor.setVotingDelay(1);
        governor.setVotingPeriod(1);
        governor.setGracePeriod(1 days);
        governor.setProposalThreshold(0);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                EXECUTE THROUGH TIMELOCK TESTS (M1)
    //////////////////////////////////////////////////////////////*/

    function test_ExecuteThroughTimelock() public {
        // Deploy mock execution target
        MockExecutionTarget target = new MockExecutionTarget();

        // Register delegate and delegate
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal: target.setValue(42)
        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Timelock execute test", 0);

        // Vote
        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // Past voting period
        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));

        // Queue — goes through Timelock
        governor.queue(proposalId);

        // Verify queued in Timelock
        uint256 eta = governor.proposalEta(proposalId);
        assertGt(eta, 0);

        // Warp past timelock delay, execute through Timelock
        vm.warp(block.timestamp + 7 days + 1);
        governor.execute(proposalId);

        // Verify execution result
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Executed));
        assertEq(target.value(), 42);
    }

    /*//////////////////////////////////////////////////////////////
                    ABSTAIN QUORUM PATH TEST
    //////////////////////////////////////////////////////////////*/

    function test_AbstainOnlyQuorumPath() public {
        // Register delegate
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Abstain test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        // Only abstain votes
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.Abstain);

        vm.roll(block.number + governor.votingPeriod() + 1);

        // Abstain only → Defeated (no for/against votes, totalNonAbstain=0)
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Defeated));
    }

    /*//////////////////////////////////////////////////////////////
                    DISABLED GUARDIAN TEST
    //////////////////////////////////////////////////////////////*/

    function test_DisabledGuardian() public {
        // No guardian set (default is address(0))
        assertEq(governor.proposalGuardian(), address(0));

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "No guardian test", 0);

        // Random address cannot cancel
        vm.prank(user2);
        vm.expectRevert(IDAOGovernor.NotAuthorizedToCancel.selector);
        governor.cancel(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                    VOTING DELAY UPDATED EVENT TEST (L3)
    //////////////////////////////////////////////////////////////*/

    function test_VotingDelayUpdatedEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.VotingDelayUpdated(7_200, 14_400);
        governor.setVotingDelay(14_400);
    }

    function test_VotingPeriodUpdatedEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.VotingPeriodUpdated(50_400, 100_800);
        governor.setVotingPeriod(100_800);
    }

    /*//////////////////////////////////////////////////////////////
                    ADMIN FUNCTIONS: setTimelock TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetTimelock() public {
        address newTimelock = makeAddr("newTimelock");

        vm.prank(owner);
        governor.setTimelock(newTimelock);

        assertEq(governor.timelock(), newTimelock);
    }

    function test_SetTimelockRevertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(DAOGovernor.ZeroAddress.selector);
        governor.setTimelock(address(0));
    }

    function test_SetTimelockRevertsIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        governor.setTimelock(makeAddr("newTimelock"));
    }

    /*//////////////////////////////////////////////////////////////
                    ADMIN FUNCTIONS: setPassRate TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetPassRate() public {
        vm.prank(owner);
        governor.setPassRate(6000);

        assertEq(governor.passRate(), 6000);
    }

    function test_SetPassRateRevertsIfExceedsBasisPoints() public {
        vm.prank(owner);
        vm.expectRevert(DAOGovernor.InvalidPassRate.selector);
        governor.setPassRate(10_001);
    }

    function test_SetPassRateEmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.PassRateUpdated(5000, 6000);
        governor.setPassRate(6000);
    }

    /*//////////////////////////////////////////////////////////////
                    ADMIN FUNCTIONS: setGracePeriod TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SetGracePeriod() public {
        vm.prank(owner);
        governor.setGracePeriod(21 days);

        assertEq(governor.gracePeriod(), 21 days);
    }

    function test_SetGracePeriodEmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.GracePeriodUpdated(14 days, 21 days);
        governor.setGracePeriod(21 days);
    }

    /*//////////////////////////////////////////////////////////////
                    ADMIN FUNCTIONS: setMaturityPeriod EVENT
    //////////////////////////////////////////////////////////////*/

    function test_SetMaturityPeriodEmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.MaturityPeriodUpdated(0, 100);
        governor.setMaturityPeriod(100);
    }

    /*//////////////////////////////////////////////////////////////
                    VIEW FUNCTIONS: getAllProposalIds
    //////////////////////////////////////////////////////////////*/

    function test_GetAllProposalIds() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 id1 = governor.propose(targets, values, calldatas, "Proposal 1", 0);

        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 600);

        vm.prank(user1);
        uint256 id2 = governor.propose(targets, values, calldatas, "Proposal 2", 0);

        uint256[] memory ids = governor.getAllProposalIds();
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }

    /*//////////////////////////////////////////////////////////////
                    VIEW FUNCTIONS: getVoteReceipt
    //////////////////////////////////////////////////////////////*/

    function test_GetVoteReceipt() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Receipt test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.Against);

        (IDAOGovernor.VoteType support, uint256 weight) = governor.getVoteReceipt(proposalId, delegate1);
        assertEq(uint256(support), uint256(IDAOGovernor.VoteType.Against));
        assertEq(weight, 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                    MULTI-TARGET PROPOSAL TEST
    //////////////////////////////////////////////////////////////*/

    function test_MultiTargetProposal() public {
        MockExecutionTarget target1 = new MockExecutionTarget();
        MockExecutionTarget target2 = new MockExecutionTarget();

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Multi-target proposal
        address[] memory targets = new address[](2);
        targets[0] = address(target1);
        targets[1] = address(target2);

        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0;

        bytes[] memory calldatas = new bytes[](2);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);
        calldatas[1] = abi.encodeWithSignature("setValue(uint256)", 99);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Multi-target", 0);

        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        vm.roll(block.number + governor.votingPeriod() + 1);
        governor.queue(proposalId);

        vm.warp(block.timestamp + 7 days + 1);
        governor.execute(proposalId);

        assertEq(target1.value(), 42);
        assertEq(target2.value(), 99);
    }

    /*//////////////////////////////////////////////////////////////
                    PROPOSAL WITH ETH VALUE TEST
    //////////////////////////////////////////////////////////////*/

    function test_ProposalWithETHValue() public {
        MockExecutionTarget target = new MockExecutionTarget();

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        values[0] = 1 ether; // Send 1 ETH
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "ETH transfer", 0);

        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        vm.roll(block.number + governor.votingPeriod() + 1);
        governor.queue(proposalId);

        vm.warp(block.timestamp + 7 days + 1);

        // Fund the timelock with ETH
        vm.deal(address(timelock), 10 ether);

        governor.execute{value: 1 ether}(proposalId);

        assertEq(target.value(), 42);
    }

    /*//////////////////////////////////////////////////////////////
                    TIMELOCK DELAY SYNC TEST (CRITICAL FIX)
    //////////////////////////////////////////////////////////////*/

    function test_QueueUsesTimelockDelay() public {
        // This test verifies that queue() reads delay from the Timelock contract directly

        MockExecutionTarget target = new MockExecutionTarget();

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Sync test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        vm.roll(block.number + governor.votingPeriod() + 1);
        governor.queue(proposalId);

        // Warp past Timelock's delay (7 days)
        vm.warp(block.timestamp + 7 days + 1);
        governor.execute(proposalId);

        assertEq(target.value(), 42);
    }

    /*//////////////////////////////////////////////////////////////
                    AUDIT FIX VERIFICATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ExactQuorumBoundary() public {
        // Test exact quorum boundary: totalVotes == requiredQuorum should be Defeated
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        // Need totalDelegated = 25000 so requiredQuorum = 25000 * 400 / 10000 = 1000
        vm.prank(user1);
        registry.delegate(delegate1, 25_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Exact quorum test", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        // delegate1 votes For with weight = 25000 (since delegated at block 0, maturity=0)
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        vm.roll(block.number + governor.votingPeriod() + 1);

        // requiredQuorum = 25000 * 400 / 10000 = 1000
        // totalVotes = 25000 > 1000 → passes quorum
        // forPercentage = 10000 (100%) > 5000 passRate → Succeeded
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));
    }

    function test_ExactPassRateBoundary() public {
        // Test exact pass rate boundary: forPercentage == passRate should be Defeated
        address delegate2 = makeAddr("delegate2");

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");
        vm.prank(delegate2);
        registry.registerDelegate("Delegate2", "Philosophy2", "Interests2");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate2, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Pass rate boundary", 0);

        vm.roll(block.number + governor.votingDelay() + 1);

        // Equal votes: for = 10000, against = 10000 → forPercentage = 5000 = passRate → Defeated
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.prank(delegate2);
        governor.castVote(proposalId, IDAOGovernor.VoteType.Against);

        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Defeated));
    }

    function test_ProposerCannotCancelSucceeded() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));
        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Cancel succeeded", 0);

        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));

        // Proposer cannot cancel in Succeeded state (only Pending/Active allowed)
        vm.prank(user1);
        vm.expectRevert(IDAOGovernor.InvalidProposalState.selector);
        governor.cancel(proposalId);
    }

    function test_ProposerCannotCancelQueued() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));
        vm.warp(block.timestamp + 8 days);

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Cancel queued", 0);

        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.roll(block.number + governor.votingPeriod() + 1);
        governor.queue(proposalId);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Queued));

        vm.prank(user1);
        vm.expectRevert(IDAOGovernor.InvalidProposalState.selector);
        governor.cancel(proposalId);
    }

    function test_CastVoteOnNonExistentProposal() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(delegate1);
        vm.expectRevert(DAOGovernor.ProposalNotFound.selector);
        governor.castVote(999, IDAOGovernor.VoteType.For);
    }

    function test_DuplicateProposalReverts() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        governor.propose(targets, values, calldatas, "Duplicate test", 0);

        // Same proposal should revert
        vm.prank(user1);
        vm.expectRevert(DAOGovernor.InvalidProposal.selector);
        governor.propose(targets, values, calldatas, "Duplicate test", 0);
    }

    function test_VotingBeforeVoteStartReverts() public {
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Early vote", 0);

        // Don't advance blocks — still in Pending state
        vm.prank(delegate1);
        vm.expectRevert(DAOGovernor.VotingNotStarted.selector);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
    }

    function test_QueueOnNonSucceededReverts() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Queue non-succeeded", 0);

        // Try to queue while still Pending
        vm.expectRevert(DAOGovernor.ProposalNotSucceeded.selector);
        governor.queue(proposalId);
    }

    function test_ExecuteOnNonQueuedReverts() public {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Execute non-queued", 0);

        vm.expectRevert(DAOGovernor.ProposalNotQueued.selector);
        governor.execute(proposalId);
    }

    function test_StateOnNonExistentProposalReverts() public {
        vm.expectRevert(DAOGovernor.ProposalNotFound.selector);
        governor.state(999);
    }

    function test_EmptyTargetsReverts() public {
        address[] memory targets = new address[](0);
        uint256[] memory values = new uint256[](0);
        bytes[] memory calldatas = new bytes[](0);

        vm.prank(user1);
        vm.expectRevert(DAOGovernor.InvalidProposal.selector);
        governor.propose(targets, values, calldatas, "Empty targets", 0);
    }

    function test_ArrayLengthMismatchReverts() public {
        address[] memory targets = new address[](2);
        targets[0] = address(governor);
        targets[1] = address(governor);
        uint256[] memory values = new uint256[](1); // mismatch
        bytes[] memory calldatas = new bytes[](2);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);
        calldatas[1] = abi.encodeWithSignature("setQuorum(uint256)", 600);

        vm.prank(user1);
        vm.expectRevert(DAOGovernor.ArrayLengthMismatch.selector);
        governor.propose(targets, values, calldatas, "Mismatch test", 0);
    }

    function test_GuardianSelfDefenseMultipleTargets() public {
        address guardian = makeAddr("guardian");
        vm.prank(owner);
        governor.setProposalGuardian(guardian);

        // Create proposal with multiple targets, one of which is the guardian
        address[] memory targets = new address[](2);
        targets[0] = address(governor);
        targets[1] = guardian; // SC target among multiple

        uint256[] memory values = new uint256[](2);
        bytes[] memory calldatas = new bytes[](2);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);
        calldatas[1] = abi.encodeWithSignature("removeMember(address)", makeAddr("someMember"));

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Multi-target SC", 0);

        // Guardian should not be able to cancel (SC self-defense)
        vm.prank(guardian);
        vm.expectRevert(IDAOGovernor.CannotCancelSCProposal.selector);
        governor.cancel(proposalId);
    }

    function test_QuorumSnapshotPerProposal() public {
        // M-1: Verify quorum is snapshotted per proposal
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));
        vm.warp(block.timestamp + 8 days);

        // Create proposal with quorum = 400 (default)
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Quorum snapshot", 0);

        // Verify snapshot fields
        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.snapshotQuorum, 400);

        // Change quorum AFTER proposal creation
        vm.prank(owner);
        governor.setQuorum(8000); // 80%

        // The proposal should still use snapshotQuorum = 400, not 8000
        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.roll(block.number + governor.votingPeriod() + 1);

        // With snapshotQuorum=400: requiredQuorum = 20000 * 400 / 10000 = 800
        // totalVotes = 20000 > 800 → passes
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));
    }

    function test_PassRateSnapshotPerProposal() public {
        // M-1: Verify passRate is snapshotted per proposal
        address delegate2 = makeAddr("delegate2");

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");
        vm.prank(delegate2);
        registry.registerDelegate("Delegate2", "Philosophy2", "Interests2");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate2, 4_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));
        vm.warp(block.timestamp + 8 days);

        // Create proposal with passRate = 5000 (default 50%)
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "PassRate snapshot", 0);

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.snapshotPassRate, 5000);

        // Change passRate to 9000 (90%) AFTER proposal creation
        vm.prank(owner);
        governor.setPassRate(9000);

        vm.roll(block.number + governor.votingDelay() + 1);

        // delegate1 votes For (10000), delegate2 votes Against (4000)
        // forPercentage = 10000 * 10000 / 14000 = 7142 > snapshotPassRate 5000 → Succeeded
        // With new passRate 9000: 7142 < 9000 → would be Defeated, but we use snapshot
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.prank(delegate2);
        governor.castVote(proposalId, IDAOGovernor.VoteType.Against);

        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));
    }

    function test_SetPassRateZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(DAOGovernor.InvalidPassRate.selector);
        governor.setPassRate(0);
    }

    /*//////////////////////////////////////////////////////////////
                    AUDIT FIX: setTimelock EVENT (Fix 2)
    //////////////////////////////////////////////////////////////*/

    function test_SetTimelockEmitsEvent() public {
        address newTimelock = makeAddr("newTimelock");

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IDAOGovernor.TimelockUpdated(address(timelock), newTimelock);
        governor.setTimelock(newTimelock);
    }

    /*//////////////////////////////////////////////////////////////
                DUPLICATE ACTIONS IN PROPOSAL (Fix 3)
    //////////////////////////////////////////////////////////////*/

    function test_DuplicateActionsInProposalFailsOnQueue() public {
        // Verify that proposals with duplicate (target, value, calldata) revert on queue
        MockExecutionTarget target = new MockExecutionTarget();

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Create proposal with duplicate actions
        address[] memory targets = new address[](2);
        targets[0] = address(target);
        targets[1] = address(target); // same target

        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0; // same value

        bytes[] memory calldatas = new bytes[](2);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 42);
        calldatas[1] = abi.encodeWithSignature("setValue(uint256)", 42); // same calldata

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Duplicate actions", 0);

        // Vote to pass
        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.roll(block.number + governor.votingPeriod() + 1);

        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));

        // Queue should revert because duplicate actions produce the same Timelock hash
        vm.expectRevert(Timelock.TransactionAlreadyQueued.selector);
        governor.queue(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                FULL LIFECYCLE WITH ETH VALUE
    //////////////////////////////////////////////////////////////*/

    function test_ProposalFullLifecycleWithETHValue() public {
        // End-to-end proposal that sends ETH through timelock to target
        MockExecutionTarget target = new MockExecutionTarget();

        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 10_000 ether);
        vm.prank(user2);
        registry.delegate(delegate1, 10_000 ether);

        vm.prank(owner);
        registry.setGovernor(address(governor));

        vm.warp(block.timestamp + 8 days);

        // Proposal: send 1 ETH to target and set value
        address[] memory targets = new address[](1);
        targets[0] = address(target);
        uint256[] memory values = new uint256[](1);
        values[0] = 1 ether;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setValue(uint256)", 99);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "ETH lifecycle", 0);

        // Vote
        vm.roll(block.number + governor.votingDelay() + 1);
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // Past voting
        vm.roll(block.number + governor.votingPeriod() + 1);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Succeeded));

        // Queue
        governor.queue(proposalId);
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Queued));

        // Fund timelock and execute
        vm.deal(address(timelock), 10 ether);
        uint256 targetBalanceBefore = address(target).balance;

        vm.warp(block.timestamp + 7 days + 1);
        governor.execute{value: 1 ether}(proposalId);

        // Verify execution
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Executed));
        assertEq(target.value(), 99);
        assertEq(address(target).balance, targetBalanceBefore + 1 ether);
    }

    /*//////////////////////////////////////////////////////////////
            SC CANCELS THROUGH GOVERNOR (Integration Test)
    //////////////////////////////////////////////////////////////*/

    function test_SecurityCouncilCancelsThroughGovernor() public {
        // Integration: SecurityCouncil executes cancel action through DAOGovernor

        // Deploy SecurityCouncil
        address scFoundation = makeAddr("scFoundation");
        address scExternal1 = makeAddr("scExternal1");
        address scExternal2 = makeAddr("scExternal2");

        address[] memory scExternals = new address[](2);
        scExternals[0] = scExternal1;
        scExternals[1] = scExternal2;

        SecurityCouncil sc = new SecurityCouncil(
            scFoundation, scExternals, address(governor), address(timelock), address(governor)
        );

        // Set SC as proposal guardian
        vm.prank(owner);
        governor.setProposalGuardian(address(sc));

        // Create a proposal to cancel
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "To be cancelled by SC", 0);

        // SC member proposes cancel
        vm.prank(scFoundation);
        sc.cancelProposal(proposalId);

        uint256[] memory pending = sc.getPendingActions();
        uint256 actionId = pending[0];

        // SC member approves
        vm.prank(scExternal1);
        sc.approveEmergencyAction(actionId);

        // SC member executes — this calls governor.cancel(proposalId) via SC
        vm.prank(scExternal2);
        sc.executeEmergencyAction(actionId);

        // Verify proposal is canceled
        assertEq(uint256(governor.state(proposalId)), uint256(IDAOGovernor.ProposalState.Canceled));
    }

    /*//////////////////////////////////////////////////////////////
                        EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_CastVoteWithZeroVotingPower() public {
        // Register delegate but don't delegate any vTON to them
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test zero voting power", 0);

        // Move to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // Delegate with 0 voting power casts vote — should succeed with weight=0
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        assertTrue(governor.hasVoted(proposalId, delegate1));

        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.forVotes, 0);
    }

    function test_CreateProposalWithZeroCost() public {
        // Set proposal creation cost to 0
        vm.prank(owner);
        governor.setProposalCreationCost(0);

        // user2 has no TON but should be able to create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user2);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Free proposal", 0);

        assertGt(proposalId, 0);
        assertEq(governor.proposalCount(), 1);
    }

    function test_CastVoteAfterVotingEndReverts() public {
        // Setup delegate with voting power
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");

        vm.prank(user1);
        registry.delegate(delegate1, 1000 ether);

        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test late vote", 0);

        // Move past voting period end
        vm.roll(block.number + governor.votingDelay() + governor.votingPeriod() + 1);

        // Attempt to vote after voting ended — should revert
        vm.prank(delegate1);
        vm.expectRevert(DAOGovernor.VotingEnded.selector);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
    }

    function test_MultipleDelegatesVoteOnSameProposal() public {
        address delegate2 = makeAddr("delegate2");
        address delegate3 = makeAddr("delegate3");

        // Register multiple delegates
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Philosophy", "Interests");
        vm.prank(delegate2);
        registry.registerDelegate("Delegate2", "Philosophy", "Interests");
        vm.prank(delegate3);
        registry.registerDelegate("Delegate3", "Philosophy", "Interests");

        // Delegate vTON to different delegates
        vm.prank(user1);
        registry.delegate(delegate1, 5000 ether);
        vm.prank(user1);
        registry.delegate(delegate2, 3000 ether);
        vm.prank(user2);
        registry.delegate(delegate3, 2000 ether);

        // Wait for delegation maturity
        vm.warp(block.timestamp + 8 days);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setQuorum(uint256)", 500);

        vm.prank(user1);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Multi delegate vote", 0);

        // Move to voting period
        vm.roll(block.number + governor.votingDelay() + 1);

        // All delegates vote
        vm.prank(delegate1);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);
        vm.prank(delegate2);
        governor.castVote(proposalId, IDAOGovernor.VoteType.Against);
        vm.prank(delegate3);
        governor.castVote(proposalId, IDAOGovernor.VoteType.For);

        // Verify all votes recorded
        assertTrue(governor.hasVoted(proposalId, delegate1));
        assertTrue(governor.hasVoted(proposalId, delegate2));
        assertTrue(governor.hasVoted(proposalId, delegate3));

        // Verify vote aggregation: forVotes = delegate1 + delegate3, againstVotes = delegate2
        IDAOGovernor.Proposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.forVotes, 5000 ether + 2000 ether);
        assertEq(proposal.againstVotes, 3000 ether);
        assertEq(proposal.abstainVotes, 0);
    }
}
