# Set Voting Delay

Change the DAOGovernor voting delay setting.

## Steps

1. Read `contracts/.env` to verify PRIVATE_KEY and RPC_URL_SEPOLIA
2. Read `src/constants/contracts.ts` to get DAO_GOVERNOR_ADDRESS for Sepolia
3. Build contracts: `cd contracts && forge build`
4. Run script:
   ```bash
   source contracts/.env && \
   DAO_GOVERNOR_ADDRESS=<address> VOTING_DELAY=0 \
   forge script script/SetVotingDelay.s.sol:SetVotingDelayScript \
     --rpc-url $RPC_URL_SEPOLIA --broadcast -vvv
   ```
5. Verify the new voting delay from logs

## Requirements

- PRIVATE_KEY and RPC_URL_SEPOLIA in contracts/.env
- Account must be DAOGovernor owner
- Sufficient Sepolia ETH for gas
