/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  productionBrowserSourceMaps: false,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  compress: true,
  poweredByHeader: false,
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = nextConfig;
