/**
 * Calculate the count of distinct APIs (Services, Gateways, or Modules)
 * as distinct from individual Endpoints (routes/paths).
 *
 * - For remote web/API crawls: Number of authentic API gateways / backend domains or plugin namespaces.
 * - For local codebases: Number of distinct API route modules or controllers.
 */
export function getApiServicesCount(data) {
  if (!data) return 0;

  // 1. If remote URL crawl with discovered gateways:
  const gateways = data.techStack?.backend?.discoveredGateways ||
    data.crawlerTelemetry?.backendDomains ||
    data.backendDomains || [];

  const authenticGateways = gateways.filter(d => {
    try {
      const u = new URL(d);
      const host = u.hostname.toLowerCase();
      const ignored = [
        'reactjs.org', 'jquery', 'jedwatson', 'purecatamphetamine',
        'threejs.org', 'pmnd.rs', 'owasp.org', 'yourdomain', 'your-domain',
        'example.com', 'evilmartians.com', 'w3ctech.com', 'opensource.org',
        'stackoverflow.com', 'swiperjs.com', 'infinite-scroll.com', 'facebook.net',
        'ytimg.com', 'youtube.com'
      ];
      return !ignored.some(ig => host.includes(ig));
    } catch {
      return false;
    }
  });

  if (authenticGateways.length > 0) {
    return authenticGateways.length;
  }

  // 2. If WordPress namespaces:
  const epPaths = (data.code?.endpoints || []).map(e => e.path);
  const wpNamespaces = new Set(
    epPaths
      .filter(p => p && p.startsWith('/wp-json/'))
      .map(p => p.replace('/wp-json/', '').split('/')[0])
      .filter(Boolean)
  );
  if (wpNamespaces.size > 0) {
    return wpNamespaces.size;
  }

  // 3. If local codebase AST with route modules or controllers:
  const modules = new Set((data.code?.endpoints || []).map(e => e.module).filter(Boolean));
  if (modules.size > 0) {
    return modules.size;
  }

  return (data.code?.endpoints?.length || 0) > 0 ? 1 : 0;
}
