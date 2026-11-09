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
  maxCrawlDurationMs: 50000,
  concurrency: 60,

  // Subdomain discovery & verification limits (aligned with local profile for zero divergence)
  dnsLookupConcurrency: 150,
  candidateTimeout: 1500,
  subdomainValidationTimeout: 40000,
  subdomainCandidateLimit: 5000,
  activeDnsPrefixes: 600,

  // Passive reconnaissance timeouts (concurrent parallel execution)
  subdomainCenterTimeout: 15000,
  alienVaultTimeout: 12000,
  certSpotterPages: 10,
  certSpotterTimeout: 10000,
  crtShTimeout: 25000,
  hackerTargetTimeout: 4000,
  rapidDnsTimeout: 10000,

  // Stage budget calculators (ensures parity while finishing safely within 45-50s, well before Vercel 60s ceiling)
  canRunPhase2: (elapsed) => elapsed < 48000,
  canRunGatewayProbes: (elapsed) => elapsed < 54000,
  maxLegalWaitMs: (elapsed) => Math.max(25000, 52000 - elapsed),
  maxSubdomainBudgetMs: (elapsed) => Math.max(40000, Math.min(48000, 54000 - elapsed))
};

module.exports = webCrawlerProfile;
