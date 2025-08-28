export type GraphQLRequest = {
  query: string;
  variables?: Record<string, any>;
};

export async function graphqlFetch<T>({ query, variables }: GraphQLRequest): Promise<T> {
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphQL error: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors.map((e: any) => e.message).join('; '));
  }
  return json.data as T;
}

