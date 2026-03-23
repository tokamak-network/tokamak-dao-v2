// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMigrationEvents {
    event MigrationStep(uint8 indexed phase, uint8 indexed step, string description, address target);
    event MigrationPhaseStarted(uint8 indexed phase, string name);
    event MigrationPhaseCompleted(uint8 indexed phase);
    event MigrationCompleted();
}
