// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20Votes } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import { Votes } from "@openzeppelin/contracts/governance/utils/Votes.sol";
import { Nonces } from "@openzeppelin/contracts/utils/Nonces.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IvTON } from "../interfaces/IvTON.sol";

/// @title vTON - Tokamak Network Governance Token
/// @notice The governance token for Tokamak Network DAO
/// @dev Key properties:
///      - Capped at 100M with halving mechanism
///      - Tradeable (can be transferred)
///      - Not burned on voting (voting is based on balance, not consumption)
///      - Distributed to L2 Operators and Validators (NOT DAO Treasury)
///      - Emission ratio adjustable by DAO (0-100%)
///      - Halving: every 5M vTON minted, the minting ratio decays by 25%
contract vTON is ERC20, ERC20Permit, ERC20Votes, Ownable, IvTON {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when caller is not an authorized minter
    error NotMinter();

    /// @notice Thrown when emission ratio exceeds maximum (100%)
    error InvalidEmissionRatio();

    /// @notice Thrown when setting zero address as minter
    error ZeroAddress();

    /// @notice Thrown when totalSupply has reached MAX_SUPPLY
    error MaxSupplyReached();

    /*//////////////////////////////////////////////////////////////
                            HALVING CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum total supply of vTON (100M)
    uint256 public constant override MAX_SUPPLY = 100_000_000e18;

    /// @notice Size of each epoch in vTON (5M)
    uint256 public constant override EPOCH_SIZE = 5_000_000e18;

    /// @notice Decay rate per epoch (0.75 scaled 1e18 = 25% reduction)
    uint256 public constant override DECAY_RATE = 75e16;

    /// @notice Initial halving rate (1.0 scaled 1e18)
    uint256 public constant INITIAL_HALVING_RATE = 1e18;

    /// @notice Maximum number of epochs (MAX_SUPPLY / EPOCH_SIZE)
    uint256 public constant MAX_EPOCHS = 20;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice Emission ratio for vTON distribution (scaled by 1e18)
    /// @dev 1e18 = 100%, 0 = 0%
    uint256 public override emissionRatio;

    /// @notice Maximum emission ratio (100%)
    uint256 public constant MAX_EMISSION_RATIO = 1e18;

    /// @notice Mapping of authorized minters
    mapping(address => bool) private _minters;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the vTON token
    /// @param initialOwner The initial owner (admin)
    constructor(address initialOwner)
        ERC20("Tokamak Network Governance Token", "vTON")
        ERC20Permit("Tokamak Network Governance Token")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0)) revert ZeroAddress();
        emissionRatio = MAX_EMISSION_RATIO; // Start at 100%
    }

    /*//////////////////////////////////////////////////////////////
                            MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IvTON
    function mint(address to, uint256 amount) external override {
        if (!_minters[msg.sender]) revert NotMinter();
        if (to == address(0)) revert ZeroAddress();

        uint256 currentSupply = totalSupply();
        if (currentSupply >= MAX_SUPPLY) revert MaxSupplyReached();

        // Calculate epoch and halving ratio based on current totalSupply
        uint256 epoch = currentSupply / EPOCH_SIZE;
        uint256 halvingRatio = _calculateHalvingRatio(epoch);

        // Apply halving ratio × emission ratio (dual application)
        uint256 adjustedAmount = (amount * halvingRatio / 1e18) * emissionRatio / 1e18;
        if (adjustedAmount == 0) return;

        // Cap at MAX_SUPPLY
        if (currentSupply + adjustedAmount > MAX_SUPPLY) {
            adjustedAmount = MAX_SUPPLY - currentSupply;
        }

        uint256 oldEpoch = epoch;
        _mint(to, adjustedAmount);
        emit Minted(to, adjustedAmount);

        // Check if epoch transitioned
        uint256 newEpoch = totalSupply() / EPOCH_SIZE;
        if (newEpoch > oldEpoch) {
            emit EpochTransitioned(oldEpoch, newEpoch, _calculateHalvingRatio(newEpoch));
        }
    }

    /// @inheritdoc IvTON
    function setEmissionRatio(uint256 ratio) external override onlyOwner {
        if (ratio > MAX_EMISSION_RATIO) revert InvalidEmissionRatio();

        uint256 oldRatio = emissionRatio;
        emissionRatio = ratio;
        emit EmissionRatioUpdated(oldRatio, ratio);
    }

    /// @inheritdoc IvTON
    function isMinter(address account) external view override returns (bool) {
        return _minters[account];
    }

    /// @inheritdoc IvTON
    function setMinter(address minter, bool allowed) external override onlyOwner {
        if (minter == address(0)) revert ZeroAddress();

        _minters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    /*//////////////////////////////////////////////////////////////
                           HALVING VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IvTON
    function getCurrentEpoch() public view override returns (uint256) {
        return totalSupply() / EPOCH_SIZE;
    }

    /// @inheritdoc IvTON
    function getHalvingRatio() public view override returns (uint256) {
        return _calculateHalvingRatio(getCurrentEpoch());
    }

    /// @dev Calculate the halving ratio for a given epoch
    /// @param epoch The epoch number
    /// @return The halving ratio (scaled 1e18)
    function _calculateHalvingRatio(uint256 epoch) internal pure returns (uint256) {
        if (epoch >= MAX_EPOCHS) return 0;
        uint256 ratio = INITIAL_HALVING_RATE;
        for (uint256 i = 0; i < epoch; i++) {
            ratio = (ratio * DECAY_RATE) / 1e18;
        }
        return ratio;
    }

    /*//////////////////////////////////////////////////////////////
                            VOTING POWER
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IvTON
    function getPastVotes(
        address account,
        uint256 blockNumber
    ) public view override(Votes, IvTON) returns (uint256) {
        return super.getPastVotes(account, blockNumber);
    }

    /// @inheritdoc IvTON
    function getVotes(address account) public view override(Votes, IvTON) returns (uint256) {
        return super.getVotes(account);
    }

    /*//////////////////////////////////////////////////////////////
                           REQUIRED OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /// @dev Override required by Solidity for ERC20Votes
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    /// @dev Override required by Solidity for ERC20Permit
    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
