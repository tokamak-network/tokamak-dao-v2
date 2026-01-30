#!/bin/bash
# Deploy contracts to Sepolia and update webapp addresses
# Usage: ./scripts/deploy-sepolia.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$CONTRACTS_DIR")"
CONTRACTS_TS="$PROJECT_ROOT/src/constants/contracts.ts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Tokamak DAO v2 - Sepolia Deployment ===${NC}"

# Check if .env exists
if [ ! -f "$CONTRACTS_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found in contracts directory${NC}"
    echo "Please create contracts/.env with PRIVATE_KEY and RPC_URL_SEPOLIA"
    exit 1
fi

# Load environment variables
source "$CONTRACTS_DIR/.env"

if [ -z "$PRIVATE_KEY" ] || [ -z "$RPC_URL_SEPOLIA" ]; then
    echo -e "${RED}Error: PRIVATE_KEY or RPC_URL_SEPOLIA not set in .env${NC}"
    exit 1
fi

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

VTON=$(parse_address "vTON deployed at")
DELEGATE_REGISTRY=$(parse_address "DelegateRegistry deployed at")
TIMELOCK=$(parse_address "Timelock deployed at")
DAO_GOVERNOR=$(parse_address "DAOGovernor deployed at")
SECURITY_COUNCIL=$(parse_address "SecurityCouncil deployed at")
FAUCET=$(parse_address "VTONFaucet deployed at")

# Verify we got all addresses
if [ -z "$VTON" ] || [ -z "$DELEGATE_REGISTRY" ] || [ -z "$DAO_GOVERNOR" ]; then
    echo -e "${RED}Error: Failed to parse contract addresses from deployment output${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Deployed Addresses ===${NC}"
echo "vTON:             $VTON"
echo "DelegateRegistry: $DELEGATE_REGISTRY"
echo "Timelock:         $TIMELOCK"
echo "DAOGovernor:      $DAO_GOVERNOR"
echo "SecurityCouncil:  $SECURITY_COUNCIL"
echo "VTONFaucet:       $FAUCET"

# Update contracts.ts
echo -e "\n${YELLOW}Updating webapp contract addresses...${NC}"

if [ ! -f "$CONTRACTS_TS" ]; then
    echo -e "${RED}Error: $CONTRACTS_TS not found${NC}"
    exit 1
fi

# Create sed pattern for updating Sepolia addresses
# Use temporary file for cross-platform compatibility
TMP_FILE=$(mktemp)

awk -v vton="$VTON" \
    -v registry="$DELEGATE_REGISTRY" \
    -v governor="$DAO_GOVERNOR" \
    -v council="$SECURITY_COUNCIL" \
    -v timelock="$TIMELOCK" \
    -v faucet="$FAUCET" '
BEGIN { in_sepolia = 0 }
/\/\/ Sepolia Testnet/ { in_sepolia = 1 }
/11155111:/ && in_sepolia { in_block = 1 }
in_block && /vton:/ { gsub(/"0x[a-fA-F0-9]+"/, "\"" vton "\"") }
in_block && /delegateRegistry:/ { gsub(/"0x[a-fA-F0-9]+"/, "\"" registry "\"") }
in_block && /daoGovernor:/ { gsub(/"0x[a-fA-F0-9]+"/, "\"" governor "\"") }
in_block && /securityCouncil:/ { gsub(/"0x[a-fA-F0-9]+"/, "\"" council "\"") }
in_block && /timelock:/ { gsub(/"0x[a-fA-F0-9]+"/, "\"" timelock "\"") }
in_block && /faucet:/ { gsub(/"0x[a-fA-F0-9]+"/, "\"" faucet "\"") }
in_block && /},/ { in_block = 0; in_sepolia = 0 }
{ print }
' "$CONTRACTS_TS" > "$TMP_FILE"

mv "$TMP_FILE" "$CONTRACTS_TS"

# Update DeployFaucet.s.sol with new vTON address
FAUCET_SCRIPT="$CONTRACTS_DIR/script/DeployFaucet.s.sol"
if [ -f "$FAUCET_SCRIPT" ]; then
    sed -i.bak "s/address constant VTON_ADDRESS = 0x[a-fA-F0-9]\{40\}/address constant VTON_ADDRESS = $VTON/" "$FAUCET_SCRIPT"
    rm -f "$FAUCET_SCRIPT.bak"
    echo -e "${GREEN}Updated DeployFaucet.s.sol${NC}"
fi

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Webapp addresses updated in: ${YELLOW}src/constants/contracts.ts${NC}"
echo ""
echo "You can verify the contracts on Etherscan:"
echo "  https://sepolia.etherscan.io/address/$VTON"
