// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockDAOVault {
    address public owner;
    address public ton;

    constructor(address _owner, address _ton) {
        owner = _owner;
        ton = _ton;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function claimTON(address to, uint256 amount) external onlyOwner {
        IERC20(ton).transfer(to, amount);
    }
}
