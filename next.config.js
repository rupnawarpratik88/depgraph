/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure neo4j-driver runs only on the server side
  experimental: {
    serverComponentsExternalPackages: ['neo4j-driver'],
  },
}

module.exports = nextConfig
