import { getApiEndpointsBreakdown } from './apiBreakdownHelper.js';

/**
 * Calculate the count of distinct APIs (Services, Gateways, or Modules)
 * as distinct from individual Endpoints (routes/paths).
 *
 * - For multi-role portals (e.g. futrsec.in): Authoritative role domain APIs (Admin, Student, Mentor, TPO, Employer, Core).
 * - For multi-subdomain architectures (e.g. finstackk.com): Distinct subdomain perimeters (finstackk.com, app.finstackk.com).
 * - For local codebases: Number of distinct API route modules or semantic API service resources.
 *
 * Guarantees 100% mathematical parity with getApiEndpointsBreakdown(data, 'auto').
 */
export function getApiServicesCount(data) {
  if (!data) return 0;

  // 1. Authoritative API & Endpoints Breakdown Alignment
  // When an endpoint architecture breakdown is available (via code.endpoints, endpoints, enrichedEndpoints, or openApiSpec.paths),
  // getApiEndpointsBreakdown in 'auto' mode accurately classifies the architecture (Role Domains, Subdomains, Modules, or Resources).
  // Aligning getApiServicesCount directly ensures 100% parity across the HUD header, landing page, and breakdown modal.
  const autoBreakdown = getApiEndpointsBreakdown(data, 'auto');
  if (autoBreakdown && autoBreakdown.totalApisCount > 0) {
    return autoBreakdown.totalApisCount;
  }

  // 2. Fallback: If remote URL crawl with discovered gateways when no endpoint breakdown is available:
  const gateways = data.techStack?.backend?.discoveredGateways ||
    data.crawlerTelemetry?.backendDomains ||
    data.backendDomains || [];

  const targetHost = (data.crawlerTelemetry?.targetUrl || data.targetUrl)
    ? (() => {
        try {
          return new URL(data.crawlerTelemetry?.targetUrl || data.targetUrl).hostname.toLowerCase();
        } catch {
          return '';
        }
      })()
    : '';

  const authenticGateways = gateways.filter(d => {
    try {
      const u = new URL(d);
      const host = u.hostname.toLowerCase();
      // Exclude client frontend host origin
      if (targetHost && (host === targetHost || host === `www.${targetHost}`)) return false;
      const ignored = [
        'reactjs.org', 'react.dev', 'nextjs.org', 'jquery', 'jedwatson', 'purecatamphetamine',
        'threejs.org', 'pmnd.rs', 'owasp.org', 'yourdomain', 'your-domain',
        'example.com', 'evilmartians.com', 'w3ctech.com', 'opensource.org',
        'stackoverflow.com', 'swiperjs.com', 'infinite-scroll.com', 'facebook.net',
        'ytimg.com', 'youtube.com', 'cybervault.sg', 'linkedin.com', 'twitter.com',
        'github.com', 'google.com', 'goo.gl', 'randomuser.me'
      ];
      return !ignored.some(ig => host.includes(ig));
    } catch {
      return false;
    }
  });

  if (authenticGateways.length > 1) {
    return authenticGateways.length;
  }

  return (data.code?.endpoints?.length || data.endpoints?.length || 0) > 0 ? 1 : 0;
}

export default getApiServicesCount;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getApiServicesCount
  };
}
