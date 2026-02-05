#!/bin/bash
# Send ETH, TON, and vTON to an address on local Anvil
# Usage: ./scripts/faucet-local.sh <address>
#
# Prerequisites:
#   - Run 'npm run anvil' in another terminal
#   - Run 'npm run contracts:deploy:local' first

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$CONTRACTS_DIR")"
CONTRACTS_TS="$PROJECT_ROOT/src/constants/contracts.ts"

source "$SCRIPT_DIR/local-config.sh"

# Validate argument
if [ -z "$1" ]; then
    echo -e "${RED}Usage: npm run faucet -- <address>${NC}"
    exit 1
fi

ADDRESS="$1"

# Validate address format
if [[ ! "$ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
    echo -e "${RED}Error: Invalid address format: $ADDRESS${NC}"
    exit 1
fi

# Check anvil connection
if ! cast chain-id --rpc-url "$LOCAL_RPC_URL" &>/dev/null; then
    echo -e "${RED}Error: Cannot connect to anvil at $LOCAL_RPC_URL${NC}"
    echo -e "Please start anvil first: ${CYAN}npm run anvil${NC}"
    exit 1
fi

# Parse contract addresses from contracts.ts
if [ ! -f "$CONTRACTS_TS" ]; then
    echo -e "${RED}Error: $CONTRACTS_TS not found. Run deploy first.${NC}"
    exit 1
fi

TON=$(grep -A 5 "1337:" "$CONTRACTS_TS" | grep 'ton:' | grep -v 'vton:' | grep -o '"0x[a-fA-F0-9]\{40\}"' | tr -d '"')
VTON=$(grep -A 5 "1337:" "$CONTRACTS_TS" | grep 'vton:' | grep -o '"0x[a-fA-F0-9]\{40\}"' | tr -d '"')

if [ -z "$TON" ] || [ -z "$VTON" ]; then
    echo -e "${RED}Error: Could not parse TON/vTON addresses from contracts.ts${NC}"
    echo -e "Run ${CYAN}npm run contracts:deploy:local${NC} first."
    exit 1
fi

echo -e "${YELLOW}=== Faucet - Local Anvil ===${NC}"
echo -e "Recipient: ${CYAN}$ADDRESS${NC}"
echo -e "TON:       ${CYAN}$TON${NC}"
echo -e "vTON:      ${CYAN}$VTON${NC}"
echo ""

# Send ETH
echo -e "${YELLOW}Sending 1000 ETH...${NC}"
cast send "$ADDRESS" --value 1000ether \
    --rpc-url "$LOCAL_RPC_URL" \
    --private-key "$DEPLOYER_KEY" \
    --quiet
echo -e "${GREEN}  ETH sent${NC}"

# Mint TON
echo -e "${YELLOW}Minting 10,000 TON...${NC}"
cast send "$TON" "mint(address,uint256)" "$ADDRESS" 10000ether \
    --rpc-url "$LOCAL_RPC_URL" \
    --private-key "$DEPLOYER_KEY" \
    --quiet
echo -e "${GREEN}  TON minted${NC}"

# Mint vTON
echo -e "${YELLOW}Minting 10,000 vTON...${NC}"
cast send "$VTON" "mint(address,uint256)" "$ADDRESS" 10000ether \
    --rpc-url "$LOCAL_RPC_URL" \
    --private-key "$DEPLOYER_KEY" \
    --quiet
echo -e "${GREEN}  vTON minted${NC}"

# Show balances
echo ""
echo -e "${GREEN}=== Balances ===${NC}"
ETH_BAL=$(cast balance "$ADDRESS" --rpc-url "$LOCAL_RPC_URL" --ether)
TON_BAL=$(cast call "$TON" "balanceOf(address)(uint256)" "$ADDRESS" --rpc-url "$LOCAL_RPC_URL" | head -1)
VTON_BAL=$(cast call "$VTON" "balanceOf(address)(uint256)" "$ADDRESS" --rpc-url "$LOCAL_RPC_URL" | head -1)

echo -e "ETH:  ${CYAN}$ETH_BAL${NC}"
echo -e "TON:  ${CYAN}$(cast from-wei "$TON_BAL")${NC}"
echo -e "vTON: ${CYAN}$(cast from-wei "$VTON_BAL")${NC}"
