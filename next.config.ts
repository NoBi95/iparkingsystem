/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  turbopack: false, // disable Turbopack until server-only build works
};

module.exports = nextConfig;
