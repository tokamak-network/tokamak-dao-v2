// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockDAOCommitteeProxy {
    address public owner;
    bool public pauseProxy;
    address public daoVault;
    address[] public members;

    constructor(address _owner, address _daoVault) {
        owner = _owner;
        daoVault = _daoVault;
        members.push(address(0x1001));
        members.push(address(0x1002));
        members.push(address(0x1003));
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function setPauseProxy(bool _pause) external onlyOwner {
        pauseProxy = _pause;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function getCommitteeMembers() external view returns (address[] memory) {
        return members;
    }

    function memberCount() external view returns (uint256) {
        return members.length;
    }
}
