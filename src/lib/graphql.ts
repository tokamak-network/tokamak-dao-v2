const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL;

export function isSubgraphEnabled(): boolean {
  return !!SUBGRAPH_URL;
}

export async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!SUBGRAPH_URL) {
    throw new Error("NEXT_PUBLIC_SUBGRAPH_URL is not configured");
  }

  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Subgraph query failed: ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`Subgraph query error: ${json.errors[0].message}`);
  }

  return json.data as T;
}
