/**
 * Centralized API & Endpoints Breakdown Helper for BendLens
 * Computes:
 * 1. Which API has how many endpoints (distribution, method breakdown, risk).
 * 2. What are the endpoint names, methods, paths, and handlers for each API.
 * Supports grouping by:
 * - 'resource' (Default: semantic resource/path prefix, e.g. /api/auth, /api/users, /wp-json/wp/v2)
 * - 'controller' / 'module' (Source file or controller, e.g. auth_service.py, controllers/userController.js)
 * - 'kind' (Architectural kind, e.g. AUTH, STORAGE, REST, ADMIN, WEBHOOK, SYSTEM)
 * - 'gateway' (Discovered microservice domain or gateway origin)
 */

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatResourceName(resourceKey) {
  if (!resourceKey) return 'General API';

  // Specific canonical naming
  const lower = resourceKey.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (lower === 'auth' || lower === 'login' || lower === 'oauth') return 'Authentication & Identity API';
  if (lower === 'users' || lower === 'user' || lower === 'profile' || lower === 'profiles') return 'User & Account Management API';
  if (lower === 'orders' || lower === 'order') return 'Order Processing API';
  if (lower === 'products' || lower === 'product' || lower === 'items') return 'Product Catalog API';
  if (lower === 'checkout' || lower === 'cart') return 'Checkout & Cart API';
  if (lower === 'payments' || lower === 'payment' || lower === 'billing' || lower === 'invoices') return 'Payments & Billing API';
  if (lower === 'admin' || lower === 'governance') return 'Administrative Operations API';
  if (lower === 'health' || lower === 'ping' || lower === 'status' || lower === 'metrics') return 'Health & Diagnostics API';
  if (lower === 'notifications' || lower === 'notification' || lower === 'alerts') return 'Notifications & Messaging API';
  if (lower === 'analytics' || lower === 'telemetry') return 'Analytics & Reporting API';
  if (lower === 'ai' || lower === 'copilot' || lower === 'llm') return 'AI & Copilot Orchestration API';
  if (lower === 'quiz' || lower === 'assessment' || lower === 'assessments') return 'Quiz & Assessments API';
  if (lower === 'placement' || lower === 'placements' || lower === 'jobs' || lower === 'tpo') return 'Career & Placements API';
  if (lower === 'events' || lower === 'calendar') return 'Events & Scheduling API';
  if (lower === 'storage' || lower === 'files' || lower === 'media' || lower === 'upload') return 'Storage & Asset Delivery API';
  if (lower === 'webhooks' || lower === 'webhook' || lower === 'callbacks') return 'Event Webhooks API';
  if (lower === 'graphql') return 'GraphQL Gateway API';

  // WordPress namespaces
  if (lower.startsWith('wp/v2') || lower.startsWith('wp-json/wp/v2')) return 'WordPress Core API (wp/v2)';
  if (lower.includes('wc/v3') || lower.includes('woocommerce')) return 'WooCommerce REST API (wc/v3)';

  // General fallback: convert hyphen/underscore to title case
  const words = resourceKey
    .replace(/^api\//i, '')
    .replace(/^v[0-9]+\//i, '')
    .split(/[-_/]+/)
    .filter(Boolean)
    .map(w => capitalize(w));

  return words.length > 0 ? `${words.join(' ')} API` : 'Core Resource API';
}

function extractSemanticResourceKey(endpoint) {
  // 1. If explicit tag is provided (e.g. from OpenAPI / Swagger / crawler)
  if (Array.isArray(endpoint.tags) && endpoint.tags.length > 0) {
    const rawTag = endpoint.tags[0];
    if (rawTag && rawTag !== 'General' && rawTag !== 'default') {
      return rawTag.toLowerCase();
    }
  }

  const p = (endpoint.path || '').trim();
  if (!p) return 'general';

  // 2. WordPress REST API namespaces: /wp-json/wp/v2/posts -> wp/v2
  if (p.startsWith('/wp-json/')) {
    const wpParts = p.replace('/wp-json/', '').split('/').filter(Boolean);
    if (wpParts.length >= 2) {
      return `${wpParts[0]}/${wpParts[1]}`;
    }
    if (wpParts.length === 1) return wpParts[0];
  }

  // 3. Remove leading slash
  const clean = p.replace(/^\/+/, '');
  const segments = clean.split('/').filter(Boolean);

  if (segments.length === 0) return 'root';

  // 4. Handle /api/v1/resource or /api/resource or /v1/resource
  let resourceIdx = 0;
  if (segments[0].toLowerCase() === 'api') {
    resourceIdx = 1;
    if (segments[1] && /^v[0-9]+$/i.test(segments[1])) {
      resourceIdx = 2;
    }
  } else if (/^v[0-9]+$/i.test(segments[0])) {
    resourceIdx = 1;
  }

  const candidate = segments[resourceIdx] || segments[0];

  // Clean candidate from route parameter markers (e.g. {id}, :id)
  if (candidate.startsWith('{') || candidate.startsWith(':')) {
    return segments[0] || 'general';
  }

  return candidate.toLowerCase();
}

/**
 * Normalizes an endpoint item into a clean representation.
 */
function normalizeEndpointItem(ep, rawIndex) {
  const method = String(ep.method || 'GET').toUpperCase();
  const routePath = ep.path || '/';
  const name = `${method} ${routePath}`;
  const kind = ep.kind || 'REST';
  const level = ep.level || 'MEDIUM';
  const handler = ep.handler || ep.functionName || '';
  const summary = ep.summary || ep.description || (ep.module ? `Defined in ${ep.module}` : `Endpoint for ${routePath}`);
  const modulePath = ep.module || ep.relativePath || ep.sourceFile || ep.file || ep.filePath || '';
  const isLazyLoaded = Boolean(ep.isLazyLoaded || ep.crawlTier === 'DEEP_LAZY' || ep.crawlTier === 'deep');
  const crawlTier = ep.crawlTier || (isLazyLoaded ? 'deep' : 'normal');
  const routeType = ep.routeType || (ep.isUiRoute ? 'PAGE' : 'API');
  const connectedTables = Array.isArray(ep.connectedTables) ? ep.connectedTables : [];

  return {
    id: `ep_${rawIndex}_${method}_${routePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
    method,
    path: routePath,
    name,
    kind,
    level,
    handler,
    summary,
    module: modulePath,
    isLazyLoaded,
    crawlTier,
    routeType,
    isUiRoute: ep.isUiRoute === true || routeType === 'PAGE',
    connectedTables,
    parameters: Array.isArray(ep.parameters) ? ep.parameters : []
  };
}

/**
 * Extracts and computes the complete API & Endpoints breakdown.
 *
 * @param {object} analysisData - Project analysis data object (contains code.endpoints or endpoints)
 * @param {string} groupBy - 'auto' | 'resource' | 'controller' | 'kind' | 'gateway'
 * @returns {object} Full Breakdown:
 *   - apis: Array of API Group Objects (with name, totalEndpoints, endpoint names, methodCounts)
 *   - totalApisCount: number
 *   - totalEndpointsCount: number
 *   - averageEndpointsPerApi: number
 *   - methodTotals: { GET, POST, PUT, DELETE, PATCH, OTHER }
 *   - maxEndpointsApi: { name, count }
 *   - minEndpointsApi: { name, count }
 */
export function getApiEndpointsBreakdown(analysisData, groupBy = 'auto') {
  if (!analysisData) {
    return {
      apis: [],
      totalApisCount: 0,
      totalEndpointsCount: 0,
      averageEndpointsPerApi: 0,
      groupBy: 'resource',
      methodTotals: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OTHER: 0 },
      maxEndpointsApi: null,
      minEndpointsApi: null
    };
  }

  // Extract raw endpoints
  const rawEndpoints = Array.isArray(analysisData.endpoints) && analysisData.endpoints.length > 0
    ? analysisData.endpoints
    : (Array.isArray(analysisData.code?.endpoints) && analysisData.code.endpoints.length > 0
      ? analysisData.code.endpoints
      : []);

  if (rawEndpoints.length === 0) {
    return {
      apis: [],
      totalApisCount: 0,
      totalEndpointsCount: 0,
      averageEndpointsPerApi: 0,
      groupBy: 'resource',
      methodTotals: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OTHER: 0 },
      maxEndpointsApi: null,
      minEndpointsApi: null
    };
  }

  // Normalize endpoints
  const normalizedEndpoints = rawEndpoints.map((ep, idx) => normalizeEndpointItem(ep, idx));

  // Determine effective groupBy strategy
  let effectiveStrategy = groupBy;
  if (effectiveStrategy === 'auto') {
    // If codebase has distinct controllers / modules >= 2
    const distinctModules = new Set(normalizedEndpoints.map(e => e.module).filter(Boolean));
    if (distinctModules.size > 1 && !analysisData.isUrlCrawl && !analysisData.crawlerTelemetry) {
      effectiveStrategy = 'resource'; // 'resource' is universally clean, modules accessible as filter
    } else {
      effectiveStrategy = 'resource';
    }
  }

  const groupsMap = new Map(); // key -> { id, name, badge, type, description, endpoints: [] }

  normalizedEndpoints.forEach((ep) => {
    let groupKey = 'general';
    let groupName = 'General API';
    let groupBadge = '/';
    let groupType = 'Resource';
    let groupDescription = '';

    if (effectiveStrategy === 'controller' || effectiveStrategy === 'module') {
      const mod = ep.module || 'Root Application Module';
      groupKey = mod;
      groupName = mod.split(/[/\\]/).pop() || mod;
      groupBadge = mod;
      groupType = 'Controller / File';
      groupDescription = `Endpoints declared within source module: ${mod}`;
    } else if (effectiveStrategy === 'kind') {
      const k = ep.kind || 'REST';
      groupKey = k;
      groupName = `${k} Architecture`;
      groupBadge = k;
      groupType = 'Protocol / Kind';
      groupDescription = `All endpoints operating under the ${k} architectural pattern`;
    } else if (effectiveStrategy === 'gateway') {
      // Discovered gateways / remote origins
      const originMatch = (ep.path || '').match(/^https?:\/\/([^/]+)/);
      const gw = originMatch ? originMatch[1] : (analysisData.projectName || 'Primary Origin Gateway');
      groupKey = gw;
      groupName = gw;
      groupBadge = gw;
      groupType = 'Gateway Host';
      groupDescription = `Microservice or gateway perimeter host: ${gw}`;
    } else if (effectiveStrategy === 'domain') {
      const lower = (ep.path || '').toLowerCase();
      if (lower.includes('/admin')) {
        groupKey = 'admin';
        groupName = 'Admin Governance API';
        groupBadge = '/api/admin';
        groupType = 'Role Domain';
        groupDescription = 'System administration, user management, audit trails, and DPDP compliance';
      } else if (lower.includes('/student') || lower.includes('/learning') || lower.includes('/labs') || lower.includes('/assessments') || lower.includes('/quiz') || lower.includes('/certificate')) {
        groupKey = 'student';
        groupName = 'Student & Cadet Learning API';
        groupBadge = '/api/student';
        groupType = 'Role Domain';
        groupDescription = 'Curriculum tracks, interactive CTF labs, assessments, and certifications';
      } else if (lower.includes('/mentor') || lower.includes('/lab-builder') || lower.includes('/batch')) {
        groupKey = 'mentor';
        groupName = 'Mentor & Faculty Portal API';
        groupBadge = '/api/mentor';
        groupType = 'Role Domain';
        groupDescription = 'Batch creation, task scheduling, student grading, and challenge authoring';
      } else if (lower.includes('/tpo') || lower.includes('/placement')) {
        groupKey = 'tpo';
        groupName = 'TPO Campus Placement API';
        groupBadge = '/api/tpo';
        groupType = 'Role Domain';
        groupDescription = 'College placement drives, student directory import, and interview rounds';
      } else if (lower.includes('/employer') || lower.includes('/jobs') || lower.includes('/applications') || lower.includes('/candidates')) {
        groupKey = 'employer';
        groupName = 'Employer & ATS Portal API';
        groupBadge = '/api/employer';
        groupType = 'Role Domain';
        groupDescription = 'Job postings, applicant pipeline, resumes, and candidate evaluations';
      } else {
        groupKey = 'core';
        groupName = 'Public & Core Platform API';
        groupBadge = '/api/core';
        groupType = 'Role Domain';
        groupDescription = 'Authentication, OTP dispatch, public landing, AI copilot, and payments';
      }
    } else {
      // Default: 'resource' (Semantic Resource Group)
      const resKey = extractSemanticResourceKey(ep);
      groupKey = resKey;
      groupName = formatResourceName(resKey);
      groupBadge = ep.path && ep.path.startsWith('/wp-json/')
        ? `/wp-json/${resKey}`
        : `/api/${resKey}`;
      groupType = 'Service / Resource';
      groupDescription = `Endpoints servicing the '${resKey}' domain capability`;
    }

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        id: `api_${groupKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
        rawKey: groupKey,
        name: groupName,
        badge: groupBadge,
        type: groupType,
        description: groupDescription,
        endpoints: []
      });
    }

    groupsMap.get(groupKey).endpoints.push(ep);
  });

  // Calculate statistics for each API group
  const methodTotals = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OTHER: 0 };

  const apis = Array.from(groupsMap.values()).map((grp) => {
    const epCount = grp.endpoints.length;
    const methodCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OTHER: 0 };
    const tablesSet = new Set();
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let lazyCount = 0;

    grp.endpoints.forEach((e) => {
      const m = e.method;
      if (methodCounts[m] !== undefined) {
        methodCounts[m]++;
      } else {
        methodCounts.OTHER++;
      }

      if (methodTotals[m] !== undefined) {
        methodTotals[m]++;
      } else {
        methodTotals.OTHER++;
      }

      if (e.level === 'HIGH') highCount++;
      else if (e.level === 'LOW') lowCount++;
      else mediumCount++;

      if (e.isLazyLoaded) lazyCount++;

      (e.connectedTables || []).forEach(tbl => {
        if (typeof tbl === 'string') tablesSet.add(tbl);
        else if (tbl && tbl.name) tablesSet.add(tbl.name);
      });
    });

    // Primary dominant method
    const primaryMethod = Object.entries(methodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'GET';

    // Risk Level for the API
    const riskLevel = highCount > 0 ? 'HIGH' : (mediumCount > 0 ? 'MEDIUM' : 'LOW');

    return {
      ...grp,
      totalEndpoints: epCount,
      endpointsCount: epCount,
      methodCounts,
      primaryMethod,
      riskLevel,
      highEndpointsCount: highCount,
      mediumEndpointsCount: mediumCount,
      lowEndpointsCount: lowCount,
      lazyEndpointsCount: lazyCount,
      connectedTables: Array.from(tablesSet)
    };
  });

  // Sort APIs by total endpoints descending (largest APIs first)
  apis.sort((a, b) => b.totalEndpoints - a.totalEndpoints);

  const totalApisCount = apis.length;
  const totalEndpointsCount = normalizedEndpoints.length;
  const averageEndpointsPerApi = totalApisCount > 0 
    ? Number((totalEndpointsCount / totalApisCount).toFixed(1)) 
    : 0;

  const maxEndpointsApi = apis[0] ? { name: apis[0].name, count: apis[0].totalEndpoints } : null;
  const minEndpointsApi = apis[apis.length - 1] ? { name: apis[apis.length - 1].name, count: apis[apis.length - 1].totalEndpoints } : null;

  return {
    apis,
    totalApisCount,
    totalEndpointsCount,
    averageEndpointsPerApi,
    groupBy: effectiveStrategy,
    methodTotals,
    maxEndpointsApi,
    minEndpointsApi
  };
}

// CommonJS compatibility for Node.js backend routes and scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getApiEndpointsBreakdown,
    formatResourceName
  };
}
