// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IvTON Interface
/// @notice Interface for the vTON governance token
/// @dev vTON is the governance token for Tokamak Network DAO
///      - Capped at 100M with halving mechanism
///      - Tradeable: Can be transferred between addresses
///      - Not-burnable: Tokens are not burned when voting
///      - Distributed to L2 Operators and Validators based on seigniorage
interface IvTON is IERC20 {
    /// @notice Emitted when vTON is minted to a recipient
    /// @param to The recipient address
    /// @param amount The amount minted
    event Minted(address indexed to, uint256 amount);

    /// @notice Emitted when the emission ratio is updated
    /// @param oldRatio The previous emission ratio
    /// @param newRatio The new emission ratio
    event EmissionRatioUpdated(uint256 oldRatio, uint256 newRatio);

    /// @notice Emitted when a minter is added or removed
    /// @param minter The minter address
    /// @param allowed Whether the minter is allowed
    event MinterUpdated(address indexed minter, bool allowed);

    /// @notice Emitted when a new epoch is entered due to totalSupply crossing an EPOCH_SIZE boundary
    /// @param oldEpoch The previous epoch number
    /// @param newEpoch The new epoch number
    /// @param newHalvingRatio The halving ratio for the new epoch (scaled 1e18)
    event EpochTransitioned(uint256 oldEpoch, uint256 newEpoch, uint256 newHalvingRatio);

    /// @notice Maximum total supply of vTON (100M)
    function MAX_SUPPLY() external view returns (uint256);

    /// @notice Size of each epoch in vTON (5M)
    function EPOCH_SIZE() external view returns (uint256);

    /// @notice Decay rate per epoch (0.75 scaled 1e18)
    function DECAY_RATE() external view returns (uint256);

    /// @notice Mint vTON tokens to a recipient
    /// @param to The recipient address
    /// @param amount The amount to mint
    /// @dev Only callable by authorized minters (L2 Operator, Validator contracts)
    function mint(address to, uint256 amount) external;

    /// @notice Get the current emission ratio (0-1e18 representing 0-100%)
    /// @return The emission ratio scaled by 1e18
    function emissionRatio() external view returns (uint256);

    /// @notice Set the emission ratio for vTON distribution
    /// @param ratio The new ratio (0 to 1e18, where 1e18 = 100%)
    /// @dev Only callable through DAO governance
    function setEmissionRatio(uint256 ratio) external;

    /// @notice Check if an address is an authorized minter
    /// @param account The address to check
    /// @return True if the address is a minter
    function isMinter(address account) external view returns (bool);

    /// @notice Add or remove a minter
    /// @param minter The minter address
    /// @param allowed Whether to allow or disallow minting
    /// @dev Only callable by admin (initially deployer, then DAO)
    function setMinter(address minter, bool allowed) external;

    /// @notice Get the voting power of an account at a specific block
    /// @param account The account to check
    /// @param blockNumber The block number to check at
    /// @return The voting power at that block
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);

    /// @notice Get the current voting power of an account
    /// @param account The account to check
    /// @return The current voting power
    function getVotes(address account) external view returns (uint256);

    /// @notice Get the current epoch number based on totalSupply
    /// @return The epoch number (totalSupply / EPOCH_SIZE)
    function getCurrentEpoch() external view returns (uint256);

    /// @notice Get the current halving ratio based on the current epoch
    /// @return The halving ratio (scaled 1e18)
    function getHalvingRatio() external view returns (uint256);
}
