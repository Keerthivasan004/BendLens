/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false
  },
  serverExternalPackages: ['adm-zip'],
  productionBrowserSourceMaps: false,
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
