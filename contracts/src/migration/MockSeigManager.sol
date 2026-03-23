// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IvTONMinter {
    function mint(address to, uint256 amount) external;
}

contract MockSeigManager {
    address public vtonAddress;
    address public owner;

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function setVTON(address _vton) external onlyOwner {
        vtonAddress = _vton;
    }

    function updateSeigniorage(address to, uint256 amount) external {
        if (vtonAddress != address(0)) {
            IvTONMinter(vtonAddress).mint(to, amount);
        }
    }
}
