const path = require('path')
const repoRoot = path.join(__dirname, '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: repoRoot,
  },
  outputFileTracingRoot: repoRoot,
}

module.exports = nextConfig
