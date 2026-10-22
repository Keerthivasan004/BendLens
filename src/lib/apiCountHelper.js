import { getApiEndpointsBreakdown } from './apiBreakdownHelper.js';

/**
 * Calculate the count of distinct APIs (Services, Gateways, or Modules)
 * as distinct from individual Endpoints (routes/paths).
 *
 * - For remote web/API crawls: Number of authentic API gateways / backend domains or plugin namespaces.
 * - For local codebases: Number of distinct API route modules or semantic API service resources.
 */
export function getApiServicesCount(data) {
  if (!data) return 0;

  // 1. If endpoints exhibit role-based portal domains (e.g. Admin, Student, Mentor, TPO, Employer, Public)
  const epList = Array.isArray(data.code?.endpoints) && data.code.endpoints.length > 0
    ? data.code.endpoints
    : (Array.isArray(data.endpoints) ? data.endpoints : []);

  if (epList.length > 0) {
    const hasAdmin = epList.some(e => e.path?.includes('/admin'));
    const hasStudent = epList.some(e => e.path?.includes('/student') || e.path?.includes('/learning') || e.path?.includes('/labs'));
    const hasMentor = epList.some(e => e.path?.includes('/mentor') || e.path?.includes('/lab-builder') || e.path?.includes('/batch'));
    const hasTpo = epList.some(e => e.path?.includes('/tpo') || e.path?.includes('/placement'));
    const hasEmployer = epList.some(e => e.path?.includes('/employer') || e.path?.includes('/jobs') || e.path?.includes('/applications'));
    const hasPublic = epList.some(e => e.path?.includes('/auth') || e.path?.includes('/tracks') || e.path?.includes('/events') || e.path?.includes('/platform'));
    const roleDomainsCount = [hasAdmin, hasStudent, hasMentor, hasTpo, hasEmployer, hasPublic].filter(Boolean).length;
    if (roleDomainsCount >= 3) {
      return roleDomainsCount;
    }
  }

  // 2. If remote URL crawl with discovered gateways:
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
        'reactjs.org', 'jquery', 'jedwatson', 'purecatamphetamine',
        'threejs.org', 'pmnd.rs', 'owasp.org', 'yourdomain', 'your-domain',
        'example.com', 'evilmartians.com', 'w3ctech.com', 'opensource.org',
        'stackoverflow.com', 'swiperjs.com', 'infinite-scroll.com', 'facebook.net',
        'ytimg.com', 'youtube.com', 'cybervault.sg', 'linkedin.com', 'twitter.com',
        'github.com', 'google.com'
      ];
      return !ignored.some(ig => host.includes(ig));
    } catch {
      return false;
    }
  });

  if (authenticGateways.length > 1) {
    return authenticGateways.length;
  }

  // 2. If WordPress namespaces:
  const epPaths = (data.code?.endpoints || data.endpoints || []).map(e => e.path);
  const wpNamespaces = new Set(
    epPaths
      .filter(p => p && p.startsWith('/wp-json/'))
      .map(p => p.replace('/wp-json/', '').split('/')[0])
      .filter(Boolean)
  );
  if (wpNamespaces.size > 1) {
    return wpNamespaces.size;
  }

  // 3. If local codebase AST with distinct route modules or controllers:
  const modules = new Set((data.code?.endpoints || data.endpoints || []).map(e => e.module).filter(Boolean));
  if (modules.size > 1) {
    return modules.size;
  }

  // 4. Semantic API services / resources breakdown:
  const breakdown = getApiEndpointsBreakdown(data, 'resource');
  if (breakdown.totalApisCount > 0) {
    return breakdown.totalApisCount;
  }

  return (data.code?.endpoints?.length || data.endpoints?.length || 0) > 0 ? 1 : 0;
}

export default getApiServicesCount;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getApiServicesCount
  };
}

