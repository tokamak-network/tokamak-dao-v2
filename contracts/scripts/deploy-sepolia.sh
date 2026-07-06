#!/bin/bash
# Deploy contracts to Sepolia
# Usage: ./contracts/scripts/deploy-sepolia.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Tokamak DAO v2 - Sepolia Deployment ===${NC}"

# Check if .env exists
if [ ! -f "$CONTRACTS_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found in contracts directory${NC}"
    echo "Please create contracts/.env with PRIVATE_KEY and RPC_URL_SEPOLIA (optional: GOVERNANCE_ADMIN, ENABLE_TEST_PARAMS=false)"
    exit 1
fi

# Load environment variables
source "$CONTRACTS_DIR/.env"

if [ -z "$PRIVATE_KEY" ] || [ -z "$RPC_URL_SEPOLIA" ]; then
    echo -e "${RED}Error: PRIVATE_KEY or RPC_URL_SEPOLIA not set in .env${NC}"
    exit 1
fi

# Optional hardening params
GOVERNANCE_ADMIN=${GOVERNANCE_ADMIN:-}
ENABLE_TEST_PARAMS=${ENABLE_TEST_PARAMS:-false}

echo -e "${YELLOW}Hardening config:${NC} GOVERNANCE_ADMIN=${GOVERNANCE_ADMIN:-<deployer>} ENABLE_TEST_PARAMS=${ENABLE_TEST_PARAMS}"

# Build contracts
echo -e "${YELLOW}Building contracts...${NC}"
cd "$CONTRACTS_DIR"
forge build --quiet

# Deploy to Sepolia
echo -e "${YELLOW}Deploying to Sepolia...${NC}"
OUTPUT=$(forge script script/Deploy.s.sol:DeploySepoliaScript \
    --rpc-url "$RPC_URL_SEPOLIA" \
    --broadcast \
    -vvv 2>&1)

echo "$OUTPUT"

# Parse addresses from output
parse_address() {
    echo "$OUTPUT" | grep -o "$1: 0x[a-fA-F0-9]\{40\}" | head -1 | awk '{print $2}'
}

MOCK_TON=$(parse_address "MockTON deployed at")
VTON=$(parse_address "vTON deployed at")
DELEGATE_REGISTRY=$(parse_address "DelegateRegistry deployed at")
TIMELOCK=$(parse_address "Timelock deployed at")
DAO_GOVERNOR=$(parse_address "DAOGovernor deployed at")
SECURITY_COUNCIL=$(parse_address "SecurityCouncil deployed at")
FAUCET=$(parse_address "VTONFaucet deployed at")
TON_FAUCET=$(parse_address "TONFaucet deployed at")

# Verify we got all addresses
if [ -z "$VTON" ] || [ -z "$DELEGATE_REGISTRY" ] || [ -z "$DAO_GOVERNOR" ]; then
    echo -e "${RED}Error: Failed to parse contract addresses from deployment output${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Deployed Addresses ===${NC}"
echo "MockTON:          $MOCK_TON"
echo "vTON:             $VTON"
echo "DelegateRegistry: $DELEGATE_REGISTRY"
echo "Timelock:         $TIMELOCK"
echo "DAOGovernor:      $DAO_GOVERNOR"
echo "SecurityCouncil:  $SECURITY_COUNCIL"
echo "VTONFaucet:       $FAUCET"
echo "TONFaucet:        $TON_FAUCET"

# Update DeployFaucet.s.sol with new vTON address
FAUCET_SCRIPT="$CONTRACTS_DIR/script/DeployFaucet.s.sol"
if [ -f "$FAUCET_SCRIPT" ]; then
    sed -i.bak "s/address constant VTON_ADDRESS = 0x[a-fA-F0-9]\{40\}/address constant VTON_ADDRESS = $VTON/" "$FAUCET_SCRIPT"
    rm -f "$FAUCET_SCRIPT.bak"
    echo -e "${GREEN}Updated DeployFaucet.s.sol${NC}"
fi

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "You can verify the contracts on Etherscan:"
echo "  https://sepolia.etherscan.io/address/$VTON"
