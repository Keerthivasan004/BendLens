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

  // Chunk crawling budget
  maxChunks: 1200,
  maxCrawlDurationMs: 90000,
  concurrency: 30,

  // Subdomain discovery & verification limits
  dnsLookupConcurrency: 50,
  candidateTimeout: 3000,
  subdomainValidationTimeout: 45000,
  subdomainCandidateLimit: 1500,
  activeDnsPrefixes: 150,

  // Passive reconnaissance timeouts
  subdomainCenterTimeout: 10000,
  alienVaultTimeout: 10000,
  certSpotterPages: 15,
  certSpotterTimeout: 20000,
  crtShTimeout: 12000,
  hackerTargetTimeout: 6000,
  rapidDnsTimeout: 8000,

  // Stage budget calculators
  canRunPhase2: (elapsed) => true,
  canRunGatewayProbes: (elapsed) => true,
  maxLegalWaitMs: (elapsed) => 15000,
  maxSubdomainBudgetMs: (elapsed) => Math.max(45000, 90000 - elapsed)
};

module.exports = localCrawlerProfile;
