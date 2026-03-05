// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IDAOGovernor } from "../interfaces/IDAOGovernor.sol";
import { IDelegateRegistry } from "../interfaces/IDelegateRegistry.sol";
import { Timelock } from "./Timelock.sol";

/// @title DAOGovernor - vTON DAO Governance
/// @notice Main governance contract for Tokamak Network DAO
/// @dev Implements vTON DAO Governance Model:
///      - Proposal creation requires burning 10 TON
///      - Snapshot-based voting power (7-day delegation requirement)
///      - 7-day on-chain voting period
///      - 4% quorum of total delegated vTON
///      - Simple majority pass rate
///      - 7-day timelock before execution
contract DAOGovernor is IDAOGovernor, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error InvalidProposal();
    error ProposalNotFound();
    error ProposalNotActive();
    error ProposalNotSucceeded();
    error ProposalNotQueued();
    error ProposalAlreadyExecuted();
    error ProposalAlreadyCanceled();
    error AlreadyVoted();
    error NotProposer();
    error InvalidVoteType();
    error VotingNotStarted();
    error VotingEnded();
    error QuorumNotReached();
    error TimelockNotReady();
    error TimelockExpired();
    error ExecutionFailed();
    error ZeroAddress();
    error ArrayLengthMismatch();
    error NotDelegate();
    error InsufficientTON();
    error InsufficientVTON();
    error InvalidPassRate();

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Default proposal creation cost (10 TON)
    uint256 public constant DEFAULT_PROPOSAL_COST = 10 ether;

    /// @notice Default quorum (4% = 400 basis points)
    uint256 public constant DEFAULT_QUORUM = 400;

    /// @notice Default proposal threshold (0.25% = 25 basis points)
    uint256 public constant DEFAULT_PROPOSAL_THRESHOLD = 25;

    /// @notice Basis points denominator
    uint256 public constant BASIS_POINTS = 10_000;

    /// @notice Default voting delay (1 day in blocks, ~12s/block)
    uint256 public constant DEFAULT_VOTING_DELAY = 7_200;

    /// @notice Default voting period (7 days in blocks, ~50400 blocks)
    uint256 public constant DEFAULT_VOTING_PERIOD = 50_400;

    /// @notice Default timelock delay (7 days)
    uint256 public constant DEFAULT_TIMELOCK_DELAY = 7 days;

    /// @notice Default grace period (14 days after eta)
    uint256 public constant DEFAULT_GRACE_PERIOD = 14 days;

    /// @notice Default pass rate (50% = 5000 basis points, majority means > 50%)
    uint256 public constant DEFAULT_PASS_RATE = 5000;

    /// @notice Maximum burn rate (100% = 10000 basis points)
    uint16 public constant MAX_BURN_RATE = 10_000;

    /// @notice Default maturity period (7 days in blocks, ~12s/block)
    uint256 public constant DEFAULT_MATURITY_PERIOD = 50_400;

    /// @notice Minimum voting delay (~6 hours in blocks, ~12s/block)
    uint256 public constant MIN_VOTING_DELAY = 1_800;

    /// @notice Minimum voting period (~1 day in blocks, ~12s/block)
    uint256 public constant MIN_VOTING_PERIOD = 7_200;

    /// @notice Minimum maturity period (~1 day in blocks, ~12s/block)
    uint256 public constant MIN_MATURITY_PERIOD = 7_200;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice The TON token (for proposal creation cost)
    IERC20 public immutable ton;

    /// @notice The vTON token
    IERC20 public immutable vTON;

    /// @notice The delegate registry
    IDelegateRegistry public immutable delegateRegistry;

    /// @notice The timelock contract address
    address public override timelock;

    /// @notice The proposal guardian (can cancel proposals in non-final states)
    address public override proposalGuardian;

    /// @notice The pause guardian (can pause/unpause the governor)
    address public override pauseGuardian;

    /// @notice Proposal creation cost in TON
    uint256 public override proposalCreationCost;

    /// @notice Quorum in basis points
    uint256 public override quorum;

    /// @notice Voting delay in blocks
    uint256 public override votingDelay;

    /// @notice Voting period in blocks
    uint256 public override votingPeriod;

    /// @notice Proposal threshold in basis points (25 = 0.25%)
    uint256 public override proposalThreshold;

    /// @notice Grace period in seconds
    uint256 public gracePeriod;

    /// @notice Pass rate in basis points (5000 = 50%, requires > passRate to pass)
    uint256 public passRate;

    /// @notice Delegation maturity period in blocks (delegations must be this old to count)
    uint256 public maturityPeriod;

    /// @notice Proposal counter
    uint256 private _proposalCount;

    /// @notice Array of all proposal IDs
    uint256[] private _proposalIds;

    /// @notice Mapping from proposal ID to Proposal
    mapping(uint256 => Proposal) private _proposals;

    /// @notice Mapping from proposal ID to timelock eta
    mapping(uint256 => uint256) private _proposalEta;

    /// @notice Mapping from proposal ID to voter to hasVoted
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    /// @notice Mapping from proposal ID to voter to vote receipt
    mapping(uint256 => mapping(address => VoteReceipt)) private _voteReceipts;

    /// @notice Vote receipt structure
    struct VoteReceipt {
        VoteType support;
        uint256 weight;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the DAOGovernor
    /// @param ton_ The TON token address
    /// @param vTON_ The vTON token address
    /// @param delegateRegistry_ The delegate registry address
    /// @param timelock_ The timelock controller address
    /// @param initialOwner The initial owner (for parameter updates)
    constructor(
        address ton_,
        address vTON_,
        address delegateRegistry_,
        address timelock_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            ton_ == address(0) || vTON_ == address(0) || delegateRegistry_ == address(0)
                || timelock_ == address(0) || initialOwner == address(0)
        ) {
            revert ZeroAddress();
        }

        ton = IERC20(ton_);
        vTON = IERC20(vTON_);
        delegateRegistry = IDelegateRegistry(delegateRegistry_);
        timelock = timelock_;

        proposalCreationCost = DEFAULT_PROPOSAL_COST;
        quorum = DEFAULT_QUORUM;
        votingDelay = DEFAULT_VOTING_DELAY;
        votingPeriod = DEFAULT_VOTING_PERIOD;
        proposalThreshold = DEFAULT_PROPOSAL_THRESHOLD;
        gracePeriod = DEFAULT_GRACE_PERIOD;
        passRate = DEFAULT_PASS_RATE;
        maturityPeriod = DEFAULT_MATURITY_PERIOD;
    }

    /*//////////////////////////////////////////////////////////////
                           PROPOSAL LIFECYCLE
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDAOGovernor
    function propose(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        string calldata description,
        uint16 burnRate
    ) external override whenNotPaused nonReentrant returns (uint256 proposalId) {
        if (targets.length == 0) revert InvalidProposal();
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert ArrayLengthMismatch();
        }
        if (burnRate > MAX_BURN_RATE) revert InvalidBurnRate();

        // Check vTON balance + delegated threshold
        if (proposalThreshold > 0) {
            uint256 totalSupply = vTON.totalSupply();
            uint256 requiredBalance = (totalSupply * proposalThreshold) / BASIS_POINTS;
            uint256 userPower = vTON.balanceOf(msg.sender) + delegateRegistry.getTotalDelegated(msg.sender);
            if (userPower < requiredBalance) {
                revert InsufficientVTON();
            }
        }

        // Burn TON for proposal creation
        if (proposalCreationCost > 0) {
            ton.safeTransferFrom(msg.sender, address(0xdead), proposalCreationCost);
        }

        // Generate proposal ID
        proposalId = hashProposal(targets, values, calldatas, keccak256(bytes(description)));

        // Check proposal doesn't already exist
        if (_proposals[proposalId].snapshotBlock != 0) revert InvalidProposal();

        uint256 snapshot = block.number > maturityPeriod ? block.number - maturityPeriod : 0;
        uint256 voteStart = block.number + votingDelay;
        uint256 voteEnd = voteStart + votingPeriod;

        Proposal storage proposal = _proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.description = description;
        proposal.snapshotBlock = snapshot;
        proposal.voteStart = voteStart;
        proposal.voteEnd = voteEnd;
        proposal.burnRate = burnRate;
        proposal.totalDelegatedAtSnapshot = delegateRegistry.totalDelegatedAll();
        proposal.snapshotQuorum = quorum;
        proposal.snapshotPassRate = passRate;

        _proposalIds.push(proposalId);
        _proposalCount++;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            calldatas,
            description,
            snapshot,
            voteStart,
            voteEnd,
            burnRate
        );
    }

    /// @inheritdoc IDAOGovernor
    function castVote(uint256 proposalId, VoteType support) external override whenNotPaused {
        _castVote(proposalId, support, "");
    }

    /// @inheritdoc IDAOGovernor
    function castVoteWithReason(
        uint256 proposalId,
        VoteType support,
        string calldata reason
    ) external override whenNotPaused {
        _castVote(proposalId, support, reason);
    }

    /// @inheritdoc IDAOGovernor
    /// @dev WARNING: Proposals must not contain duplicate (target, value, calldata) entries.
    ///      The Timelock hashes each action as keccak256(abi.encode(target, value, data, eta)),
    ///      so duplicate actions within the same proposal will produce the same hash and cause
    ///      queueTransaction() to revert with TransactionAlreadyQueued.
    function queue(uint256 proposalId) external override {
        if (state(proposalId) != ProposalState.Succeeded) revert ProposalNotSucceeded();

        Proposal storage proposal = _proposals[proposalId];

        // Read delay directly from Timelock to ensure eta matches the hash computed by Timelock.queueTransaction().
        // Using a separate timelockDelay would cause execute() to fail with TransactionNotQueued if the values diverge.
        uint256 eta = block.timestamp + Timelock(payable(timelock)).delay();

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            Timelock(payable(timelock)).queueTransaction(
                proposal.targets[i], proposal.values[i], proposal.calldatas[i]
            );
        }

        _proposalEta[proposalId] = eta;

        emit ProposalQueued(proposalId, eta);
    }

    /// @inheritdoc IDAOGovernor
    function execute(uint256 proposalId) external payable override whenNotPaused nonReentrant {
        ProposalState currentState = state(proposalId);
        if (currentState != ProposalState.Queued) revert ProposalNotQueued();

        uint256 eta = _proposalEta[proposalId];
        if (block.timestamp < eta) revert TimelockNotReady();
        if (block.timestamp > eta + gracePeriod) revert TimelockExpired();

        Proposal storage proposal = _proposals[proposalId];
        proposal.executed = true;

        // Execute all calls through Timelock
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            Timelock(payable(timelock)).executeTransaction{value: proposal.values[i]}(
                proposal.targets[i], proposal.values[i], proposal.calldatas[i], eta
            );
        }

        emit ProposalExecuted(proposalId);
    }

    /// @inheritdoc IDAOGovernor
    /// @dev Proposer can cancel their own proposal only in Pending or Active states
    ///      Guardian can cancel proposals in non-final states (Pending, Active, Succeeded, Queued)
    ///      Guardian cannot cancel Defeated or Expired proposals (already final states)
    function cancel(uint256 proposalId) external override {
        Proposal storage proposal = _proposals[proposalId];
        if (proposal.snapshotBlock == 0) revert ProposalNotFound();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (proposal.canceled) revert ProposalAlreadyCanceled();

        bool isProposer = msg.sender == proposal.proposer;
        bool isGuardian = msg.sender == proposalGuardian && proposalGuardian != address(0);

        if (!isProposer && !isGuardian) {
            revert IDAOGovernor.NotAuthorizedToCancel();
        }

        ProposalState currentState = state(proposalId);

        // Proposer takes priority (more restrictive): can only cancel in Pending or Active
        if (isProposer) {
            if (currentState != ProposalState.Pending && currentState != ProposalState.Active) {
                revert IDAOGovernor.InvalidProposalState();
            }
        } else if (isGuardian) {
            // Guardian cannot cancel final states (Defeated, Expired)
            if (currentState == ProposalState.Defeated || currentState == ProposalState.Expired) {
                revert IDAOGovernor.InvalidProposalState();
            }
            // Guardian cannot cancel proposals that target the guardian address (SC self-defense)
            for (uint256 i = 0; i < proposal.targets.length; i++) {
                if (proposal.targets[i] == proposalGuardian) revert IDAOGovernor.CannotCancelSCProposal();
            }
        }

        proposal.canceled = true;

        emit ProposalCanceled(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDAOGovernor
    function state(uint256 proposalId) public view override returns (ProposalState) {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.snapshotBlock == 0) revert ProposalNotFound();

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.number < proposal.voteStart) {
            return ProposalState.Pending;
        }

        if (block.number <= proposal.voteEnd) {
            return ProposalState.Active;
        }

        // Voting ended - check results
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        uint256 requiredQuorum = (proposal.totalDelegatedAtSnapshot * proposal.snapshotQuorum) / BASIS_POINTS;

        if (totalVotes < requiredQuorum) {
            return ProposalState.Defeated;
        }

        // Check pass rate (forVotes must be greater than passRate percentage of total non-abstain votes)
        uint256 totalNonAbstain = proposal.forVotes + proposal.againstVotes;
        if (totalNonAbstain > 0) {
            uint256 forPercentage = (proposal.forVotes * BASIS_POINTS) / totalNonAbstain;
            if (forPercentage <= proposal.snapshotPassRate) {
                return ProposalState.Defeated;
            }
        } else {
            // No for or against votes, only abstain - defeated
            return ProposalState.Defeated;
        }

        // Check if queued
        uint256 eta = _proposalEta[proposalId];
        if (eta == 0) {
            return ProposalState.Succeeded;
        }

        if (block.timestamp > eta + gracePeriod) {
            return ProposalState.Expired;
        }

        return ProposalState.Queued;
    }

    /// @inheritdoc IDAOGovernor
    function getProposal(uint256 proposalId) external view override returns (Proposal memory) {
        return _proposals[proposalId];
    }

    /// @inheritdoc IDAOGovernor
    function hasVoted(uint256 proposalId, address account) external view override returns (bool) {
        return _hasVoted[proposalId][account];
    }

    /// @inheritdoc IDAOGovernor
    function getVoteReceipt(
        uint256 proposalId,
        address voter
    ) external view override returns (VoteType support, uint256 weight) {
        VoteReceipt memory receipt = _voteReceipts[proposalId][voter];
        return (receipt.support, receipt.weight);
    }

    /// @inheritdoc IDAOGovernor
    function hashProposal(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas,
        bytes32 descriptionHash
    ) public pure override returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas, descriptionHash)));
    }

    /// @notice Get proposal count
    /// @return Total number of proposals
    function proposalCount() external view returns (uint256) {
        return _proposalCount;
    }

    /// @notice Get all proposal IDs
    /// @return Array of all proposal IDs
    function getAllProposalIds() external view returns (uint256[] memory) {
        return _proposalIds;
    }

    /// @notice Get proposal eta (timelock)
    /// @param proposalId The proposal ID
    /// @return The eta timestamp
    function proposalEta(uint256 proposalId) external view returns (uint256) {
        return _proposalEta[proposalId];
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IDAOGovernor
    function setQuorum(uint256 newQuorum) external override onlyOwner {
        if (newQuorum == 0 || newQuorum > BASIS_POINTS) revert IDAOGovernor.InvalidParameter();
        uint256 oldQuorum = quorum;
        quorum = newQuorum;
        emit QuorumUpdated(oldQuorum, newQuorum);
    }

    /// @inheritdoc IDAOGovernor
    function setProposalCreationCost(uint256 newCost) external override onlyOwner {
        uint256 oldCost = proposalCreationCost;
        proposalCreationCost = newCost;
        emit ProposalCostUpdated(oldCost, newCost);
    }

    /// @inheritdoc IDAOGovernor
    function pause() external override {
        if (msg.sender != owner() && !(msg.sender == pauseGuardian && pauseGuardian != address(0))) {
            revert IDAOGovernor.NotAuthorizedToPause();
        }
        _pause();
    }

    /// @inheritdoc IDAOGovernor
    function unpause() external override {
        if (msg.sender != owner() && !(msg.sender == pauseGuardian && pauseGuardian != address(0))) {
            revert IDAOGovernor.NotAuthorizedToPause();
        }
        _unpause();
    }

    /// @notice Set voting delay
    /// @param newDelay New delay in blocks
    function setVotingDelay(uint256 newDelay) external onlyOwner {
        if (newDelay < MIN_VOTING_DELAY) revert IDAOGovernor.InvalidParameter();
        uint256 oldDelay = votingDelay;
        votingDelay = newDelay;
        emit VotingDelayUpdated(oldDelay, newDelay);
    }

    /// @notice Set voting period
    /// @param newPeriod New period in blocks
    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod < MIN_VOTING_PERIOD) revert IDAOGovernor.InvalidParameter();
        uint256 oldPeriod = votingPeriod;
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(oldPeriod, newPeriod);
    }

    /// @notice Set timelock address
    /// @param newTimelock New timelock address
    function setTimelock(address newTimelock) external onlyOwner {
        if (newTimelock == address(0)) revert ZeroAddress();
        address oldTimelock = timelock;
        timelock = newTimelock;
        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    /// @inheritdoc IDAOGovernor
    function setProposalGuardian(address newGuardian) external override onlyOwner {
        address oldGuardian = proposalGuardian;
        proposalGuardian = newGuardian;
        emit ProposalGuardianSet(oldGuardian, newGuardian);
    }

    /// @inheritdoc IDAOGovernor
    function setPauseGuardian(address newGuardian) external override onlyOwner {
        address oldGuardian = pauseGuardian;
        pauseGuardian = newGuardian;
        emit PauseGuardianSet(oldGuardian, newGuardian);
    }

    /// @inheritdoc IDAOGovernor
    function setProposalThreshold(uint256 newThreshold) external override onlyOwner {
        if (newThreshold > BASIS_POINTS) revert IDAOGovernor.InvalidParameter();
        uint256 oldThreshold = proposalThreshold;
        proposalThreshold = newThreshold;
        emit ProposalThresholdUpdated(oldThreshold, newThreshold);
    }

    /// @notice Set grace period
    /// @param newPeriod New period in seconds
    function setGracePeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod < 1 days) revert IDAOGovernor.InvalidParameter();
        uint256 oldPeriod = gracePeriod;
        gracePeriod = newPeriod;
        emit GracePeriodUpdated(oldPeriod, newPeriod);
    }

    /// @notice Set maturity period
    /// @param newPeriod New period in blocks (0 to disable, otherwise >= MIN_MATURITY_PERIOD)
    function setMaturityPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod != 0 && newPeriod < MIN_MATURITY_PERIOD) revert IDAOGovernor.InvalidParameter();
        uint256 oldPeriod = maturityPeriod;
        maturityPeriod = newPeriod;
        emit MaturityPeriodUpdated(oldPeriod, newPeriod);
    }

    /// @notice Set pass rate
    /// @param newRate New rate in basis points (5000 = 50%)
    function setPassRate(uint256 newRate) external onlyOwner {
        if (newRate == 0 || newRate > BASIS_POINTS) revert InvalidPassRate();
        uint256 oldRate = passRate;
        passRate = newRate;
        emit PassRateUpdated(oldRate, newRate);
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @dev Internal vote casting logic
    function _castVote(uint256 proposalId, VoteType support, string memory reason) internal {
        Proposal storage proposal = _proposals[proposalId];

        if (proposal.snapshotBlock == 0) revert ProposalNotFound();
        if (block.number < proposal.voteStart) revert VotingNotStarted();
        if (block.number > proposal.voteEnd) revert VotingEnded();
        if (_hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        // Only registered delegates can vote
        if (!delegateRegistry.isRegisteredDelegate(msg.sender)) {
            revert NotDelegate();
        }

        // Get voting power (only delegations made 7+ days before snapshot)
        uint256 weight =
            delegateRegistry.getVotingPower(msg.sender, proposal.snapshotBlock, proposal.snapshotBlock);

        // Record vote
        _hasVoted[proposalId][msg.sender] = true;
        _voteReceipts[proposalId][msg.sender] = VoteReceipt({ support: support, weight: weight });

        // Update vote counts (For=0, Against=1, Abstain=2)
        if (support == VoteType.For) {
            proposal.forVotes += weight;
        } else if (support == VoteType.Against) {
            proposal.againstVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }

        emit VoteCast(msg.sender, proposalId, support, weight, reason);

        // Burn vTON if burn rate is set
        if (proposal.burnRate > 0 && weight > 0) {
            uint256 burnAmount = (weight * proposal.burnRate) / BASIS_POINTS;
            if (burnAmount > 0) {
                delegateRegistry.burnFromDelegate(msg.sender, burnAmount);
                emit VoteBurn(msg.sender, proposalId, burnAmount);
            }
        }
    }

    /// @notice Receive ETH for proposal execution
    receive() external payable { }
}
