// @ts-nocheck
/* eslint-disable */
/**
 * BendLens Crawler Environment & Protocol Orchestration Index
 *
 * Provides physical separation between:
 * 1. Localhost Development (localCrawlerProfile)
 * 2. Web / Cloud Deployments (webCrawlerProfile)
 * 3. HTTP vs HTTPS Target Protocols (ProtocolHandler)
 */

const localCrawlerProfile = require('./localCrawlerProfile.js');
const webCrawlerProfile = require('./webCrawlerProfile.js');
const ProtocolHandler = require('./protocolHandler.js');

/**
 * Determine the active crawler execution profile.
 * Can be explicitly overridden with options.executionEnvironment ('local' | 'web').
 */
function getCrawlerProfile(options = {}) {
  if (options && options.executionEnvironment === 'local') {
    return localCrawlerProfile;
  }
  if (options && options.executionEnvironment === 'web') {
    return webCrawlerProfile;
  }
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return isServerless ? webCrawlerProfile : localCrawlerProfile;
}

module.exports = {
  localCrawlerProfile,
  webCrawlerProfile,
  ProtocolHandler,
  getCrawlerProfile
};
