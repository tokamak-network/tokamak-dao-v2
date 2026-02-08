#!/bin/bash
# Generate deploy-data.json for sandbox mode by deploying contracts to a temporary Anvil
# Usage: ./scripts/setup-sandbox-deploy-data.sh
#
# Prerequisites:
#   - foundry (forge, anvil) installed
#   - jq installed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
OUTPUT_FILE="$PROJECT_ROOT/src/app/api/sandbox/lib/deploy-data.json"

ANVIL_PORT=8546
ANVIL_RPC="http://127.0.0.1:$ANVIL_PORT"
CHAIN_ID=1337
DEPLOYER_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    if [ -n "$ANVIL_PID" ]; then
        echo -e "${YELLOW}Stopping temporary Anvil (PID: $ANVIL_PID)...${NC}"
        kill "$ANVIL_PID" 2>/dev/null || true
        wait "$ANVIL_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo -e "${YELLOW}=== Sandbox Deploy Data Generator ===${NC}"

# Check prerequisites
for cmd in forge anvil jq; do
    if ! command -v "$cmd" &>/dev/null; then
        echo -e "${RED}Error: $cmd is not installed${NC}"
        exit 1
    fi
done

# Start temporary Anvil
echo -e "${YELLOW}Starting temporary Anvil on port $ANVIL_PORT...${NC}"
anvil --port "$ANVIL_PORT" --chain-id "$CHAIN_ID" --silent &
ANVIL_PID=$!
sleep 2

# Verify Anvil is running
if ! cast chain-id --rpc-url "$ANVIL_RPC" &>/dev/null; then
    echo -e "${RED}Error: Failed to start Anvil on port $ANVIL_PORT${NC}"
    exit 1
fi
echo -e "${GREEN}Anvil started (PID: $ANVIL_PID)${NC}"

# Build and deploy contracts
echo -e "${YELLOW}Building and deploying contracts...${NC}"
cd "$CONTRACTS_DIR"
forge build --quiet

forge script script/Deploy.s.sol:DeployLocalScript \
    --rpc-url "$ANVIL_RPC" \
    --private-key "$DEPLOYER_KEY" \
    --broadcast \
    -vvv 2>&1 | tail -20

# Parse broadcast output
BROADCAST_FILE="$CONTRACTS_DIR/broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json"

if [ ! -f "$BROADCAST_FILE" ]; then
    echo -e "${RED}Error: Broadcast file not found at $BROADCAST_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Parsing broadcast output...${NC}"

# Extract transactions (contract creations and calls)
TRANSACTIONS=$(jq '[.transactions[] | {
    from: .transaction.from,
    to: (.transaction.to // null),
    data: .transaction.input,
    value: (.transaction.value // "0x0")
}]' "$BROADCAST_FILE")

# Extract contract addresses by contractName (not by index, since CALL txs are interspersed)
TON=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="MockTON")] | .[0].contractAddress' "$BROADCAST_FILE")
VTON=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="vTON")] | .[0].contractAddress' "$BROADCAST_FILE")
DELEGATE_REGISTRY=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="DelegateRegistry")] | .[0].contractAddress' "$BROADCAST_FILE")
TIMELOCK=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="Timelock")] | .[0].contractAddress' "$BROADCAST_FILE")
DAO_GOVERNOR=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="DAOGovernor")] | .[0].contractAddress' "$BROADCAST_FILE")
SECURITY_COUNCIL=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="SecurityCouncil")] | .[0].contractAddress' "$BROADCAST_FILE")
FAUCET=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="VTONFaucet")] | .[0].contractAddress' "$BROADCAST_FILE")
TON_FAUCET=$(jq -r '[.transactions[] | select(.transactionType=="CREATE" and .contractName=="TONFaucet")] | .[0].contractAddress' "$BROADCAST_FILE")

# Verify we got the key addresses
if [ "$VTON" = "null" ] || [ -z "$VTON" ] || [ "$DAO_GOVERNOR" = "null" ] || [ -z "$DAO_GOVERNOR" ]; then
    echo -e "${RED}Error: Failed to parse contract addresses from broadcast output${NC}"
    echo "VTON=$VTON, DAOGovernor=$DAO_GOVERNOR"
    exit 1
fi

# Build output JSON
echo -e "${YELLOW}Writing deploy-data.json...${NC}"
jq -n \
    --argjson transactions "$TRANSACTIONS" \
    --arg ton "$TON" \
    --arg vton "$VTON" \
    --arg delegateRegistry "$DELEGATE_REGISTRY" \
    --arg daoGovernor "$DAO_GOVERNOR" \
    --arg securityCouncil "$SECURITY_COUNCIL" \
    --arg timelock "$TIMELOCK" \
    --arg faucet "$FAUCET" \
    --arg tonFaucet "$TON_FAUCET" \
    '{
        transactions: $transactions,
        addresses: {
            ton: ($ton | ascii_downcase),
            vton: ($vton | ascii_downcase),
            delegateRegistry: ($delegateRegistry | ascii_downcase),
            daoGovernor: ($daoGovernor | ascii_downcase),
            securityCouncil: ($securityCouncil | ascii_downcase),
            timelock: ($timelock | ascii_downcase),
            faucet: ($faucet | ascii_downcase),
            tonFaucet: ($tonFaucet | ascii_downcase)
        }
    }' > "$OUTPUT_FILE"

echo -e "\n${GREEN}=== Deploy Data Generated ===${NC}"
echo -e "Output: ${CYAN}$OUTPUT_FILE${NC}"
echo -e "Transactions: ${CYAN}$(echo "$TRANSACTIONS" | jq length)${NC}"
echo ""
echo -e "${GREEN}Contract Addresses:${NC}"
echo "  MockTON:          $TON"
echo "  vTON:             $VTON"
echo "  DelegateRegistry: $DELEGATE_REGISTRY"
echo "  Timelock:         $TIMELOCK"
echo "  DAOGovernor:      $DAO_GOVERNOR"
echo "  SecurityCouncil:  $SECURITY_COUNCIL"
echo "  VTONFaucet:       $FAUCET"
echo "  TONFaucet:        $TON_FAUCET"
