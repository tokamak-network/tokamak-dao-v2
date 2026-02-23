import type { PublicClient, Log, AbiEvent } from "viem";

const MAX_BLOCK_RANGE = BigInt(49_999);

type GetLogsParams = {
  address?: `0x${string}`;
  event?: AbiEvent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any;
  fromBlock: bigint;
  toBlock: bigint;
};

/**
 * Fetches event logs in chunked block ranges to avoid RPC "exceed maximum block range" errors.
 * Compatible with any RPC provider's block range limit (default: 50,000 blocks).
 */
export async function getLogsInChunks(
  client: PublicClient,
  params: Omit<GetLogsParams, "fromBlock" | "toBlock"> & {
    fromBlock: bigint;
    toBlock: bigint | "latest";
  }
): Promise<Log[]> {
  const latestBlock =
    params.toBlock === "latest"
      ? await client.getBlockNumber()
      : params.toBlock;

  const from = params.fromBlock;
  if (from > latestBlock) return [];

  const allLogs: Log[] = [];
  let cursor = from;

  while (cursor <= latestBlock) {
    const end =
      cursor + MAX_BLOCK_RANGE > latestBlock
        ? latestBlock
        : cursor + MAX_BLOCK_RANGE;

    const logs = await client.getLogs({
      ...params,
      fromBlock: cursor,
      toBlock: end,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    allLogs.push(...logs);
    cursor = end + 1n;
  }

  return allLogs;
}
