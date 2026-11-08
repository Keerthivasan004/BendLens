/**
 * Authoritative Centralized Subdomains & Digital Perimeter Helper for BendLens
 * 
 * Computes:
 * 1. Authoritative list of all discovered subdomains (both Live active and Historical OSINT).
 * 2. Real-time DNS status mapping ('live' vs 'historical').
 * 3. Endpoint distribution per subdomain.
 * 4. Apex domain identification.
 */

export function getSubdomainsInventory(data) {
  if (!data) {
    return {
      apexDomain: '',
      allSubdomains: [],
      liveSubdomains: [],
      historicalSubdomains: [],
      statusMap: {},
      counts: { total: 0, live: 0, historical: 0 },
      endpointCounts: {},
      endpointsMap: {},
      hasSubdomains: false
    };
  }

  const set = new Set();
  const add = (s) => {
    if (!s || typeof s !== 'string') return;
    let clean = s.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
    if (clean.startsWith('www.')) clean = clean.slice(4);
    if (clean && clean.includes('.')) set.add(clean);
  };

  const listFromPayload = data.subdomains || data.crawlerTelemetry?.subdomains || data.techStack?.backend?.subdomains || [];
  if (Array.isArray(listFromPayload)) listFromPayload.forEach(add);
  if (Array.isArray(data.liveSubdomains)) data.liveSubdomains.forEach(add);
  if (Array.isArray(data.historicalSubdomains)) data.historicalSubdomains.forEach(add);
  if (Array.isArray(data.crawlerTelemetry?.liveSubdomains)) data.crawlerTelemetry.liveSubdomains.forEach(add);
  if (Array.isArray(data.crawlerTelemetry?.historicalSubdomains)) data.crawlerTelemetry.historicalSubdomains.forEach(add);
  if (Array.isArray(data.crawlerTelemetry?.backendDomains)) data.crawlerTelemetry.backendDomains.forEach(add);
  if (Array.isArray(data.techStack?.backend?.discoveredGateways)) data.techStack.backend.discoveredGateways.forEach(add);
  if (Array.isArray(data.openApiSpec?.['x-subdomains'])) data.openApiSpec['x-subdomains'].forEach(add);
  if (Array.isArray(data.infra?.subdomains)) data.infra.subdomains.forEach(add);

  const endpointCounts = {};
  const endpointsMap = {};
  const countEndpoint = (sub, ep) => {
    if (!sub) return;
    const clean = sub.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./, '');
    if (clean) {
      endpointCounts[clean] = (endpointCounts[clean] || 0) + 1;
      if (!endpointsMap[clean]) endpointsMap[clean] = [];
      if (ep) endpointsMap[clean].push(ep);
    }
  };

  const eps = data.code?.endpoints || data.endpoints || data.enrichedEndpoints || [];
  if (Array.isArray(eps)) {
    eps.forEach(ep => {
      if (ep.subdomain) {
        add(ep.subdomain);
        countEndpoint(ep.subdomain, ep);
      }
    });
  }

  if (data.openApiSpec?.paths) {
    Object.entries(data.openApiSpec.paths).forEach(([routePath, methodsObj]) => {
      if (methodsObj && typeof methodsObj === 'object') {
        Object.entries(methodsObj).forEach(([method, op]) => {
          if (op?.['x-subdomain']) {
            add(op['x-subdomain']);
            countEndpoint(op['x-subdomain'], {
              path: routePath,
              method: method.toUpperCase(),
              summary: op.summary || '',
              description: op.description || ''
            });
          }
        });
      }
    });
  }

  const primaryCandidate = (() => {
    const candidates = [data.projectPath, data.projectName, data.targetUrl, data.crawlerTelemetry?.targetUrl];
    for (const c of candidates) {
      if (c && typeof c === 'string') {
        try {
          const h = new URL(c.startsWith('http') ? c : `https://${c}`).hostname.toLowerCase().replace(/^www\./, '');
          if (h && h.includes('.')) return h;
        } catch {}
      }
    }
    return null;
  })();

  if (primaryCandidate) {
    add(primaryCandidate);
  }

  const list = Array.from(set);
  const sorted = primaryCandidate && list.includes(primaryCandidate)
    ? [primaryCandidate, ...list.filter(s => s !== primaryCandidate).sort()]
    : list.sort();

  const statusMap = {
    ...(data.subdomainStatusMap || {}),
    ...(data.crawlerTelemetry?.subdomainStatusMap || {})
  };

  const liveSet = new Set([
    ...(data.liveSubdomains || []),
    ...(data.crawlerTelemetry?.liveSubdomains || [])
  ]);

  const apex = primaryCandidate || sorted[0] || '';
  if (apex && statusMap[apex] !== 'historical') {
    statusMap[apex] = 'live';
    liveSet.add(apex);
  }

  const liveList = [];
  const histList = [];

  sorted.forEach(s => {
    const isLive = liveSet.has(s) || statusMap[s] === 'live' || s === apex;
    if (isLive) {
      liveList.push(s);
      statusMap[s] = 'live';
    } else {
      histList.push(s);
      statusMap[s] = 'historical';
    }
  });

  return {
    apexDomain: apex,
    allSubdomains: sorted,
    liveSubdomains: liveList,
    historicalSubdomains: histList,
    statusMap,
    counts: {
      total: sorted.length,
      live: liveList.length,
      historical: histList.length
    },
    endpointCounts,
    endpointsMap,
    hasSubdomains: sorted.length > 0
  };
}

export default getSubdomainsInventory;
