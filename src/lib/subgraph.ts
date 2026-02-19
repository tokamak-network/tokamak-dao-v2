const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/1741593/vton-airdrop-simulator/v0.0.3";

const PAGE_SIZE = 1000;

export interface StakerData {
  address: string;
  totalDeposited: number; // TON
  totalWithdrawn: number; // TON
  netStaked: number; // deposited - withdrawn (TON)
  firstStakedAt: number; // unix seconds
  lastStakedAt: number; // unix seconds
  depositCount: number;
}

interface RawStaker {
  id: string;
  totalDeposited: string;
  totalWithdrawn: string;
  firstStakedAt: string;
  lastStakedAt: string;
  depositCount: string;
}

export interface ProtocolData {
  totalStakers: number;
  totalDeposited: number; // TON
  totalWithdrawn: number; // TON
  totalNetStaked: number; // TON
}

function rayToTon(rayValue: string): number {
  const big = BigInt(rayValue);
  // Shift by 27 - 9 = 18 decimals using BigInt, then divide by 1e9 in Number
  // This preserves more precision than converting the full BigInt to Number
  const shifted = big / BigInt(10 ** 18);
  return Number(shifted) / 1e9;
}

async function querySubgraph<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Subgraph request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Subgraph query error: ${json.errors[0]?.message}`);
  }

  return json.data as T;
}

function parseStaker(raw: RawStaker): StakerData {
  const totalDeposited = rayToTon(raw.totalDeposited);
  const totalWithdrawn = rayToTon(raw.totalWithdrawn);
  return {
    address: raw.id,
    totalDeposited,
    totalWithdrawn,
    netStaked: totalDeposited - totalWithdrawn,
    firstStakedAt: Number(raw.firstStakedAt),
    lastStakedAt: Number(raw.lastStakedAt),
    depositCount: Number(raw.depositCount),
  };
}

export async function fetchAllStakers(): Promise<StakerData[]> {
  const all: StakerData[] = [];
  let lastId = "";

  while (true) {
    const query = `
      query($lastId: String!, $pageSize: Int!) {
        stakers(
          first: $pageSize
          where: { id_gt: $lastId }
          orderBy: id
          orderDirection: asc
        ) {
          id
          totalDeposited
          totalWithdrawn
          firstStakedAt
          lastStakedAt
          depositCount
        }
      }
    `;

    const data = await querySubgraph<{ stakers: RawStaker[] }>(query, {
      lastId,
      pageSize: PAGE_SIZE,
    });

    if (data.stakers.length === 0) break;

    for (const raw of data.stakers) {
      all.push(parseStaker(raw));
    }

    lastId = data.stakers[data.stakers.length - 1].id;

    if (data.stakers.length < PAGE_SIZE) break;
  }

  return all;
}

export async function fetchProtocolStats(): Promise<ProtocolData> {
  const stakers = await fetchAllStakers();

  let totalDeposited = 0;
  let totalWithdrawn = 0;

  for (const s of stakers) {
    totalDeposited += s.totalDeposited;
    totalWithdrawn += s.totalWithdrawn;
  }

  return {
    totalStakers: stakers.length,
    totalDeposited,
    totalWithdrawn,
    totalNetStaked: totalDeposited - totalWithdrawn,
  };
}
