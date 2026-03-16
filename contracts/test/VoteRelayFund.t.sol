// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { vTON } from "../src/token/vTON.sol";
import { DelegateRegistry } from "../src/governance/DelegateRegistry.sol";
import { DAOGovernor } from "../src/governance/DAOGovernor.sol";
import { Timelock } from "../src/governance/Timelock.sol";
import { VoteRelayFund } from "../src/governance/VoteRelayFund.sol";

contract MockTONForRelay is ERC20 {
    constructor() ERC20("TON", "TON") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract VoteRelayFundTest is Test {
    VoteRelayFund public fund;
    DAOGovernor public governor;
    DelegateRegistry public registry;
    Timelock public timelock;
    vTON public vton;
    MockTONForRelay public ton;

    address public owner;
    address public delegate1;
    address public agent;
    address public relayer;
    address public user1;

    uint256 public agentPrivateKey;

    function setUp() public {
        owner = makeAddr("owner");
        delegate1 = makeAddr("delegate1");
        relayer = makeAddr("relayer");
        user1 = makeAddr("user1");

        // Create agent from known private key so we can sign
        agentPrivateKey = 0xA11CE;
        agent = vm.addr(agentPrivateKey);

        vm.startPrank(owner);

        ton = new MockTONForRelay();
        vton = new vTON(owner);
        registry = new DelegateRegistry(address(vton), owner);
        timelock = new Timelock(owner, 7 days);
        governor = new DAOGovernor(
            address(ton), address(vton), address(registry), address(timelock), owner
        );

        timelock.setGovernor(address(governor));
        registry.setGovernor(address(governor));

        // Short voting periods for testing
        governor.setVotingDelay(1_800);
        governor.setVotingPeriod(7_200);

        // Setup agent as a delegate
        vton.setMinter(owner, true);
        vton.mint(delegate1, 10_000 ether);

        vm.stopPrank();

        // Register agent as delegate
        vm.prank(agent);
        registry.registerDelegate("Agent", "Vote", "DAO");

        // delegate1 delegates to agent
        vm.startPrank(delegate1);
        vton.approve(address(registry), 10_000 ether);
        registry.delegate(agent, 1_000 ether);
        vm.stopPrank();

        // Deploy VoteRelayFund
        fund = new VoteRelayFund();

        // Fund relayer
        vm.deal(relayer, 10 ether);
        // Fund delegate1
        vm.deal(delegate1, 10 ether);
    }

    // ─── Deposit tests ───────────────────────────────────────

    function test_Deposit() public {
        vm.prank(delegate1);
        fund.deposit{value: 1 ether}(agent);

        assertEq(fund.balances(agent), 1 ether);
        assertEq(fund.delegateOf(agent), delegate1);
    }

    function test_Deposit_ZeroAddress_Reverts() public {
        vm.prank(delegate1);
        vm.expectRevert(VoteRelayFund.ZeroAddress.selector);
        fund.deposit{value: 1 ether}(address(0));
    }

    function test_Deposit_ZeroAmount_Reverts() public {
        vm.prank(delegate1);
        vm.expectRevert(VoteRelayFund.ZeroAmount.selector);
        fund.deposit{value: 0}(agent);
    }

    function test_Deposit_WrongDelegate_Reverts() public {
        // First deposit from delegate1
        vm.prank(delegate1);
        fund.deposit{value: 1 ether}(agent);

        // Second deposit from someone else should fail
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        vm.expectRevert(VoteRelayFund.WrongDelegate.selector);
        fund.deposit{value: 1 ether}(agent);
    }

    function test_Deposit_SameDelegate_Succeeds() public {
        vm.startPrank(delegate1);
        fund.deposit{value: 1 ether}(agent);
        fund.deposit{value: 0.5 ether}(agent);
        vm.stopPrank();

        assertEq(fund.balances(agent), 1.5 ether);
    }

    // ─── Withdraw tests ──────────────────────────────────────

    function test_Withdraw() public {
        vm.prank(delegate1);
        fund.deposit{value: 1 ether}(agent);

        uint256 balBefore = delegate1.balance;

        vm.prank(delegate1);
        fund.withdraw(agent, 0.5 ether);

        assertEq(fund.balances(agent), 0.5 ether);
        assertEq(delegate1.balance, balBefore + 0.5 ether);
    }

    function test_Withdraw_NotDelegate_Reverts() public {
        vm.prank(delegate1);
        fund.deposit{value: 1 ether}(agent);

        vm.prank(user1);
        vm.expectRevert(VoteRelayFund.NotDelegate.selector);
        fund.withdraw(agent, 0.5 ether);
    }

    function test_Withdraw_InsufficientBalance_Reverts() public {
        vm.prank(delegate1);
        fund.deposit{value: 1 ether}(agent);

        vm.prank(delegate1);
        vm.expectRevert(VoteRelayFund.InsufficientBalance.selector);
        fund.withdraw(agent, 2 ether);
    }

    // ─── RelayVote tests ─────────────────────────────────────

    function test_RelayVote() public {
        // 1. Deposit gas funds
        vm.prank(delegate1);
        fund.deposit{value: 1 ether}(agent);

        // 2. Create a proposal
        _createAndActivateProposal();

        uint256 proposalId = _getProposalId();

        // 3. Agent signs EIP-712 ballot
        (uint8 v, bytes32 r, bytes32 s) = _signBallot(proposalId, 1); // For

        uint256 fundBalBefore = fund.balances(agent);
        uint256 relayerBalBefore = relayer.balance;

        // 4. Relayer calls relayVote (set gas price so reimbursement is non-zero)
        vm.txGasPrice(10 gwei);
        vm.prank(relayer);
        fund.relayVote(address(governor), proposalId, 1, v, r, s, agent);

        // Verify gas was reimbursed
        assertLt(fund.balances(agent), fundBalBefore, "Fund balance should decrease");
        assertGt(relayer.balance, relayerBalBefore, "Relayer should be reimbursed");

        // Verify vote was cast
        assertTrue(governor.hasVoted(proposalId, agent));
    }

    function test_RelayVote_InsufficientBalance_Reverts() public {
        // Don't deposit any funds — balance is 0

        // Create proposal
        _createAndActivateProposal();
        uint256 proposalId = _getProposalId();

        (uint8 v, bytes32 r, bytes32 s) = _signBallot(proposalId, 1);

        // Need to set delegateOf so the agent has a registered delegate
        vm.prank(delegate1);
        fund.deposit{value: 1 wei}(agent);

        // Withdraw almost everything (keep 1 wei, not enough for gas)
        vm.prank(delegate1);
        fund.withdraw(agent, 1 wei);

        vm.txGasPrice(10 gwei);
        vm.prank(relayer);
        vm.expectRevert(VoteRelayFund.InsufficientBalance.selector);
        fund.relayVote(address(governor), proposalId, 1, v, r, s, agent);
    }

    function test_RelayVote_InvalidVote_Reverts() public {
        vm.prank(delegate1);
        fund.deposit{value: 1 ether}(agent);

        // Use a non-existent proposal
        (uint8 v, bytes32 r, bytes32 s) = _signBallot(999, 1);

        vm.prank(relayer);
        vm.expectRevert(); // Governor will revert
        fund.relayVote(address(governor), 999, 1, v, r, s, agent);
    }

    // ─── Helpers ─────────────────────────────────────────────

    function _createAndActivateProposal() internal {
        // Give delegate1 TON for proposal cost
        vm.prank(owner);
        ton.mint(delegate1, 100 ether);

        // Register delegate1 as delegate so they can propose
        vm.prank(delegate1);
        registry.registerDelegate("Delegate1", "Test", "DAO");

        // Delegate to delegate1 from owner
        vm.startPrank(owner);
        vton.mint(owner, 10_000 ether);
        vton.approve(address(registry), 10_000 ether);
        registry.delegate(delegate1, 1_000 ether);
        vm.stopPrank();

        // Roll past maturity period
        vm.roll(block.number + 50_401);

        // Create proposal
        address[] memory targets = new address[](1);
        targets[0] = address(0xdead);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = "";

        vm.startPrank(delegate1);
        ton.approve(address(governor), 100 ether);
        governor.propose(targets, values, calldatas, "Test Proposal", 0);
        vm.stopPrank();

        // Roll past voting delay
        vm.roll(block.number + 1_801);
    }

    function _getProposalId() internal view returns (uint256) {
        uint256[] memory ids = governor.getAllProposalIds();
        return ids[ids.length - 1];
    }

    function _signBallot(uint256 proposalId, uint8 support) internal view returns (uint8, bytes32, bytes32) {
        bytes32 BALLOT_TYPEHASH = keccak256("Ballot(uint256 proposalId,uint8 support)");

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("DAOGovernor"),
                keccak256("1"),
                block.chainid,
                address(governor)
            )
        );

        bytes32 structHash = keccak256(abi.encode(BALLOT_TYPEHASH, proposalId, support));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        return vm.sign(agentPrivateKey, digest);
    }
}
