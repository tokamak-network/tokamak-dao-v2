// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockDAOAgendaManager {
    uint256 public agendaCount;
    address public committee;

    constructor(address _committee) {
        committee = _committee;
    }

    function newAgenda(
        address[] calldata,
        bytes[] calldata,
        string calldata
    ) external returns (uint256) {
        agendaCount++;
        return agendaCount;
    }

    function getAgendaStatus(uint256) external pure returns (uint8) {
        return 0;
    }
}
