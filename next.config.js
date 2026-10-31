const pkg = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  productionBrowserSourceMaps: false,
  output: (process.env.STANDALONE_BUILD === 'true' && !process.env.VERCEL) ? 'standalone' : undefined,
  compress: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  httpAgentOptions: {
    keepAlive: true,
  },
};

module.exports = nextConfig;
