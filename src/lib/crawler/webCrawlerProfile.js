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

  // Chunk crawling budget - fast, targeted traversal in cloud functions
  maxChunks: 300,
  maxCrawlDurationMs: 12000,
  concurrency: 50,

  // Subdomain discovery & verification limits (supports 1,000 - 10,000+ candidates without truncation)
  dnsLookupConcurrency: 200,
  candidateTimeout: 300,
  subdomainValidationTimeout: 3000,
  subdomainCandidateLimit: 25000,
  activeDnsPrefixes: 80,

  // Passive reconnaissance timeouts (concurrent parallel execution)
  subdomainCenterTimeout: 5000,
  alienVaultTimeout: 4000,
  certSpotterPages: 5,
  certSpotterTimeout: 4000,
  crtShTimeout: 4000,
  hackerTargetTimeout: 2500,
  rapidDnsTimeout: 4000,

  // Stage budget calculators (ensures parity while finishing safely under 12s, well within Vercel ceilings)
  canRunPhase2: (elapsed) => elapsed < 8000,
  canRunGatewayProbes: (elapsed) => elapsed < 9500,
  maxLegalWaitMs: (elapsed) => Math.max(1500, 11000 - elapsed),
  maxSubdomainBudgetMs: (elapsed) => Math.max(2500, Math.min(5000, 10500 - elapsed))
};

module.exports = webCrawlerProfile;
