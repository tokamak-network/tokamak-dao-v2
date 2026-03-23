import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  defineChain,
  keccak256,
  toHex,
  getAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Abi, Hex } from "viem";
import { MIGRATION_STEPS, TOTAL_STEPS } from "@/lib/migration-steps";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPLOYER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const DEPLOYER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
const TEST_ACCOUNT_1 =
  "0x488f3660FCD32099F2A250633822a6fbF6Eb771B" as const;
const TEST_ACCOUNT_2 =
  "0x31b4873B1730D924124A8118bbA84eE5672BE446" as const;

const localhost = defineChain({
  id: 1337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: localhost,
  transport: http("http://127.0.0.1:8545"),
});

const walletClient = createWalletClient({
  account,
  chain: localhost,
  transport: http("http://127.0.0.1:8545"),
});

// ---------------------------------------------------------------------------
// Artifact loading
// ---------------------------------------------------------------------------

interface ContractArtifact {
  abi: Abi;
  bytecode: Hex;
}

const ARTIFACT_PATHS: Record<string, string> = {
  MockTON: "Deploy.s.sol/MockTON.json",
  MockDAOVault: "MockDAOVault.sol/MockDAOVault.json",
  MockDAOCommitteeProxy: "MockDAOCommitteeProxy.sol/MockDAOCommitteeProxy.json",
  MockDAOAgendaManager: "MockDAOAgendaManager.sol/MockDAOAgendaManager.json",
  MockCandidateFactory: "MockCandidateFactory.sol/MockCandidateFactory.json",
  MockSeigManager: "MockSeigManager.sol/MockSeigManager.json",
  vTON: "vTON.sol/vTON.json",
  DelegateRegistry: "DelegateRegistry.sol/DelegateRegistry.json",
  Timelock: "Timelock.sol/Timelock.json",
  DAOGovernor: "DAOGovernor.sol/DAOGovernor.json",
  SecurityCouncil: "SecurityCouncil.sol/SecurityCouncil.json",
};

async function loadArtifact(contractName: string): Promise<ContractArtifact> {
  const relativePath = ARTIFACT_PATHS[contractName];
  if (!relativePath) {
    throw new Error(`Unknown contract artifact: ${contractName}`);
  }

  const fullPath = path.join(
    process.cwd(),
    "contracts",
    "out",
    relativePath,
  );
  const raw = await fs.readFile(fullPath, "utf-8");
  const json = JSON.parse(raw);

  return {
    abi: json.abi as Abi,
    bytecode: json.bytecode.object as Hex,
  };
}

// ---------------------------------------------------------------------------
// Deploy / call helpers
// ---------------------------------------------------------------------------

async function deployContract(
  contractName: string,
  args: unknown[] = [],
): Promise<{ txHash: string; contractAddress: string }> {
  const artifact = await loadArtifact(contractName);

  const hash = await walletClient.deployContract({
    account,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args,
    chain: localhost,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error(`Deploy of ${contractName} did not return a contract address`);
  }

  return { txHash: hash, contractAddress: receipt.contractAddress };
}

async function callContract(
  contractName: string,
  address: string,
  functionName: string,
  args: unknown[] = [],
): Promise<string> {
  const artifact = await loadArtifact(contractName);

  const hash = await walletClient.writeContract({
    account,
    address: address as `0x${string}`,
    abi: artifact.abi,
    functionName,
    args,
    chain: localhost,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ---------------------------------------------------------------------------
// Step execution (switch on globalIndex)
// ---------------------------------------------------------------------------

type Addresses = Record<string, string>;

interface StepResult {
  txHash: string;
  contractAddress?: string;
}

async function executeStep(
  stepIndex: number,
  addresses: Addresses,
): Promise<StepResult> {
  switch (stepIndex) {
    // -----------------------------------------------------------------------
    // Phase 0: V1 Deploy
    // -----------------------------------------------------------------------

    case 0: {
      // Deploy MockTON (constructor mints 1M to msg.sender)
      const result = await deployContract("MockTON");
      return result;
    }

    case 1: {
      // Deploy MockDAOVault(deployer, ton)
      const result = await deployContract("MockDAOVault", [
        DEPLOYER_ADDRESS,
        addresses.ton,
      ]);
      return result;
    }

    case 2: {
      // Deploy MockDAOCommitteeProxy(deployer, daoVault)
      const result = await deployContract("MockDAOCommitteeProxy", [
        DEPLOYER_ADDRESS,
        addresses.daoVault,
      ]);
      return result;
    }

    case 3: {
      // Deploy MockDAOAgendaManager(daoCommitteeProxy)
      const result = await deployContract("MockDAOAgendaManager", [
        addresses.daoCommitteeProxy,
      ]);
      return result;
    }

    case 4: {
      // Deploy MockCandidateFactory (no args)
      const result = await deployContract("MockCandidateFactory");
      return result;
    }

    case 5: {
      // Deploy MockSeigManager(deployer)
      const result = await deployContract("MockSeigManager", [
        DEPLOYER_ADDRESS,
      ]);
      return result;
    }

    case 6: {
      // Mint TON to vault & test accounts
      await callContract("MockTON", addresses.ton, "mint", [
        addresses.daoVault,
        parseEther("100000"),
      ]);
      await callContract("MockTON", addresses.ton, "mint", [
        TEST_ACCOUNT_1,
        parseEther("10000"),
      ]);
      const txHash = await callContract("MockTON", addresses.ton, "mint", [
        TEST_ACCOUNT_2,
        parseEther("10000"),
      ]);
      return { txHash };
    }

    case 7: {
      // Deploy mock candidates via factory
      await callContract(
        "MockCandidateFactory",
        addresses.candidateFactory,
        "deploy",
        [TEST_ACCOUNT_1],
      );
      const txHash = await callContract(
        "MockCandidateFactory",
        addresses.candidateFactory,
        "deploy",
        [TEST_ACCOUNT_2],
      );
      return { txHash };
    }

    // -----------------------------------------------------------------------
    // Phase 1: V2 Deploy
    // -----------------------------------------------------------------------

    case 8: {
      // Deploy vTON(deployer)
      const result = await deployContract("vTON", [DEPLOYER_ADDRESS]);
      return result;
    }

    case 9: {
      // Deploy DelegateRegistry(vton, deployer)
      const result = await deployContract("DelegateRegistry", [
        addresses.vton,
        DEPLOYER_ADDRESS,
      ]);
      return result;
    }

    case 10: {
      // Deploy Timelock(deployer, 604800) – 7 days in seconds
      const result = await deployContract("Timelock", [
        DEPLOYER_ADDRESS,
        604800n,
      ]);
      return result;
    }

    case 11: {
      // Deploy DAOGovernor(ton, vton, delegateRegistry, timelock, deployer)
      const result = await deployContract("DAOGovernor", [
        addresses.ton,
        addresses.vton,
        addresses.delegateRegistry,
        addresses.timelock,
        DEPLOYER_ADDRESS,
      ]);
      return result;
    }

    case 12: {
      // Deploy SecurityCouncil(chairperson, members, governor, timelock, vton)
      const extMember2 = getAddress(
        "0x" + keccak256(toHex("external_member_2")).slice(26),
      );
      const result = await deployContract("SecurityCouncil", [
        TEST_ACCOUNT_1,
        [TEST_ACCOUNT_2, extMember2],
        addresses.governor,
        addresses.timelock,
        addresses.vton,
      ]);
      return result;
    }

    // -----------------------------------------------------------------------
    // Phase 2: Configure
    // -----------------------------------------------------------------------

    case 13: {
      const txHash = await callContract(
        "Timelock",
        addresses.timelock,
        "setGovernor",
        [addresses.governor],
      );
      return { txHash };
    }

    case 14: {
      const txHash = await callContract(
        "Timelock",
        addresses.timelock,
        "setSecurityCouncil",
        [addresses.securityCouncil],
      );
      return { txHash };
    }

    case 15: {
      const txHash = await callContract(
        "DelegateRegistry",
        addresses.delegateRegistry,
        "setGovernor",
        [addresses.governor],
      );
      return { txHash };
    }

    case 16: {
      const txHash = await callContract(
        "DAOGovernor",
        addresses.governor,
        "setProposalGuardian",
        [addresses.securityCouncil],
      );
      return { txHash };
    }

    case 17: {
      const txHash = await callContract(
        "DAOGovernor",
        addresses.governor,
        "setVotingDelay",
        [0],
      );
      return { txHash };
    }

    case 18: {
      const txHash = await callContract(
        "DAOGovernor",
        addresses.governor,
        "setVotingPeriod",
        [7200],
      );
      return { txHash };
    }

    case 19: {
      const txHash = await callContract("vTON", addresses.vton, "setMinter", [
        DEPLOYER_ADDRESS,
        true,
      ]);
      return { txHash };
    }

    case 20: {
      const txHash = await callContract("vTON", addresses.vton, "setMinter", [
        addresses.seigManager,
        true,
      ]);
      return { txHash };
    }

    case 21: {
      const txHash = await callContract(
        "MockSeigManager",
        addresses.seigManager,
        "setVTON",
        [addresses.vton],
      );
      return { txHash };
    }

    // -----------------------------------------------------------------------
    // Phase 3: Transition
    // -----------------------------------------------------------------------

    case 22: {
      // Mint 50K vTON to test accounts
      await callContract("vTON", addresses.vton, "mint", [
        TEST_ACCOUNT_1,
        parseEther("50000"),
      ]);
      const txHash = await callContract("vTON", addresses.vton, "mint", [
        TEST_ACCOUNT_2,
        parseEther("50000"),
      ]);
      return { txHash };
    }

    case 23: {
      const txHash = await callContract(
        "MockSeigManager",
        addresses.seigManager,
        "updateSeigniorage",
        [DEPLOYER_ADDRESS, parseEther("1000")],
      );
      return { txHash };
    }

    case 24: {
      const txHash = await callContract(
        "DelegateRegistry",
        addresses.delegateRegistry,
        "transferOwnership",
        [addresses.timelock],
      );
      return { txHash };
    }

    case 25: {
      const txHash = await callContract(
        "DAOGovernor",
        addresses.governor,
        "transferOwnership",
        [addresses.timelock],
      );
      return { txHash };
    }

    case 26: {
      const txHash = await callContract(
        "vTON",
        addresses.vton,
        "transferOwnership",
        [addresses.timelock],
      );
      return { txHash };
    }

    case 27: {
      const txHash = await callContract(
        "Timelock",
        addresses.timelock,
        "setPendingAdmin",
        [addresses.timelock],
      );
      return { txHash };
    }

    // -----------------------------------------------------------------------
    // Phase 4: Deprecate V1
    // -----------------------------------------------------------------------

    case 28: {
      const txHash = await callContract(
        "MockDAOVault",
        addresses.daoVault,
        "transferOwnership",
        [addresses.timelock],
      );
      return { txHash };
    }

    case 29: {
      const txHash = await callContract(
        "MockDAOCommitteeProxy",
        addresses.daoCommitteeProxy,
        "setPauseProxy",
        [true],
      );
      return { txHash };
    }

    default:
      throw new Error(`Unknown step index: ${stepIndex}`);
  }
}

// ---------------------------------------------------------------------------
// API route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stepIndex, addresses } = body as {
      stepIndex: number;
      addresses: Record<string, string>;
    };

    // Validate stepIndex
    if (typeof stepIndex !== "number" || stepIndex < 0 || stepIndex >= TOTAL_STEPS) {
      return NextResponse.json(
        {
          success: false,
          stepIndex,
          error: `Invalid stepIndex: must be 0..${TOTAL_STEPS - 1}`,
        },
        { status: 400 },
      );
    }

    // Validate required addresses for this step
    const stepDef = MIGRATION_STEPS[stepIndex];
    const missingAddresses = stepDef.requires.filter(
      (key) => !addresses?.[key],
    );
    if (missingAddresses.length > 0) {
      return NextResponse.json(
        {
          success: false,
          stepIndex,
          error: `Missing required addresses: ${missingAddresses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Execute the step
    const result = await executeStep(stepIndex, addresses ?? {});

    return NextResponse.json({
      success: true,
      stepIndex,
      txHash: result.txHash,
      contractAddress: result.contractAddress,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`[migration/step] Step execution failed:`, error);

    return NextResponse.json(
      {
        success: false,
        stepIndex: -1,
        error: message,
      },
      { status: 500 },
    );
  }
}
