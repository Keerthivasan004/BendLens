// @ts-nocheck
/* eslint-disable */
/**
 * Web & Cloud Production Crawler Profile (HTTPS & Vercel Serverless Environment)
 *
 * This profile governs execution on Vercel Serverless / AWS Lambda cloud functions.
 * It is completely isolated from the local developer profile.
 *
 * Optimized for Vercel Serverless environments:
 * - Adapts to Vercel maxDuration: 60 with a safe 42,000ms crawl ceiling.
 * - Concurrency of 18 for high-throughput HTTP chunk scraping in cloud datacenters.
 * - Concurrency of 40 for non-blocking UDP DNS lookups in datacenter networks.
 * - Multi-source passive reconnaissance including Subdomain Center & AlienVault.
 * - Adaptive stage throttling to prevent function timeouts.
 */

const webCrawlerProfile = {
  name: 'web_production_serverless',
  isServerless: true,

  // Chunk crawling budget - Unbounded by default; dynamic concurrency and queue drain
  maxChunks: Infinity,
  maxCrawlDurationMs: 25000,
  concurrency: 40,

  // Subdomain discovery & verification limits (optimized for high-speed cloud serverless)
  dnsLookupConcurrency: 60,
  candidateTimeout: 800,
  subdomainValidationTimeout: 4000,
  subdomainCandidateLimit: 500,
  activeDnsPrefixes: 60,

  // Passive reconnaissance timeouts
  subdomainCenterTimeout: 2500,
  alienVaultTimeout: 2500,
  certSpotterPages: 6,
  certSpotterTimeout: 4000,
  crtShTimeout: 3000,
  hackerTargetTimeout: 2500,
  rapidDnsTimeout: 2500,

  // Stage budget calculators (ensures sub-10s total completion on Vercel / serverless)
  canRunPhase2: (elapsed) => elapsed < 16000,
  canRunGatewayProbes: (elapsed) => elapsed < 18000,
  maxLegalWaitMs: (elapsed) => Math.max(2500, Math.min(5000, 20000 - elapsed)),
  maxSubdomainBudgetMs: (elapsed) => Math.max(2000, Math.min(4000, 18000 - elapsed))
};

module.exports = webCrawlerProfile;
