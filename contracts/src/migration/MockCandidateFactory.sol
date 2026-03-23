// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockCandidateFactory {
    uint256 public candidateCount;
    address[] public candidates;

    function deploy(address operator) external returns (address) {
        address candidate = address(
            uint160(uint256(keccak256(abi.encodePacked(operator, candidateCount))))
        );
        candidates.push(candidate);
        candidateCount++;
        return candidate;
    }

    function getCandidates() external view returns (address[] memory) {
        return candidates;
    }
}
