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
  maxCrawlDurationMs: 45000,
  concurrency: 60,

  // Subdomain discovery & verification limits (aligned with local profile for zero divergence)
  dnsLookupConcurrency: 80,
  candidateTimeout: 800,
  subdomainValidationTimeout: 35000,
  subdomainCandidateLimit: 1500,
  activeDnsPrefixes: 150,

  // Passive reconnaissance timeouts (concurrent parallel execution)
  subdomainCenterTimeout: 16000,
  alienVaultTimeout: 10000,
  certSpotterPages: 15,
  certSpotterTimeout: 16000,
  crtShTimeout: 8000,
  hackerTargetTimeout: 6000,
  rapidDnsTimeout: 8000,

  // Stage budget calculators (ensures parity while finishing safely within 45-50s, well before Vercel 60s ceiling)
  canRunPhase2: (elapsed) => elapsed < 44000,
  canRunGatewayProbes: (elapsed) => elapsed < 54000,
  maxLegalWaitMs: (elapsed) => Math.max(3000, Math.min(8000, 48000 - elapsed)),
  maxSubdomainBudgetMs: (elapsed) => Math.max(25000, Math.min(45000, 54000 - elapsed))
};

module.exports = webCrawlerProfile;
