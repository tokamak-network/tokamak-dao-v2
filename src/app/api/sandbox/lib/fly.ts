import { encodeFunctionData } from "viem";
import rawDeployData from "./deploy-data.json";

interface DeployTransaction {
  from: string;
  to: string | null;
  data: string;
  value: string;
}

interface DeployData {
  transactions: DeployTransaction[];
  addresses: {
    ton: string;
    vton: string;
    delegateRegistry: string;
    daoGovernor: string;
    securityCouncil: string;
    timelock: string;
    faucet: string;
    tonFaucet: string;
  };
}

const deployData = rawDeployData as DeployData;

const FLY_API_URL = "https://api.machines.dev/v1";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN!;
const FLY_APP_NAME = process.env.FLY_APP_NAME!;
const DEPLOYER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function getMachineRpcUrl(): string {
  return `https://${FLY_APP_NAME}.fly.dev`;
}

function flyHeaders(): Record<string, string> {
  // FlyV1 macaroon tokens already include the auth scheme ("FlyV1 fm2_..."),
  // while legacy tokens ("fo1_...") need the "Bearer" prefix.
  const authorization = FLY_API_TOKEN.startsWith("FlyV1")
    ? FLY_API_TOKEN
    : `Bearer ${FLY_API_TOKEN}`;
  return {
    Authorization: authorization,
    "Content-Type": "application/json",
  };
}

export async function listMachines(): Promise<{ id: string; state: string }[]> {
  const response = await fetch(
    `${FLY_API_URL}/apps/${FLY_APP_NAME}/machines`,
    { method: "GET", headers: flyHeaders() }
  );
  if (!response.ok) return [];
  return response.json();
}

async function destroyAllMachines(): Promise<void> {
  const machines = await listMachines();
  await Promise.all(
    machines
      .filter((m) => m.state !== "destroyed")
      .map((m) => destroyMachine(m.id).catch(() => {}))
  );
}

export async function createMachine(): Promise<string> {
  // Destroy all existing machines so Fly auto-routing always hits the new one.
  // MetaMask can't set fly-force-instance-id, so only one machine can be alive.
  await destroyAllMachines();

  const response = await fetch(
    `${FLY_API_URL}/apps/${FLY_APP_NAME}/machines`,
    {
      method: "POST",
      headers: flyHeaders(),
      body: JSON.stringify({
        region: "nrt",
        config: {
          image: "ghcr.io/foundry-rs/foundry:latest",
          guest: { cpu_kind: "shared", cpus: 1, memory_mb: 256 },
          init: {
            cmd: ["timeout 7200 anvil --host 0.0.0.0 --chain-id 13373"],
          },
          auto_destroy: true,
          restart: { policy: "no" },
          services: [
            {
              ports: [
                { port: 443, handlers: ["tls", "http"] },
                { port: 80, handlers: ["http"] },
              ],
              protocol: "tcp",
              internal_port: 8545,
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create machine: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.id;
}

export async function waitForMachine(machineId: string): Promise<void> {
  const timeout = 30_000;
  const start = Date.now();

  // 1. Wait for Fly Machine state = "started"
  while (Date.now() - start < timeout) {
    const machine = await getMachine(machineId);
    if (machine.state === "started") break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  // 2. Wait for Anvil RPC to be ready inside the machine
  while (Date.now() - start < timeout) {
    try {
      await anvilRpc(machineId, "eth_blockNumber", []);
      return; // Anvil is ready
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error(`Machine ${machineId} did not start within 30s`);
}

export async function destroyMachine(machineId: string): Promise<void> {
  const response = await fetch(
    `${FLY_API_URL}/apps/${FLY_APP_NAME}/machines/${machineId}?force=true`,
    {
      method: "DELETE",
      headers: flyHeaders(),
    }
  );

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Failed to destroy machine: ${response.status} ${text}`);
  }
}

export async function getMachine(
  machineId: string
): Promise<{ state: string }> {
  const response = await fetch(
    `${FLY_API_URL}/apps/${FLY_APP_NAME}/machines/${machineId}`,
    {
      method: "GET",
      headers: flyHeaders(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get machine: ${response.status} ${text}`);
  }

  return response.json();
}

export async function proxyRpc(
  machineId: string | null,
  body: unknown
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (machineId) {
    headers["fly-force-instance-id"] = machineId;
  }
  return fetch(getMachineRpcUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
}

export async function anvilRpc(
  machineId: string,
  method: string,
  params: unknown[] = []
): Promise<unknown> {
  const response = await proxyRpc(machineId, {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RPC call ${method} failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC error in ${method}: ${data.error.message}`);
  }

  return data.result;
}

async function waitForReceipt(
  machineId: string,
  txHash: string
): Promise<void> {
  for (let i = 0; i < 50; i++) {
    const receipt = await anvilRpc(machineId, "eth_getTransactionReceipt", [
      txHash,
    ]);
    if (receipt) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Transaction receipt not found for ${txHash}`);
}

export async function deployContracts(
  machineId: string
): Promise<DeployData["addresses"]> {
  for (const tx of deployData.transactions) {
    const txHash = (await anvilRpc(machineId, "eth_sendTransaction", [
      {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      },
    ])) as string;

    await waitForReceipt(machineId, txHash);
  }

  return deployData.addresses;
}

const mintAbi = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export async function fundWallet(
  machineId: string,
  address: string
): Promise<void> {
  // 1. Set ETH balance (100 ETH) and mine a block so MetaMask picks it up
  await anvilRpc(machineId, "anvil_setBalance", [
    address,
    "0x56BC75E2D63100000",
  ]);
  await anvilRpc(machineId, "anvil_mine", [1]);

  const mintAmount = BigInt("10000000000000000000000"); // 10000e18

  // 2. Mint MockTON and wait for receipt
  const tonMintData = encodeFunctionData({
    abi: mintAbi,
    functionName: "mint",
    args: [address as `0x${string}`, mintAmount],
  });

  const tonTxHash = (await anvilRpc(machineId, "eth_sendTransaction", [
    {
      from: DEPLOYER_ADDRESS,
      to: deployData.addresses.ton,
      data: tonMintData,
    },
  ])) as string;
  await waitForReceipt(machineId, tonTxHash);

  // 3. Mint vTON and wait for receipt
  const vtonMintData = encodeFunctionData({
    abi: mintAbi,
    functionName: "mint",
    args: [address as `0x${string}`, mintAmount],
  });

  const vtonTxHash = (await anvilRpc(machineId, "eth_sendTransaction", [
    {
      from: DEPLOYER_ADDRESS,
      to: deployData.addresses.vton,
      data: vtonMintData,
    },
  ])) as string;
  await waitForReceipt(machineId, vtonTxHash);
}
