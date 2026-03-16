// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IGovernorVoteBySig {
    function castVoteBySig(
        uint256 proposalId,
        uint8 support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/// @title VoteRelayFund — ETH escrow for agent vote gas reimbursement
/// @notice Delegates deposit ETH for their agent. Relayers call relayVote()
///         to submit castVoteBySig on behalf of the agent and get reimbursed.
contract VoteRelayFund is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error ZeroAddress();
    error ZeroAmount();
    error NotDelegate();
    error WrongDelegate();
    error InsufficientBalance();
    error ReimbursementFailed();
    error VoteFailed();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposited(address indexed agent, address indexed delegate, uint256 amount);
    event Withdrawn(address indexed agent, address indexed delegate, uint256 amount);
    event VoteRelayed(
        address indexed agent,
        address indexed relayer,
        address governor,
        uint256 proposalId,
        uint256 gasCost
    );

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice ETH balance deposited for each agent
    mapping(address => uint256) public balances;

    /// @notice The delegate (owner) registered for each agent
    mapping(address => address) public delegateOf;

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Deposit ETH for an agent's gas fund
    /// @dev First depositor becomes the delegate. Subsequent deposits must come from the same delegate.
    /// @param agent The agent wallet address
    function deposit(address agent) external payable {
        if (agent == address(0)) revert ZeroAddress();
        if (msg.value == 0) revert ZeroAmount();

        address existing = delegateOf[agent];
        if (existing == address(0)) {
            delegateOf[agent] = msg.sender;
        } else if (existing != msg.sender) {
            revert WrongDelegate();
        }

        balances[agent] += msg.value;

        emit Deposited(agent, msg.sender, msg.value);
    }

    /// @notice Withdraw ETH from an agent's gas fund
    /// @param agent The agent wallet address
    /// @param amount The amount to withdraw
    function withdraw(address agent, uint256 amount) external {
        if (delegateOf[agent] != msg.sender) revert NotDelegate();
        if (balances[agent] < amount) revert InsufficientBalance();

        balances[agent] -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert ReimbursementFailed();

        emit Withdrawn(agent, msg.sender, amount);
    }

    /// @notice Relay a vote on behalf of an agent and reimburse the caller
    /// @param governor The DAOGovernor address
    /// @param proposalId The proposal ID
    /// @param support Vote type (0=Against, 1=For, 2=Abstain)
    /// @param v Signature v
    /// @param r Signature r
    /// @param s Signature s
    /// @param agent The agent whose balance pays for gas
    function relayVote(
        address governor,
        uint256 proposalId,
        uint8 support,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address agent
    ) external nonReentrant {
        uint256 gasStart = gasleft();

        // Submit vote
        IGovernorVoteBySig(governor).castVoteBySig(proposalId, support, v, r, s);

        // Calculate gas cost: used gas + 40k overhead (21k base + storage + transfer)
        uint256 gasUsed = gasStart - gasleft() + 40_000;
        uint256 gasCost = gasUsed * tx.gasprice;

        if (balances[agent] < gasCost) revert InsufficientBalance();
        balances[agent] -= gasCost;

        // Reimburse relayer
        (bool ok, ) = msg.sender.call{value: gasCost}("");
        if (!ok) revert ReimbursementFailed();

        emit VoteRelayed(agent, msg.sender, governor, proposalId, gasCost);
    }
}
