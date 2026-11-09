// @ts-nocheck
/* eslint-disable */
/**
 * Localhost & Development Crawler Profile (HTTP & Local Node.js Environment)
 *
 * This profile is 100% physically isolated from the web/serverless production environment.
 * Any modifications to cloud/serverless timeouts or proxy relays will NOT affect this profile.
 *
 * Optimized for local developer workstations (Windows/macOS/Linux):
 * - DNS lookup concurrency: 50 powered by non-blocking UDP c-ares resolution.
 * - Subdomain candidate limit: 1500 (ensuring 200+ subdomains are fully harvested).
 * - Extended 90-second local analysis budget and up to 1200 chunks.
 */

const localCrawlerProfile = {
  name: 'local_development',
  isServerless: false,

  // Chunk crawling budget - Unbounded by default; dynamic concurrency and queue drain
  maxChunks: Infinity,
  maxCrawlDurationMs: 90000,
  concurrency: 60,

  // Subdomain discovery & verification limits
  dnsLookupConcurrency: 150,
  candidateTimeout: 1500,
  subdomainValidationTimeout: 45000,
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

  // Stage budget calculators
  canRunPhase2: (elapsed) => true,
  canRunGatewayProbes: (elapsed) => true,
  maxLegalWaitMs: (elapsed) => 30000,
  maxSubdomainBudgetMs: (elapsed) => Math.max(50000, 90000 - elapsed)
};

module.exports = localCrawlerProfile;
