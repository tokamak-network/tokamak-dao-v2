// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

interface IMockTON {
    function mint(address to, uint256 amount) external;
}

/// @title TONFaucet
/// @notice Testnet faucet for distributing TON tokens for governance testing
/// @dev Allows users to claim TON tokens without restrictions
contract TONFaucet is Ownable {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when claim amount is set to zero
    error InvalidClaimAmount();

    /// @notice Thrown when faucet is paused
    error FaucetPaused();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a user claims tokens
    /// @param user The address that claimed tokens
    /// @param amount The amount of tokens claimed
    /// @param timestamp The time of the claim
    event Claimed(address indexed user, uint256 amount, uint256 timestamp);

    /// @notice Emitted when claim amount is updated
    /// @param oldAmount The previous claim amount
    /// @param newAmount The new claim amount
    event ClaimAmountUpdated(uint256 oldAmount, uint256 newAmount);

    /// @notice Emitted when faucet pause status changes
    /// @param paused New pause status
    event PauseStatusUpdated(bool paused);

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice The TON token contract
    IMockTON public immutable ton;

    /// @notice Amount of TON tokens given per claim
    uint256 public claimAmount = 200 ether;

    /// @notice Total amount of tokens claimed from faucet
    uint256 public totalClaimed;

    /// @notice Whether the faucet is paused
    bool public paused;

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the faucet with TON token address
    /// @param _ton The address of the TON token contract
    /// @param _owner The initial owner of the faucet
    constructor(address _ton, address _owner) Ownable(_owner) {
        require(_ton != address(0), "Invalid TON address");
        ton = IMockTON(_ton);
    }

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Claim TON tokens from the faucet
    function claim() external {
        if (paused) revert FaucetPaused();

        totalClaimed += claimAmount;

        ton.mint(msg.sender, claimAmount);

        emit Claimed(msg.sender, claimAmount, block.timestamp);
    }

    /// @notice Check if a user can claim
    /// @return canClaimNow Whether the user can claim now
    function canClaim() external view returns (bool canClaimNow) {
        return !paused;
    }

    /*//////////////////////////////////////////////////////////////
                             ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Set the claim amount
    /// @param _amount New claim amount
    function setClaimAmount(uint256 _amount) external onlyOwner {
        if (_amount == 0) revert InvalidClaimAmount();
        uint256 oldAmount = claimAmount;
        claimAmount = _amount;
        emit ClaimAmountUpdated(oldAmount, _amount);
    }

    /// @notice Pause or unpause the faucet
    /// @param _paused New pause status
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PauseStatusUpdated(_paused);
    }
}
