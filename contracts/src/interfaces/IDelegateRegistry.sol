// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDelegateRegistry Interface
/// @notice Interface for the Delegate Registry contract
/// @dev Manages delegate registration and vTON delegation
///      Key features:
///      - Delegates must register with profile, voting philosophy, and interests
///      - vTON holders must delegate to vote (cannot vote directly)
interface IDelegateRegistry {
    /// @notice Delegate information structure
    struct DelegateInfo {
        string profile; // Identity or pseudonym
        string votingPhilosophy; // Decision-making criteria
        string interests; // Affiliations, investments, consulting relationships
        uint256 registeredAt; // Registration timestamp
        bool isActive; // Whether the delegate is active
    }

    /// @notice Delegation information structure
    struct DelegationInfo {
        address delegate; // The delegate receiving the delegation
        uint256 amount; // Amount of vTON delegated
        uint256 delegatedAt; // When the delegation was made
        uint256 expiresAt; // Informational only: suggested expiry (0 = no expiry, not enforced on-chain)
    }

    /// @notice Emitted when a delegate registers
    event DelegateRegistered(
        address indexed delegate, string profile, string votingPhilosophy, string interests
    );

    /// @notice Emitted when a delegate updates their info
    event DelegateUpdated(
        address indexed delegate, string profile, string votingPhilosophy, string interests
    );

    /// @notice Emitted when a delegate is deactivated
    event DelegateDeactivated(address indexed delegate);

    /// @notice Emitted when a delegate is reactivated
    event DelegateReactivated(address indexed delegate);

    /// @notice Emitted when vTON is delegated
    event Delegated(
        address indexed owner, address indexed delegate, uint256 amount, uint256 expiresAt
    );

    /// @notice Emitted when delegation is withdrawn
    event Undelegated(address indexed owner, address indexed delegate, uint256 amount);

    /// @notice Emitted when auto-expiry period is updated
    event AutoExpiryUpdated(uint256 oldExpiry, uint256 newExpiry);

    /// @notice Emitted when vTON is burned from a delegate's total
    event DelegateVTONBurned(address indexed delegate, uint256 amount);

    /// @notice Emitted when the governor address is updated
    event GovernorUpdated(address oldGovernor, address newGovernor);

    /// @notice Register as a delegate
    /// @param profile Identity or pseudonym
    /// @param votingPhilosophy Voting philosophy and decision criteria
    /// @param interests Interests disclosure (affiliations, investments, etc.)
    function registerDelegate(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external;

    /// @notice Register another address as a delegate (e.g. owner registers an agent)
    /// @param delegateAddr The address to register as delegate
    /// @param profile Identity or pseudonym
    /// @param votingPhilosophy Voting philosophy and decision criteria
    /// @param interests Interests disclosure (affiliations, investments, etc.)
    function registerDelegateFor(
        address delegateAddr,
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external;

    /// @notice Update delegate information
    /// @param profile New profile
    /// @param votingPhilosophy New voting philosophy
    /// @param interests New interests disclosure
    function updateDelegate(
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests
    ) external;

    /// @notice Deactivate as a delegate
    function deactivateDelegate() external;

    /// @notice Reactivate a previously deactivated delegate
    function reactivateDelegate() external;

    /// @notice Delegate vTON to a delegate
    /// @param delegate The delegate address
    /// @param amount Amount of vTON to delegate
    function delegate(address delegate, uint256 amount) external;

    /// @notice Delegate vTON using ERC-2612 permit (approve + delegate in 1 tx)
    /// @param delegate The delegate address
    /// @param amount Amount of vTON to delegate
    /// @param deadline Permit signature deadline
    /// @param v Signature v
    /// @param r Signature r
    /// @param s Signature s
    function delegateWithPermit(
        address delegate,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Register a delegate and delegate vTON with permit in 1 tx
    /// @param delegate The address to register as delegate
    /// @param profile Identity or pseudonym
    /// @param votingPhilosophy Voting philosophy
    /// @param interests Interests disclosure
    /// @param amount Amount of vTON to delegate
    /// @param deadline Permit signature deadline
    /// @param v Signature v
    /// @param r Signature r
    /// @param s Signature s
    function registerDelegateForAndDelegateWithPermit(
        address delegate,
        string calldata profile,
        string calldata votingPhilosophy,
        string calldata interests,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /// @notice Withdraw delegation from a delegate
    /// @param delegate The delegate address
    /// @param amount Amount to undelegate
    function undelegate(address delegate, uint256 amount) external;

    /// @notice Redelegate from one delegate to another
    /// @param fromDelegate Current delegate
    /// @param toDelegate New delegate
    /// @param amount Amount to redelegate
    function redelegate(address fromDelegate, address toDelegate, uint256 amount) external;

    /// @notice Get delegate information
    /// @param delegate The delegate address
    /// @return The delegate info struct
    function getDelegateInfo(address delegate) external view returns (DelegateInfo memory);

    /// @notice Check if an address is a registered delegate
    /// @param account The address to check
    /// @return True if registered and active
    function isRegisteredDelegate(address account) external view returns (bool);

    /// @notice Get total vTON delegated to a delegate
    /// @param delegate The delegate address
    /// @return Total delegated amount
    function getTotalDelegated(address delegate) external view returns (uint256);

    /// @notice Get delegation info for an owner to a specific delegate
    /// @param owner The vTON owner
    /// @param delegate The delegate
    /// @return The delegation info
    function getDelegation(
        address owner,
        address delegate
    ) external view returns (DelegationInfo memory);

    /// @notice Get voting power of a delegate at a specific block
    /// @param delegate The delegate address
    /// @param blockNumber The block to check
    /// @param snapshotBlock The proposal snapshot block
    /// @return Voting power
    function getVotingPower(
        address delegate,
        uint256 blockNumber,
        uint256 snapshotBlock
    ) external view returns (uint256);

    /// @notice Get the auto-expiry period (0 = no expiry)
    /// @return Period in seconds
    function autoExpiryPeriod() external view returns (uint256);

    /// @notice Set the auto-expiry period
    /// @param period New period in seconds (0 to disable)
    function setAutoExpiryPeriod(uint256 period) external;

    /// @notice Burn vTON from delegate's total (called by governor during voting)
    /// @param delegate The delegate address
    /// @param amount Amount of vTON to burn
    function burnFromDelegate(address delegate, uint256 amount) external;

    /// @notice Set the governor address
    /// @param governor_ The governor contract address
    function setGovernor(address governor_) external;

    /// @notice Get the governor address
    /// @return The governor contract address
    function governor() external view returns (address);

    /// @notice Get total vTON burned from a delegate
    /// @param delegate The delegate address
    /// @return Total burned amount
    function getTotalBurnedFromDelegate(address delegate) external view returns (uint256);

    /// @notice Get total vTON delegated across all delegates
    /// @return Total delegated amount
    function totalDelegatedAll() external view returns (uint256);
}
