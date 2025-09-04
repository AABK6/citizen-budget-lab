/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No redirects for /build; it is a first-class page.
  async rewrites() {
    // Proxy same-origin calls to `/api/graphql` to the backend GraphQL URL.
    // Defaults to localhost:8000 in dev; can be overridden via NEXT_PUBLIC_GRAPHQL_URL.
    const dest = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql'
    const base = dest.replace(/\/?graphql$/i, '')
    return [
      { source: '/api/graphql', destination: dest },
      // Pass-through for backend non-GraphQL endpoints (e.g., /health)
      { source: '/api/backend/:path*', destination: `${base}/:path*` },
    ]
  }
}

module.exports = nextConfig
