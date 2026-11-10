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
  maxCrawlDurationMs: 180000,
  concurrency: 32,

  // Subdomain discovery & verification limits (supports 1,000 - 10,000+ subdomains with zero truncation)
  dnsLookupConcurrency: 200,
  candidateTimeout: 1500,
  subdomainValidationTimeout: 30000,
  subdomainCandidateLimit: 25000,
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
  maxSubdomainBudgetMs: (elapsed) => Math.max(15000, Math.min(25000, 60000 - elapsed))
};

module.exports = localCrawlerProfile;
