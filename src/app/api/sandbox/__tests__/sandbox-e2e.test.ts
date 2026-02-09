import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "child_process";
import {
  setRpcBaseUrl,
  deployContracts,
  fundWallet,
  anvilRpc,
} from "../lib/fly";
import { encodeFunctionData, parseEther } from "viem";

const ANVIL_PORT = 8546;
const ANVIL_URL = `http://127.0.0.1:${ANVIL_PORT}`;
const MACHINE_ID = "test-machine";

// Anvil default account #0
const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
// Anvil default account #1 (used as a regular user for faucet/transfer tests)
const USER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

let anvilProcess: ChildProcess;

const erc20BalanceOfAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const erc20TransferAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const claimAbi = [
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

async function waitForAnvil(): Promise<void> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(ANVIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_blockNumber",
          params: [],
        }),
      });
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Anvil did not start within 15 seconds");
}

describe("Sandbox E2E", () => {
  let addresses: Awaited<ReturnType<typeof deployContracts>>;

  beforeAll(async () => {
    // Spawn a local Anvil instance for testing
    anvilProcess = spawn(
      "anvil",
      [
        "--host",
        "127.0.0.1",
        "--port",
        String(ANVIL_PORT),
        "--chain-id",
        "13374",
      ],
      { stdio: "pipe" }
    );

    anvilProcess.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("error") || msg.includes("Error")) {
        console.error("[anvil stderr]", msg);
      }
    });

    await waitForAnvil();

    // Redirect all RPC calls to local Anvil
    setRpcBaseUrl(ANVIL_URL);

    // Deploy contracts
    addresses = await deployContracts(MACHINE_ID);
  }, 120_000);

  afterAll(async () => {
    setRpcBaseUrl(null);
    if (anvilProcess) {
      anvilProcess.kill("SIGTERM");
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        anvilProcess.on("exit", () => resolve());
        setTimeout(resolve, 3000);
      });
    }
  });

  it("should deploy all contracts with bytecode", async () => {
    const contractEntries = Object.entries(addresses);
    expect(contractEntries.length).toBeGreaterThan(0);

    for (const [name, address] of contractEntries) {
      const code = (await anvilRpc(MACHINE_ID, "eth_getCode", [
        address,
        "latest",
      ])) as string;
      expect(code, `Contract ${name} at ${address} should have bytecode`).not.toBe("0x");
      expect(code.length, `Contract ${name} bytecode should be non-trivial`).toBeGreaterThan(10);
    }
  });

  it("should fund wallet with ETH, TON, and vTON", async () => {
    await fundWallet(MACHINE_ID, USER_ADDRESS);

    // Check ETH balance (100 ETH = 0x56BC75E2D63100000)
    const ethBalance = (await anvilRpc(MACHINE_ID, "eth_getBalance", [
      USER_ADDRESS,
      "latest",
    ])) as string;
    expect(BigInt(ethBalance)).toBe(parseEther("100"));

    // Check TON balance (10000e18)
    const tonBalanceData = encodeFunctionData({
      abi: erc20BalanceOfAbi,
      functionName: "balanceOf",
      args: [USER_ADDRESS as `0x${string}`],
    });
    const tonBalanceHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.ton, data: tonBalanceData },
      "latest",
    ])) as string;
    expect(BigInt(tonBalanceHex)).toBe(parseEther("10000"));

    // Check vTON balance (10000e18)
    const vtonBalanceData = encodeFunctionData({
      abi: erc20BalanceOfAbi,
      functionName: "balanceOf",
      args: [USER_ADDRESS as `0x${string}`],
    });
    const vtonBalanceHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.vton, data: vtonBalanceData },
      "latest",
    ])) as string;
    expect(BigInt(vtonBalanceHex)).toBe(parseEther("10000"));
  });

  it("should claim vTON from faucet", async () => {
    // Get initial vTON balance
    const balanceOfData = encodeFunctionData({
      abi: erc20BalanceOfAbi,
      functionName: "balanceOf",
      args: [USER_ADDRESS as `0x${string}`],
    });
    const initialBalanceHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.vton, data: balanceOfData },
      "latest",
    ])) as string;
    const initialBalance = BigInt(initialBalanceHex);

    // Send claim() transaction from USER_ADDRESS via Anvil impersonation
    const claimData = encodeFunctionData({
      abi: claimAbi,
      functionName: "claim",
    });

    const txHash = (await anvilRpc(MACHINE_ID, "eth_sendTransaction", [
      {
        from: USER_ADDRESS,
        to: addresses.faucet,
        data: claimData,
      },
    ])) as string;
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    // Wait for receipt
    let receipt = null;
    for (let i = 0; i < 50; i++) {
      receipt = await anvilRpc(MACHINE_ID, "eth_getTransactionReceipt", [
        txHash,
      ]);
      if (receipt) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(receipt).not.toBeNull();

    // Check vTON balance increased by 1000 ether (faucet claim amount)
    const newBalanceHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.vton, data: balanceOfData },
      "latest",
    ])) as string;
    const newBalance = BigInt(newBalanceHex);
    expect(newBalance - initialBalance).toBe(parseEther("1000"));
  });

  it("should send TON transfer and verify balance changes", async () => {
    const recipient = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Anvil account #2

    // Get initial balances
    const senderBalanceData = encodeFunctionData({
      abi: erc20BalanceOfAbi,
      functionName: "balanceOf",
      args: [USER_ADDRESS as `0x${string}`],
    });
    const recipientBalanceData = encodeFunctionData({
      abi: erc20BalanceOfAbi,
      functionName: "balanceOf",
      args: [recipient as `0x${string}`],
    });

    const senderInitialHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.ton, data: senderBalanceData },
      "latest",
    ])) as string;
    const recipientInitialHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.ton, data: recipientBalanceData },
      "latest",
    ])) as string;

    const transferAmount = parseEther("100");

    // Send transfer
    const transferData = encodeFunctionData({
      abi: erc20TransferAbi,
      functionName: "transfer",
      args: [recipient as `0x${string}`, transferAmount],
    });

    const txHash = (await anvilRpc(MACHINE_ID, "eth_sendTransaction", [
      {
        from: USER_ADDRESS,
        to: addresses.ton,
        data: transferData,
      },
    ])) as string;
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    // Wait for receipt
    let receipt = null;
    for (let i = 0; i < 50; i++) {
      receipt = await anvilRpc(MACHINE_ID, "eth_getTransactionReceipt", [
        txHash,
      ]);
      if (receipt) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(receipt).not.toBeNull();

    // Verify sender balance decreased
    const senderFinalHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.ton, data: senderBalanceData },
      "latest",
    ])) as string;
    expect(BigInt(senderInitialHex) - BigInt(senderFinalHex)).toBe(
      transferAmount
    );

    // Verify recipient balance increased
    const recipientFinalHex = (await anvilRpc(MACHINE_ID, "eth_call", [
      { to: addresses.ton, data: recipientBalanceData },
      "latest",
    ])) as string;
    expect(BigInt(recipientFinalHex) - BigInt(recipientInitialHex)).toBe(
      transferAmount
    );
  });

  it("should time travel by advancing block timestamp", async () => {
    // Get current block timestamp
    const blockBefore = (await anvilRpc(MACHINE_ID, "eth_getBlockByNumber", [
      "latest",
      false,
    ])) as { timestamp: string };
    const timestampBefore = BigInt(blockBefore.timestamp);

    // Advance time by 1 hour (3600 seconds) and mine a block
    const timeOffset = 3600;
    await anvilRpc(MACHINE_ID, "evm_increaseTime", [timeOffset]);
    await anvilRpc(MACHINE_ID, "evm_mine", []);

    // Verify block timestamp advanced
    const blockAfter = (await anvilRpc(MACHINE_ID, "eth_getBlockByNumber", [
      "latest",
      false,
    ])) as { timestamp: string };
    const timestampAfter = BigInt(blockAfter.timestamp);

    // The timestamp should have advanced by at least the time offset
    expect(timestampAfter - timestampBefore).toBeGreaterThanOrEqual(
      BigInt(timeOffset)
    );
  });
});
