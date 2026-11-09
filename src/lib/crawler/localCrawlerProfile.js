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
  dnsLookupConcurrency: 100,
  candidateTimeout: 1500,
  subdomainValidationTimeout: 40000,
  subdomainCandidateLimit: 2500,
  activeDnsPrefixes: 600,

  // Passive reconnaissance timeouts (concurrent parallel execution)
  subdomainCenterTimeout: 8000,
  alienVaultTimeout: 8000,
  certSpotterPages: 10,
  certSpotterTimeout: 6000,
  crtShTimeout: 5000,
  hackerTargetTimeout: 4000,
  rapidDnsTimeout: 8000,

  // Stage budget calculators
  canRunPhase2: (elapsed) => true,
  canRunGatewayProbes: (elapsed) => true,
  maxLegalWaitMs: (elapsed) => 15000,
  maxSubdomainBudgetMs: (elapsed) => Math.max(40000, 90000 - elapsed)
};

module.exports = localCrawlerProfile;
