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

  // Chunk crawling budget - calibrated enterprise traversal with fast-fail
  maxChunks: 1200,
  maxCrawlDurationMs: 110000,
  concurrency: 60,

  // Subdomain discovery & verification limits (supports 1,000 - 30,000+ subdomains with zero truncation)
  dnsLookupConcurrency: 350,
  candidateTimeout: 200,
  subdomainValidationTimeout: 30000,
  subdomainCandidateLimit: 30000,
  activeDnsPrefixes: 850,

  // Passive reconnaissance timeouts (concurrent parallel execution)
  subdomainCenterTimeout: 12000,
  alienVaultTimeout: 8000,
  certSpotterPages: 22,
  certSpotterTimeout: 7000,
  crtShTimeout: 20000,
  hackerTargetTimeout: 3500,
  rapidDnsTimeout: 8000,

  // Stage budget calculators
  canRunPhase2: (elapsed) => elapsed < 70000,
  canRunGatewayProbes: (elapsed) => elapsed < 82000,
  maxLegalWaitMs: (elapsed) => Math.max(8000, Math.min(15000, 105000 - elapsed)),
  maxSubdomainBudgetMs: (elapsed) => Math.max(15000, Math.min(45000, 95000 - elapsed))
};

module.exports = localCrawlerProfile;
