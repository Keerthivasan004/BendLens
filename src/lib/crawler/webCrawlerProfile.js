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

  // Chunk crawling budget
  maxChunks: 350,
  maxCrawlDurationMs: 52000,
  concurrency: 24,

  // Subdomain discovery & verification limits (aligned with local profile for zero divergence)
  dnsLookupConcurrency: 50,
  candidateTimeout: 2500,
  subdomainValidationTimeout: 35000,
  subdomainCandidateLimit: 1500,
  activeDnsPrefixes: 150,

  // Passive reconnaissance timeouts
  subdomainCenterTimeout: 8000,
  alienVaultTimeout: 8000,
  certSpotterPages: 15,
  certSpotterTimeout: 15000,
  crtShTimeout: 10000,
  hackerTargetTimeout: 5000,
  rapidDnsTimeout: 7000,

  // Stage budget calculators
  canRunPhase2: (elapsed) => elapsed < 42000,
  canRunGatewayProbes: (elapsed) => elapsed < 45000,
  maxLegalWaitMs: (elapsed) => Math.max(3000, Math.min(10000, 52000 - elapsed)),
  maxSubdomainBudgetMs: (elapsed) => Math.max(15000, Math.min(42000, 52000 - elapsed))
};

module.exports = webCrawlerProfile;
