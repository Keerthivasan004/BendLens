/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false
  },
  experimental: {
    serverComponentsExternalPackages: []
  }
};

module.exports = nextConfig;
