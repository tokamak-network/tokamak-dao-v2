#!/bin/bash
# Copy contract source and compiled ABIs from dao-agent for AI agent tools
set -e
DAO_AGENT_DIR="${1:-../tokamak-dao-agent}"
if [ ! -d "$DAO_AGENT_DIR" ]; then
  echo "Error: dao-agent directory not found at $DAO_AGENT_DIR"
  echo "Usage: $0 [path-to-tokamak-dao-agent]"
  exit 1
fi
echo "Copying contract sources..."
rm -rf data/agent/contracts-src
cp -r "$DAO_AGENT_DIR/contracts/src" data/agent/contracts-src
echo "Copying compiled ABIs..."
rm -rf data/agent/contracts-out
cp -r "$DAO_AGENT_DIR/contracts/out" data/agent/contracts-out
echo "Done! Agent data files updated."
