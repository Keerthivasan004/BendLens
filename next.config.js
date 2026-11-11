const pkg = require('./package.json');
const fs = require('fs');
const path = require('path');

// Clean up stale build marker on dev startup so Next dev never crashes with "production build" conflict
if (process.env.NODE_ENV !== 'production') {
  try {
    const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID');
    if (fs.existsSync(buildIdPath)) {
      fs.unlinkSync(buildIdPath);
    }
  } catch (_e) { }
}

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
  async rewrites() {
    return [
      { source: '/privacy-policy', destination: '/privacy' },
      { source: '/terms-of-service', destination: '/terms' },
      { source: '/terms-of-use', destination: '/terms' },
    ];
  },
};

module.exports = nextConfig;
