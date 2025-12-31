const DEFAULT_GRAPHQL_URL = 'http://localhost:8000/graphql';

export function resolveGraphqlUrl(): string {
  return (
    process.env.GRAPHQL_URL ||
    process.env.NEXT_PUBLIC_GRAPHQL_URL ||
    DEFAULT_GRAPHQL_URL
  );
}

export function resolveBackendBase(): string {
  return resolveGraphqlUrl().replace(/\/?graphql$/i, '');
}
