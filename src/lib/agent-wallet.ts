/**
 * Agent Wallet Management
 *
 * Generates and manages agent wallets for on-chain voting.
 * Private keys are encrypted with AES-256-GCM before storage.
 */

import crypto from "crypto";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { entryPoint07Address } from "viem/account-abstraction";

function getEncryptionKey(): Buffer {
  const key = process.env.AGENT_ENCRYPTION_KEY;
  if (!key) throw new Error("AGENT_ENCRYPTION_KEY is not set");
  return Buffer.from(key, "hex");
}

function getSepoliaRpcUrl(): string {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (apiKey) return `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
  return "https://rpc.sepolia.org";
}

/**
 * Generate a new agent wallet and return address + encrypted private key.
 */
export function generateAgentWallet(): {
  address: string;
  encryptedPrivateKey: string;
} {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encrypted
  const encryptedPrivateKey = `${iv.toString("hex")}:${authTag}:${encrypted}`;

  return {
    address: account.address,
    encryptedPrivateKey,
  };
}

/**
 * Decrypt an encrypted private key.
 */
export function decryptPrivateKey(encrypted: string): `0x${string}` {
  const [ivHex, authTagHex, ciphertext] = encrypted.split(":");
  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error("Invalid encrypted key format");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted as `0x${string}`;
}

/**
 * Create a viem WalletClient for an agent's private key on Sepolia.
 */
export function getAgentWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(getSepoliaRpcUrl()),
  });
}

/**
 * Create a viem PublicClient for reading Sepolia state.
 */
export function getSepoliaPublicClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(getSepoliaRpcUrl()),
  });
}

/**
 * Compute the deterministic Smart Account (counterfactual) address for a given private key.
 * This address can be funded with ETH by the owner before the account is deployed.
 */
export async function getSmartAccountAddress(privateKey: `0x${string}`): Promise<`0x${string}`> {
  const publicClient = getSepoliaPublicClient();
  const eoa = privateKeyToAccount(privateKey);

  const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: eoa,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  return smartAccount.address;
}

/**
 * Create a Smart Account Client for self-funded transactions.
 * The Smart Account pays gas from its own ETH balance (funded by the owner).
 * Pimlico is used only as a bundler to submit UserOps.
 */
export async function createSmartAccountClientForAgent(privateKey: `0x${string}`) {
  const apiKey = process.env.PIMLICO_API_KEY;
  if (!apiKey) throw new Error("PIMLICO_API_KEY is not set");

  const pimlicoUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`;

  const publicClient = getSepoliaPublicClient();
  const eoa = privateKeyToAccount(privateKey);

  const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: eoa,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  return createSmartAccountClient({
    account: smartAccount,
    chain: sepolia,
    bundlerTransport: http(pimlicoUrl),
    client: publicClient,
  });
}
