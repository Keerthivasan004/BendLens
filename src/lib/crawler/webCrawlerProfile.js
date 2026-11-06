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
  maxChunks: 250,
  maxCrawlDurationMs: 42000,
  concurrency: 18,

  // Subdomain discovery & verification limits
  dnsLookupConcurrency: 40,
  candidateTimeout: 1500,
  subdomainValidationTimeout: 12000,
  subdomainCandidateLimit: 800,
  activeDnsPrefixes: 80,

  // Passive reconnaissance timeouts
  subdomainCenterTimeout: 6000,
  alienVaultTimeout: 6000,
  certSpotterPages: 8,
  certSpotterTimeout: 6000,
  crtShTimeout: 7000,
  hackerTargetTimeout: 3500,
  rapidDnsTimeout: 5000,

  // Stage budget calculators
  canRunPhase2: (elapsed) => elapsed < 35000,
  canRunGatewayProbes: (elapsed) => elapsed < 35000,
  maxLegalWaitMs: (elapsed) => Math.max(3000, Math.min(8000, 42000 - elapsed)),
  maxSubdomainBudgetMs: (elapsed) => Math.max(4000, Math.min(20000, 40000 - elapsed))
};

module.exports = webCrawlerProfile;
