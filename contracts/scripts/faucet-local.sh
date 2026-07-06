#!/bin/bash
# Send ETH, TON, and vTON to an address on local Anvil
# Usage: ./scripts/faucet-local.sh <address>
#
# Prerequisites:
#   - Run './contracts/scripts/start-anvil.sh' in another terminal
#   - Run './contracts/scripts/deploy-local.sh' first

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(dirname "$SCRIPT_DIR")"
ADDRESSES_ENV="$CONTRACTS_DIR/.local-addresses.env"

source "$SCRIPT_DIR/local-config.sh"

# Validate argument
if [ -z "$1" ]; then
    echo -e "${RED}Usage: ./contracts/scripts/faucet-local.sh <address>${NC}"
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
    echo -e "Please start anvil first: ${CYAN}./contracts/scripts/start-anvil.sh${NC}"
    exit 1
fi

# Load contract addresses saved by deploy-local.sh
if [ ! -f "$ADDRESSES_ENV" ]; then
    echo -e "${RED}Error: $ADDRESSES_ENV not found.${NC}"
    echo -e "Run ${CYAN}./contracts/scripts/deploy-local.sh${NC} first."
    exit 1
fi

source "$ADDRESSES_ENV"

if [ -z "$TON" ] || [ -z "$VTON" ]; then
    echo -e "${RED}Error: TON/vTON addresses missing in $ADDRESSES_ENV${NC}"
    echo -e "Run ${CYAN}./contracts/scripts/deploy-local.sh${NC} first."
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
TON_BAL=$(cast call "$TON" "balanceOf(address)(uint256)" "$ADDRESS" --rpc-url "$LOCAL_RPC_URL" | awk '{print $1}')
VTON_BAL=$(cast call "$VTON" "balanceOf(address)(uint256)" "$ADDRESS" --rpc-url "$LOCAL_RPC_URL" | awk '{print $1}')

echo -e "ETH:  ${CYAN}$ETH_BAL${NC}"
echo -e "TON:  ${CYAN}$(cast from-wei "$TON_BAL")${NC}"
echo -e "vTON: ${CYAN}$(cast from-wei "$VTON_BAL")${NC}"
