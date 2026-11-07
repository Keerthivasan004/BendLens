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
  maxCrawlDurationMs: 46000,
  concurrency: 32,

  // Subdomain discovery & verification limits (aligned with local profile for zero divergence)
  dnsLookupConcurrency: 60,
  candidateTimeout: 1200,
  subdomainValidationTimeout: 16000,
  subdomainCandidateLimit: 1500,
  activeDnsPrefixes: 150,

  // Passive reconnaissance timeouts
  subdomainCenterTimeout: 6000,
  alienVaultTimeout: 6000,
  certSpotterPages: 12,
  certSpotterTimeout: 10000,
  crtShTimeout: 8000,
  hackerTargetTimeout: 5000,
  rapidDnsTimeout: 6000,

  // Stage budget calculators
  canRunPhase2: (elapsed) => elapsed < 43000,
  canRunGatewayProbes: (elapsed) => elapsed < 42000,
  maxLegalWaitMs: (elapsed) => Math.max(3000, Math.min(8000, 46000 - elapsed)),
  maxSubdomainBudgetMs: (elapsed) => Math.max(10000, Math.min(18000, 42000 - elapsed))
};

module.exports = webCrawlerProfile;
