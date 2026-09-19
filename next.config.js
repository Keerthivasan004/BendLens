/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false
  },
  serverExternalPackages: ['adm-zip'],
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
