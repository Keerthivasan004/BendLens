// @ts-nocheck
/* eslint-disable */
/**
 * Web & Cloud Production Crawler Profile (HTTPS & Vercel Serverless Environment)
 *
 * This profile governs execution on Vercel Serverless / AWS Lambda cloud functions.
 * It is completely isolated from the local developer profile.
 *
 * Optimized for Vercel Serverless environments:
 * - Adapts to Vercel maxDuration: 60 with a safe 38,000ms crawl ceiling.
 * - Concurrency of 40 for high-throughput HTTP chunk scraping in cloud datacenters.
 * - Concurrency of 100 for non-blocking UDP DNS lookups in datacenter networks.
 * - Multi-source passive reconnaissance including CertSpotter, Subdomain Center & AlienVault.
 * - Parity with localhost: Discovers 500+ subdomains and full microservice architecture.
 */

const webCrawlerProfile = {
  name: 'web_production_serverless',
  isServerless: true,

  // Chunk crawling budget - Unbounded by default; dynamic concurrency and queue drain
  maxChunks: Infinity,
  maxCrawlDurationMs: 40000,
  concurrency: 40,

  // Subdomain discovery & verification limits (aligned with local profile for zero divergence)
  dnsLookupConcurrency: 100,
  candidateTimeout: 1200,
  subdomainValidationTimeout: 14000,
  subdomainCandidateLimit: 1500,
  activeDnsPrefixes: 100,

  // Passive reconnaissance timeouts (concurrent parallel execution)
  subdomainCenterTimeout: 5000,
  alienVaultTimeout: 5000,
  certSpotterPages: 14,
  certSpotterTimeout: 9000,
  crtShTimeout: 6000,
  hackerTargetTimeout: 4000,
  rapidDnsTimeout: 4000,

  // Stage budget calculators (ensures parity while finishing safely within 38-42s, well before Vercel 60s ceiling)
  canRunPhase2: (elapsed) => elapsed < 35000,
  canRunGatewayProbes: (elapsed) => elapsed < 36000,
  maxLegalWaitMs: (elapsed) => Math.max(3000, Math.min(8000, 38000 - elapsed)),
  maxSubdomainBudgetMs: (elapsed) => Math.max(10000, Math.min(20000, 38000 - elapsed))
};

module.exports = webCrawlerProfile;
