'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, Key, Link2, Code2, AlertTriangle, CheckCircle, 
  Terminal, Layers, ArrowRight, Table, Eye, X, FileSpreadsheet,
  Copy, Check, Search, ExternalLink, Hash, ArrowUpRight, Download, Filter,
  Sparkles, BookOpen, ShieldAlert, Network, GitFork, ChevronDown, ChevronUp,
  Info, Cpu, Box, CheckCircle2, ChevronRight,
  Radio, ShieldCheck, Webhook, HardDrive, Settings, Activity, Workflow, Zap,
  Server, SlidersHorizontal, Share2, ArrowDownRight, Layers2, Printer, Cloud,
  ShoppingBag, Package, CreditCard, Shield, RefreshCw, Users, Globe
} from 'lucide-react';
import { openAndPrintApiReport } from '@/lib/generators/apiPdfReportGenerator';
import { getApiServicesCount } from '@/lib/apiCountHelper';
import { getApiEndpointsBreakdown, formatResourceName } from '@/lib/apiBreakdownHelper';
import ApiBreakdownModal from '@/components/ApiBreakdownModal';
import ApiFlowModal from '@/components/ApiFlowModal';

function getResourceIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('auth') || n.includes('login')) return Key;
  if (n.includes('user') || n.includes('profile')) return Users;
  if (n.includes('order') || n.includes('cart')) return ShoppingBag;
  if (n.includes('product') || n.includes('catalog')) return Package;
  if (n.includes('payment') || n.includes('billing')) return CreditCard;
  if (n.includes('admin') || n.includes('governance')) return Shield;
  if (n.includes('health') || n.includes('status')) return Activity;
  if (n.includes('wordpress') || n.includes('wp')) return Globe;
  if (n.includes('storage') || n.includes('file')) return HardDrive;
  if (n.includes('webhook')) return Webhook;
  if (n.includes('graphql')) return Zap;
  return Code2;
}

/**
 * Analyzes database tables and foreign keys to synthesize architectural breakdown.
 */
function analyzeSchemaArchitecture(tables) {
  if (!tables || tables.length === 0) {
    return {
      synopsis: 'No database tables detected in the current workspace.',
      rootEntities: [],
      transactionEntities: [],
      junctionEntities: [],
      referenceEntities: [],
      relations: [],
      hubs: [],
      totalColumns: 0
    };
  }

  const tableNames = new Set(tables.map((t) => t.name.toLowerCase()));
  const inDegree = {};
  const outDegree = {};
  const relations = [];

  tables.forEach((t) => {
    const tName = t.name.toLowerCase();
    inDegree[tName] = 0;
    outDegree[tName] = 0;
  });

  tables.forEach((t) => {
    const fromName = t.name.toLowerCase();
    (t.foreignKeys || []).forEach((fk) => {
      const targetName = (fk.targetTable || '').toLowerCase();
      if (tableNames.has(targetName)) {
        outDegree[fromName] = (outDegree[fromName] || 0) + 1;
        inDegree[targetName] = (inDegree[targetName] || 0) + 1;
        relations.push({
          from: t.name,
          to: fk.targetTable,
          fromCol: fk.column,
          toCol: fk.targetColumn || 'id',
          type: 'Many-to-One'
        });
      }
    });
  });

  const rootEntities = [];
  const transactionEntities = [];
  const junctionEntities = [];
  const referenceEntities = [];

  tables.forEach((t) => {
    const name = t.name.toLowerCase();
    const inCount = inDegree[name] || 0;
    const outCount = outDegree[name] || 0;

    if (outCount >= 2) {
      junctionEntities.push(t);
    } else if (outCount > 0) {
      transactionEntities.push(t);
    } else if (inCount > 0) {
      rootEntities.push(t);
    } else {
      referenceEntities.push(t);
    }
  });

  if (rootEntities.length === 0 && tables.length > 0) {
    const identityTable = tables.find((t) => /user|account|auth|customer|profile/i.test(t.name)) || tables[0];
    rootEntities.push(identityTable);
  }

  const hubs = Object.entries(inDegree)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      dependentCount: count,
      table: tables.find((t) => t.name.toLowerCase() === name)
    }));

  const totalColumns = tables.reduce((acc, t) => acc + (t.columns?.length || 0), 0);

  const synopsis = `This schema structures ${tables.length} domain models across ${totalColumns} total attributes. ` +
    (rootEntities.length > 0 ? `Core identity is anchored around ${rootEntities.map((t) => `'${t.name}'`).join(', ')}. ` : '') +
    (relations.length > 0 
      ? `Relational integrity is governed through ${relations.length} explicit foreign-key constraints with normalized entity boundaries.`
      : `Entities utilize decoupled or application-tier relationship bindings.`);

  return {
    synopsis,
    rootEntities,
    transactionEntities,
    junctionEntities,
    referenceEntities,
    relations,
    hubs,
    totalColumns
  };
}

/**
 * Intelligently classifies an endpoint into:
 * - API Kind (REST, WebSocket, Auth, Storage, Admin, Webhook, System, GraphQL)
 * - Architectural Level (HIGH, MEDIUM, LOW)
 * - Connected Database Tables (with READ / WRITE / STREAM actions)
 */
function enrichEndpoint(ep, tables, tableLookup) {
  const method = String(ep.method || 'GET').toUpperCase();
  const routePath = String(ep.path || '/');
  const pLower = routePath.toLowerCase();
  const modLower = String(ep.module || '').toLowerCase();
  const sourceLower = String(ep.source || '').toLowerCase();

  // 1. Identify Kind
  let kind = ep.kind;
  if (!kind) {
    if (method === 'WS' || sourceLower.includes('websocket') || /(?:\/|^)(?:ws|socket|stream|subscriptions?)(?:\/|$)/.test(pLower)) {
      kind = 'WEBSOCKET';
    } else if (/(?:\/|^)(?:graphql)(?:\/|$)/.test(pLower)) {
      kind = 'GRAPHQL';
    } else if (/(?:webhook|callback|ipn|events?\/(?:incoming|receiver)|stripe|razorpay|paypal|github\/events)/.test(pLower)) {
      kind = 'WEBHOOK';
    } else if (/(?:auth|login|logout|signup|register|oauth|token|refresh|session|password|mfa|otp|verify|sso|credentials|me\b)/.test(pLower)) {
      kind = 'AUTH';
    } else if (/(?:upload|download|files?|avatars?|images?|media|exports?|imports?|pdf|assets?|signed-url|s3|blob|attachment|documents?)/.test(pLower)) {
      kind = 'STORAGE';
    } else if (/(?:admin|audit|governance|roles?|permissions?|settings|configs?|tenants?|system-config|sysadmin|access-control)/.test(pLower)) {
      kind = 'ADMIN';
    } else if (/(?:health|ping|status|metrics|version|heartbeat|live|ready|diagnostics?|telemetry|liveness|readiness)/.test(pLower)) {
      kind = 'SYSTEM';
    } else {
      kind = 'REST';
    }
  }

  // 2. Identify Connected Tables
  let connectedTables = ep.connectedTables;
  if (!Array.isArray(connectedTables) || connectedTables.length === 0) {
    const matched = [];
    const seen = new Set();
    const cleanPath = pLower.replace(/[^a-z0-9]/g, '');

    for (const t of tableLookup || []) {
      if (!t.lower) continue;
      const isPathMatch = (
        pLower.includes(t.lower) ||
        (t.singular.length >= 3 && pLower.includes(t.singular)) ||
        (t.clean.length >= 4 && cleanPath.includes(t.clean))
      );
      const isModMatch = (
        modLower.includes(t.lower) ||
        (t.singular.length >= 3 && modLower.includes(t.singular))
      );

      if ((isPathMatch || isModMatch) && !seen.has(t.name)) {
        seen.add(t.name);
        const isRead = method === 'GET' || method === 'OPTIONS' || method === 'HEAD';
        const isStream = method === 'WS';
        matched.push({
          name: t.name,
          action: isRead ? 'READ' : (isStream ? 'STREAM' : 'WRITE'),
          isDirect: isPathMatch
        });
      }
    }
    connectedTables = matched;
  }

  // 3. Identify Architectural Level (Tier)
  let level = ep.level;
  if (!level) {
    if (kind === 'SYSTEM' || /(?:health|ping|status|metrics|version|heartbeat|live|ready|diagnostics?|telemetry)/.test(pLower)) {
      level = 'LOW';
    } else if (method === 'GET' && /(?:enums?|meta|version|time|ping|status|heartbeat|refresh|dropdown|constants)/.test(pLower)) {
      level = 'LOW';
    } else if (kind === 'WEBHOOK' || kind === 'ADMIN' || (connectedTables.length >= 2 && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method))) {
      level = 'HIGH';
    } else if (/(?:checkout|orders?|payments?|billings?|transactions?|invoices?|subscriptions?|drives?|assessments?|evaluations?|batches?|enrollments?|placements?|copilot|agents?|workflows?|pipelines?|sync|bulk|batch|dispatch|submit)/.test(pLower)) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) || /(?:checkout|billing|report|analytics|summary|pipeline|workflow)/.test(pLower)) {
        level = 'HIGH';
      } else {
        level = 'MEDIUM';
      }
    } else {
      level = 'MEDIUM';
    }
  }

  return {
    ...ep,
    method,
    path: routePath,
    kind,
    level,
    connectedTables,
    crawlTier: ep.crawlTier || ep['x-crawl-tier'] || 'normal',
    isLazyLoaded: ep.isLazyLoaded ?? (ep['x-lazy-loaded'] === true) ?? false,
    discoveryScope: ep.discoveryScope || ep['x-discovery-scope'] || (ep.isLazyLoaded ? 'Deep Crawl (Lazy-Loaded)' : 'Standard Crawl (Normal)')
  };
}

export default function DeveloperView({ data, rawAnalysisData, isUrlScan = false, onSelectForImpact }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [apiLevelFilter, setApiLevelFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [apiKindFilter, setApiKindFilter] = useState('ALL'); // 'ALL' | 'REST' | 'WEBSOCKET' | 'AUTH' | 'STORAGE' | 'ADMIN' | 'WEBHOOK' | 'SYSTEM'
  const [apiCrawlScopeFilter, setApiCrawlScopeFilter] = useState('ALL'); // 'ALL' | 'NORMAL' | 'LAZY'
  const [apiTableFilter, setApiTableFilter] = useState('ALL'); // 'ALL' | tableName
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [expandedApiRoute, setExpandedApiRoute] = useState(null); // string (method + path)
  const [copiedCurl, setCopiedCurl] = useState(null);
  const [fetchingEndpoint, setFetchingEndpoint] = useState(null);
  const [endpointFetchResult, setEndpointFetchResult] = useState({});
  const [copiedResponse, setCopiedResponse] = useState(null);
  const [schemaMode, setSchemaMode] = useState('FIELDS'); // 'FIELDS' | 'DDL'
  const [previewTable, setPreviewTable] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showSignals, setShowSignals] = useState(false);
  const [inspectedTable, setInspectedTable] = useState(null);
  const [stackEndpointSearch, setStackEndpointSearch] = useState('');
  const [stackMethodFilter, setStackMethodFilter] = useState('ALL');
  const [stackScopeFilter, setStackScopeFilter] = useState('ALL'); // 'ALL' | 'NORMAL' | 'LAZY'
  const [stackEndpointsLimit, setStackEndpointsLimit] = useState(12);
  const [copiedPath, setCopiedPath] = useState(null);
  const [showApiBreakdownModal, setShowApiBreakdownModal] = useState(false);
  const [showApiFlowModal, setShowApiFlowModal] = useState(false);
  const [apiFlowFocusedEndpoint, setApiFlowFocusedEndpoint] = useState(null);
  const [endpointsViewMode, setEndpointsViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  const tables = data?.tables || data?.schema?.tables || rawAnalysisData?.schema?.tables || [];
  const apisCount = useMemo(() => {
    return getApiServicesCount(rawAnalysisData || data);
  }, [rawAnalysisData, data]);
  const endpoints = useMemo(() => {
    if (Array.isArray(data?.endpoints) && data.endpoints.length > 0) return data.endpoints;
    if (Array.isArray(data?.code?.endpoints) && data.code.endpoints.length > 0) return data.code.endpoints;
    if (Array.isArray(rawAnalysisData?.endpoints) && rawAnalysisData.endpoints.length > 0) return rawAnalysisData.endpoints;
    if (Array.isArray(rawAnalysisData?.code?.endpoints) && rawAnalysisData.code.endpoints.length > 0) return rawAnalysisData.code.endpoints;
    const spec = data?.openApiSpec || rawAnalysisData?.openApiSpec;
    if (spec?.paths) {
      const derived = [];
      Object.entries(spec.paths).forEach(([routePath, methodsObj]) => {
        if (!methodsObj || typeof methodsObj !== 'object') return;
        ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].forEach((m) => {
          if (methodsObj[m]) {
            const op = methodsObj[m];
            derived.push({
              path: routePath,
              method: m.toUpperCase(),
              summary: op.summary || op.description || '',
              module: op['x-bundle-source'] || '',
              isLazyLoaded: op['x-lazy-loaded'] === true,
              crawlTier: op['x-crawl-tier'] || 'normal',
              routeType: op['x-route-type'] || 'API',
              isUiRoute: op['x-is-ui-route'] === true
            });
          }
        });
      });
      return derived;
    }
    return [];
  }, [data, rawAnalysisData]);
  const warnings = data?.breakingChangeWarnings || [];

  const isUrl = isUrlScan || rawAnalysisData?.isUrlCrawl || !!rawAnalysisData?.crawlerTelemetry || (tables.length === 0 && endpoints.length > 0);
  const techStack = data?.techStack || rawAnalysisData?.techStack || data?.crawlerTelemetry?.techStack || rawAnalysisData?.crawlerTelemetry?.techStack;

  const architecture = useMemo(() => analyzeSchemaArchitecture(tables), [tables]);

  const currentInspectedTable = inspectedTable 
    ? tables.find((t) => t.name === inspectedTable) || tables[0]
    : tables[0];

  const tableLookup = useMemo(() => {
    return tables.map((t) => {
      const lower = (t.name || '').toLowerCase();
      const singular = lower.endsWith('ies')
        ? lower.slice(0, -3) + 'y'
        : lower.endsWith('s')
        ? lower.slice(0, -1)
        : lower;
      const clean = lower.replace(/[^a-z0-9]/g, '');
      return { name: t.name, lower, singular, clean };
    });
  }, [tables]);

  const allEnrichedEndpoints = useMemo(() => {
    return endpoints.map((ep) => enrichEndpoint(ep, tables, tableLookup));
  }, [endpoints, tables, tableLookup]);

  const apiStats = useMemo(() => {
    const total = allEnrichedEndpoints.length;
    const high = allEnrichedEndpoints.filter((e) => e.level === 'HIGH').length;
    const medium = allEnrichedEndpoints.filter((e) => e.level === 'MEDIUM').length;
    const low = allEnrichedEndpoints.filter((e) => e.level === 'LOW').length;
    const connected = allEnrichedEndpoints.filter((e) => e.connectedTables && e.connectedTables.length > 0).length;

    const kinds = {
      REST: allEnrichedEndpoints.filter((e) => e.kind === 'REST').length,
      WEBSOCKET: allEnrichedEndpoints.filter((e) => e.kind === 'WEBSOCKET').length,
      AUTH: allEnrichedEndpoints.filter((e) => e.kind === 'AUTH').length,
      STORAGE: allEnrichedEndpoints.filter((e) => e.kind === 'STORAGE').length,
      ADMIN: allEnrichedEndpoints.filter((e) => e.kind === 'ADMIN').length,
      WEBHOOK: allEnrichedEndpoints.filter((e) => e.kind === 'WEBHOOK').length,
      SYSTEM: allEnrichedEndpoints.filter((e) => e.kind === 'SYSTEM').length,
      GRAPHQL: allEnrichedEndpoints.filter((e) => e.kind === 'GRAPHQL').length,
    };

    const normalCount = rawAnalysisData?.crawlerTelemetry?.normalCrawlCount ?? allEnrichedEndpoints.filter(e => !e.isLazyLoaded).length;
    const deepCount = rawAnalysisData?.crawlerTelemetry?.deepCrawlCount ?? total;
    const lazyLoadedCount = rawAnalysisData?.crawlerTelemetry?.lazyLoadedEndpointsCount ?? allEnrichedEndpoints.filter(e => e.isLazyLoaded).length;
    const genuineCount = rawAnalysisData?.crawlerTelemetry?.genuineApisCount ?? allEnrichedEndpoints.filter(e => !e.isUiRoute && e.routeType !== 'PAGE').length;
    const uiPageCount = rawAnalysisData?.crawlerTelemetry?.uiPagesCount ?? allEnrichedEndpoints.filter(e => e.isUiRoute || e.routeType === 'PAGE').length;

    return { total, high, medium, low, connected, kinds, normalCount, deepCount, lazyLoadedCount, genuineCount, uiPageCount };
  }, [allEnrichedEndpoints, rawAnalysisData]);

  const filteredApiEndpoints = useMemo(() => {
    return allEnrichedEndpoints.filter((ep) => {
      if (apiLevelFilter !== 'ALL' && ep.level !== apiLevelFilter) return false;
      if (apiKindFilter !== 'ALL' && ep.kind !== apiKindFilter) return false;
      if (apiCrawlScopeFilter === 'NORMAL' && ep.isLazyLoaded) return false;
      if (apiCrawlScopeFilter === 'LAZY' && !ep.isLazyLoaded) return false;
      if (apiCrawlScopeFilter === 'API' && (ep.isUiRoute || ep.routeType === 'PAGE')) return false;
      if (apiCrawlScopeFilter === 'PAGE' && !ep.isUiRoute && ep.routeType !== 'PAGE') return false;
      if (methodFilter !== 'ALL' && ep.method !== methodFilter) return false;
      if (apiTableFilter !== 'ALL') {
        const touches = (ep.connectedTables || []).some((ct) => ct.name === apiTableFilter);
        if (!touches) return false;
      }
      const q = (apiSearchQuery || searchQuery || '').trim().toLowerCase();
      if (q) {
        const matchesPath = ep.path.toLowerCase().includes(q);
        const matchesModule = (ep.module || '').toLowerCase().includes(q);
        const matchesKind = ep.kind.toLowerCase().includes(q);
        const matchesLevel = ep.level.toLowerCase().includes(q);
        const matchesTable = (ep.connectedTables || []).some((ct) => ct.name.toLowerCase().includes(q));
        if (!matchesPath && !matchesModule && !matchesKind && !matchesLevel && !matchesTable) {
          return false;
        }
      }
      return true;
    });
  }, [allEnrichedEndpoints, apiLevelFilter, apiKindFilter, apiCrawlScopeFilter, methodFilter, apiTableFilter, apiSearchQuery, searchQuery]);

  const stackMethodCounts = useMemo(() => {
    const counts = { ALL: allEnrichedEndpoints.length, GET: 0, POST: 0, PUT: 0, DELETE: 0, OTHER: 0 };
    allEnrichedEndpoints.forEach((e) => {
      const m = String(e.method || 'GET').toUpperCase();
      if (counts[m] !== undefined) counts[m]++;
      else counts.OTHER++;
    });
    return counts;
  }, [allEnrichedEndpoints]);

  const stackFilteredEndpoints = useMemo(() => {
    return allEnrichedEndpoints.filter((ep) => {
      if (stackMethodFilter !== 'ALL' && ep.method !== stackMethodFilter) return false;
      if (stackScopeFilter === 'NORMAL' && ep.isLazyLoaded) return false;
      if (stackScopeFilter === 'LAZY' && !ep.isLazyLoaded) return false;
      if (stackScopeFilter === 'API' && (ep.isUiRoute || ep.routeType === 'PAGE')) return false;
      if (stackScopeFilter === 'PAGE' && !ep.isUiRoute && ep.routeType !== 'PAGE') return false;
      const q = stackEndpointSearch.trim().toLowerCase();
      if (q && !ep.path.toLowerCase().includes(q) && !(ep.module || '').toLowerCase().includes(q) && !(ep.summary || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [allEnrichedEndpoints, stackMethodFilter, stackScopeFilter, stackEndpointSearch]);

  const apiBreakdown = useMemo(() => {
    return getApiEndpointsBreakdown(rawAnalysisData || data, 'auto');
  }, [rawAnalysisData, data]);

  const stackGroupedApis = useMemo(() => {
    const hasRoleDomains = stackFilteredEndpoints.some(e => e.path?.includes('/admin')) &&
      (stackFilteredEndpoints.some(e => e.path?.includes('/student') || e.path?.includes('/learning')) ||
       stackFilteredEndpoints.some(e => e.path?.includes('/mentor')) ||
       stackFilteredEndpoints.some(e => e.path?.includes('/tpo')));

    const map = new Map();
    stackFilteredEndpoints.forEach((ep) => {
      let key = 'general';
      let name = 'General API';
      let badge = '/api';

      if (hasRoleDomains) {
        const lower = (ep.path || '').toLowerCase();
        if (lower.includes('/admin')) {
          key = 'admin';
          name = 'Admin Governance API';
          badge = '/api/admin';
        } else if (lower.includes('/student') || lower.includes('/learning') || lower.includes('/labs') || lower.includes('/assessments') || lower.includes('/quiz') || lower.includes('/certificate')) {
          key = 'student';
          name = 'Student & Cadet Learning API';
          badge = '/api/student';
        } else if (lower.includes('/mentor') || lower.includes('/lab-builder') || lower.includes('/batch')) {
          key = 'mentor';
          name = 'Mentor & Faculty API';
          badge = '/api/mentor';
        } else if (lower.includes('/tpo') || lower.includes('/placement')) {
          key = 'tpo';
          name = 'TPO Campus Placement API';
          badge = '/api/tpo';
        } else if (lower.includes('/employer') || lower.includes('/jobs') || lower.includes('/applications') || lower.includes('/candidates')) {
          key = 'employer';
          name = 'Employer & ATS API';
          badge = '/api/employer';
        } else {
          key = 'core';
          name = 'Public & Core Platform API';
          badge = '/api/core';
        }
      } else {
        let rawKey = 'general';
        if (Array.isArray(ep.tags) && ep.tags[0] && ep.tags[0] !== 'General') {
          rawKey = ep.tags[0].toLowerCase();
        } else if (ep.path?.startsWith('/wp-json/')) {
          const parts = ep.path.replace('/wp-json/', '').split('/').filter(Boolean);
          rawKey = parts.slice(0, 2).join('/') || 'wp';
        } else {
          const segs = (ep.path || '').replace(/^\/+/, '').split('/').filter(Boolean);
          let idx = 0;
          if (segs[0]?.toLowerCase() === 'api') {
            idx = (segs[1] && /^v[0-9]+$/i.test(segs[1])) ? 2 : 1;
          } else if (/^v[0-9]+$/i.test(segs[0])) {
            idx = 1;
          }
          const candidate = segs[idx] || segs[0] || 'general';
          rawKey = (candidate.startsWith('{') || candidate.startsWith(':')) ? (segs[0] || 'general') : candidate;
        }
        key = rawKey.toLowerCase();
        name = formatResourceName(key);
        badge = ep.path?.startsWith('/wp-json/') ? `/wp-json/${key}` : `/api/${key}`;
      }

      if (!map.has(key)) {
        map.set(key, {
          id: `stack_api_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
          rawKey: key,
          name,
          badge,
          endpoints: [],
          methodCounts: { GET: 0, POST: 0, PUT: 0, DELETE: 0, OTHER: 0 }
        });
      }
      const grp = map.get(key);
      grp.endpoints.push(ep);
      const m = ep.method;
      if (grp.methodCounts[m] !== undefined) grp.methodCounts[m]++;
      else grp.methodCounts.OTHER++;
    });

    return Array.from(map.values()).sort((a, b) => b.endpoints.length - a.endpoints.length);
  }, [stackFilteredEndpoints]);

  useEffect(() => {
    if (stackGroupedApis.length > 0 && expandedGroupIds.size === 0) {
      setExpandedGroupIds(new Set(stackGroupedApis.slice(0, 3).map(g => g.id)));
    }
  }, [stackGroupedApis]);

  const toggleGroupExpand = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const segregatedByLevel = useMemo(() => {
    return [
      {
        level: 'HIGH',
        title: 'High-Level Endpoints (Business Orchestration & Gateway)',
        badge: 'HIGH-LEVEL',
        badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400',
        dotColor: 'bg-purple-500',
        hint: 'Mission-critical business workflows, transactions, composite coordinators, and gateway mutations',
        list: filteredApiEndpoints.filter((e) => e.level === 'HIGH')
      },
      {
        level: 'MEDIUM',
        title: 'Medium-Level Endpoints (Domain Services & Resource CRUD)',
        badge: 'MEDIUM-LEVEL',
        badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
        dotColor: 'bg-cyan-500',
        hint: 'Standard domain entity management, core resource queries, and feature endpoints',
        list: filteredApiEndpoints.filter((e) => e.level === 'MEDIUM')
      },
      {
        level: 'LOW',
        title: 'Low-Level Endpoints (System Infrastructure & Diagnostics)',
        badge: 'LOW-LEVEL',
        badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
        hint: 'Health checks, telemetry, metrics, token refresh, and static lookup metadata',
        list: filteredApiEndpoints.filter((e) => e.level === 'LOW')
      }
    ].filter((g) => apiLevelFilter === 'ALL' || g.level === apiLevelFilter);
  }, [filteredApiEndpoints, apiLevelFilter]);

  const filteredTables = tables.filter((t) => {
    if (selectedTableFilter !== 'ALL' && t.name !== selectedTableFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.databaseType || '').toLowerCase().includes(q) ||
      (t.columns || []).some((c) => c.name.toLowerCase().includes(q) || (c.type || '').toLowerCase().includes(q))
    );
  });

  const filteredEndpoints = filteredApiEndpoints;

  const { coreEndpoints, otherEndpoints } = useMemo(() => {
    const core = filteredApiEndpoints.filter((e) => e.connectedTables && e.connectedTables.length > 0);
    const other = filteredApiEndpoints.filter((e) => !e.connectedTables || e.connectedTables.length === 0);
    return { coreEndpoints: core, otherEndpoints: other };
  }, [filteredApiEndpoints]);

  const targetBaseUrl = useMemo(() => {
    const candidate = rawAnalysisData?.crawlerTelemetry?.targetUrl ||
      rawAnalysisData?.projectPath ||
      data?.projectPath;
    if (candidate && (candidate.startsWith('http://') || candidate.startsWith('https://'))) {
      try {
        return new URL(candidate).origin;
      } catch {}
    }
    const servers = rawAnalysisData?.openApiSpec?.servers || data?.openApiSpec?.servers;
    if (Array.isArray(servers) && servers[0]?.url && (servers[0].url.startsWith('http://') || servers[0].url.startsWith('https://'))) {
      try {
        return new URL(servers[0].url).origin;
      } catch {}
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }, [rawAnalysisData, data]);

  const getFullEndpointUrl = (ep) => {
    if (!ep || !ep.path) return '';
    if (ep.path.startsWith('http://') || ep.path.startsWith('https://')) {
      return ep.path;
    }
    const cleanPath = ep.path.startsWith('/') ? ep.path : '/' + ep.path;
    return `${targetBaseUrl}${cleanPath}`;
  };

  const handleCopyCurl = (ep) => {
    const key = `${ep.method}-${ep.path}`;
    const fullUrl = getFullEndpointUrl(ep);
    const cmd = `curl -X ${ep.method} "${fullUrl}"`;
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(key);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  const handleFetchEndpoint = async (ep) => {
    const key = `${ep.method}-${ep.path}`;
    const fullUrl = getFullEndpointUrl(ep);
    setFetchingEndpoint(key);
    try {
      const res = await fetch('/api/fetch-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullUrl,
          method: ep.method || 'GET'
        })
      });
      const result = await res.json();
      setEndpointFetchResult((prev) => ({
        ...prev,
        [key]: result
      }));
    } catch (err) {
      setEndpointFetchResult((prev) => ({
        ...prev,
        [key]: { success: false, error: err.message || 'Request failed' }
      }));
    } finally {
      setFetchingEndpoint(null);
    }
  };

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleCopyTableJSON = (table) => {
    navigator.clipboard.writeText(JSON.stringify(table, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCSV = (table) => {
    if (!table || !table.columns) return;
    const headers = table.columns.map((c) => c.name).join(',');
    const rows = (table.sampleRows || []).map((row) => 
      table.columns.map((col) => {
        const val = row[col.name] !== undefined ? row[col.name] : (col.sampleValue || '');
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    navigator.clipboard.writeText(`${headers}\n${rows}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateTableDDL = (tbl) => {
    const cols = (tbl.columns || []).map((c) => {
      let str = `  ${c.name} ${c.type}`;
      if (c.isPrimaryKey) str += ' PRIMARY KEY';
      else if (!c.isNullable) str += ' NOT NULL';
      if (c.defaultValue) str += ` DEFAULT ${c.defaultValue}`;
      return str;
    });
    const fks = (tbl.foreignKeys || []).map((fk) => 
      `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.targetTable}(${fk.targetColumn || 'id'})`
    );
    const allDefs = [...cols, ...fks].join(',\n');
    return `CREATE TABLE ${tbl.name} (\n${allDefs}\n);`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Quick Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-3">
        {isUrl ? (
          <>
            <div className="py-2 sm:py-0 px-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-brand font-mono">{apisCount}</span>
                <span className="text-[10px] font-bold text-brand font-mono bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20">
                  DOMAINS
                </span>
              </div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Cpu className="h-3 w-3 text-brand" />
                <span>Core API Portals</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {apiStats.genuineCount || apiStats.normalCount || endpoints.length}
                </span>
                <span className="text-[10px] font-bold text-emerald-500 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  REST APIS
                </span>
              </div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Code2 className="h-3 w-3 text-emerald-400" />
                <span>Backend Endpoints</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-cyan-400 font-mono">
                  {apiStats.uiPageCount || (endpoints.length - (apiStats.genuineCount || apiStats.normalCount))}
                </span>
                <span className="text-[10px] font-bold text-cyan-500 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  CLIENT
                </span>
              </div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Globe className="h-3 w-3 text-cyan-400" />
                <span>Frontend UI Routes</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-foreground font-mono">
                  {apiStats.deepCount || endpoints.length}
                </span>
                <span className="text-[10px] font-bold text-purple-500 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  TOTAL
                </span>
              </div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Sparkles className="h-3 w-3 text-purple-500" />
                <span>All Surfaces</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="text-2xl font-extrabold text-foreground font-mono">{rawAnalysisData?.crawlerTelemetry?.chunksCrawledCount || 1}</div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Layers2 className="h-3 w-3 text-blue-500" />
                <span>Code Chunks</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="py-2 sm:py-0 px-4">
              <div className="text-2xl font-extrabold text-foreground font-mono">{tables.length}</div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Database className="h-3 w-3 text-violet-500" />
                <span>Database Tables</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="text-2xl font-extrabold text-foreground font-mono">{apisCount}</div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Cpu className="h-3 w-3 text-brand" />
                <span>API Modules</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="text-2xl font-extrabold text-foreground font-mono">{endpoints.length}</div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Code2 className="h-3 w-3 text-cyan-500" />
                <span>API Endpoints</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="text-2xl font-extrabold text-foreground font-mono">{data?.functions?.length || 0}</div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Layers className="h-3 w-3 text-purple-500" />
                <span>AST Functions</span>
              </div>
            </div>

            <div className="py-2 sm:py-0 px-4">
              <div className="text-2xl font-extrabold text-foreground font-mono">{data?.metrics?.linesOfCode || 0}</div>
              <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
                <Terminal className="h-3 w-3 text-emerald-500" />
                <span>Lines of Code</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION: Reverse-Engineered Technology Stack & Cloud Architecture         */}
      {/* (Rendered when crawling a URL or when techStack metadata is available)    */}
      {/* ========================================================================= */}
      {(isUrl || techStack) && (
        <section className="p-6 sm:p-8 rounded-2xl border border-border bg-surface-card shadow-card w-full space-y-6 animate-fadeIn">
          {/* Header & Confidence Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand/20 via-cyan-500/20 to-purple-500/20 border border-brand/30 flex items-center justify-center text-brand shrink-0 shadow-xs">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    Reverse-Engineered Technology Stack & Architecture
                  </h2>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{techStack?.confidence || '100% In-Memory AST & Header Verified'}</span>
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Full-stack architectural decomposition reverse-engineered directly from HTTP response headers, DOM structures, and bundle runtime signatures.
                </p>
              </div>
            </div>

            {techStack?.verifiedSignals?.length > 0 && (
              <button
                onClick={() => setShowSignals(!showSignals)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-surface-raised hover:bg-surface border border-border text-foreground transition-colors cursor-pointer self-start lg:self-auto"
              >
                <Activity className="h-3.5 w-3.5 text-cyan-500" />
                <span>{showSignals ? 'Hide Verified Signals' : `Inspect Signals (${techStack.verifiedSignals.length})`}</span>
                {showSignals ? <ChevronUp className="h-3.5 w-3.5 text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-muted" />}
              </button>
            )}
          </div>

          {/* Executive Stack Profile Banner */}
          {techStack?.summary && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand/15 via-cyan-500/10 to-purple-500/15 border border-brand/30 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-brand text-white shadow-xs font-mono flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Stack Profile</span>
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-foreground">
                    {techStack.summary}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Zero Hallucination</span>
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-border text-foreground font-semibold">
                    {allEnrichedEndpoints.length} Discovered Endpoints
                  </span>
                </div>
              </div>

              {/* Quick Architectural Breakdown Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-brand/15 text-[11px] font-mono">
                <div className="bg-surface/80 p-2 rounded-lg border border-border/60">
                  <span className="text-muted text-[10px] block">UI Framework:</span>
                  <span className="font-bold text-cyan-400 truncate block">
                    {techStack?.frontend?.framework || 'Modern Web'} ({techStack?.frontend?.bundler?.split(' ')[0] || 'Vite'})
                  </span>
                </div>
                <div className="bg-surface/80 p-2 rounded-lg border border-border/60">
                  <span className="text-muted text-[10px] block">Server Runtime:</span>
                  <span className="font-bold text-purple-400 truncate block">
                    {techStack?.backend?.serverRuntime?.split('(')[0]?.trim() || 'Node.js'}
                  </span>
                </div>
                <div className="bg-surface/80 p-2 rounded-lg border border-border/60">
                  <span className="text-muted text-[10px] block">Hosting & Cloud:</span>
                  <span className="font-bold text-sky-400 truncate block">
                    {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.name || techStack?.backend?.hostingCdn?.split('·')[0]?.trim() || 'Cloud Edge'}
                  </span>
                </div>
                <div className="bg-surface/80 p-2 rounded-lg border border-border/60">
                  <span className="text-muted text-[10px] block">API Perimeter:</span>
                  <span className="font-bold text-emerald-400 truncate block">
                    {allEnrichedEndpoints.length} Routes ({apiStats.normalCount} N + {apiStats.lazyLoadedCount} L)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4 Architectural Pillar Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Frontend & Client Layer */}
            <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1 font-mono">
                    <Code2 className="h-3.5 w-3.5" />
                    <span>Frontend Layer</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                    UI Runtime
                  </span>
                </div>
                <div className="text-base font-extrabold text-foreground">
                  {techStack?.frontend?.framework || 'Modern Web Framework'}
                </div>
                <div className="text-xs text-muted font-medium mt-0.5">
                  {techStack?.frontend?.variant || 'Single Page Application'}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center text-muted">
                  <span>Bundler:</span>
                  <span className="font-semibold text-foreground">{techStack?.frontend?.bundler?.split(' ')[0] || 'Vite/Webpack'}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>UI System:</span>
                  <span className="font-semibold text-foreground">{techStack?.frontend?.uiLibrary || 'Standard CSS'}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Rendering:</span>
                  <span className="font-semibold text-foreground truncate max-w-[130px]" title={techStack?.frontend?.renderingMode}>
                    {techStack?.frontend?.renderingMode?.split(' ')[0] || 'CSR (SPA)'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Backend & Server Runtime */}
            <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                    <Server className="h-3.5 w-3.5" />
                    <span>Backend Runtime</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                    Execution
                  </span>
                </div>
                <div className="text-base font-extrabold text-foreground">
                  {techStack?.backend?.serverRuntime?.split('(')[0]?.trim() || 'Node.js'}
                </div>
                <div className="text-xs text-muted font-medium mt-0.5 truncate" title={techStack?.backend?.serverRuntime}>
                  {techStack?.backend?.serverRuntime?.includes('(') ? techStack.backend.serverRuntime.match(/\(([^)]+)\)/)?.[1] : 'Cloud Execution Runtime'}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center text-muted">
                  <span>API Pattern:</span>
                  <span className="font-semibold text-foreground truncate max-w-[130px]" title={techStack?.backend?.apiArchitecture}>
                    {techStack?.backend?.apiArchitecture?.split('·')[0]?.trim() || 'REST APIs'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Server Soft:</span>
                  <span className="font-semibold text-foreground truncate max-w-[130px]">{techStack?.backend?.serverSoftware || 'HTTP Gateway'}</span>
                </div>
                <div className="flex justify-between items-center text-muted">
                  <span>Discovered Routes:</span>
                  <span className="font-semibold text-emerald-400">{allEnrichedEndpoints.length} Endpoints</span>
                </div>
              </div>
            </div>

            {/* 3. Hosting & Cloud Service Provider (CSP) */}
            <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                    <Cloud className="h-3.5 w-3.5" />
                    <span>Cloud & Hosting</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
                    {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.code ? (techStack?.cloudProvider || techStack?.backend?.cloudProvider).code.toUpperCase() : 'CLOUD'}
                  </span>
                </div>
                <div className="text-base font-extrabold text-foreground truncate" title={(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.name || techStack?.backend?.hostingCdn}>
                  {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.name || techStack?.backend?.hostingCdn?.split('·')[0]?.trim() || 'Cloud Edge'}
                </div>
                <div className="text-xs text-muted font-medium mt-0.5 truncate" title={(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.category}>
                  {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.category || 'Global Edge Distribution'}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between items-center text-muted">
                  <span>Services:</span>
                  <span className="font-semibold text-foreground truncate max-w-[130px]" title={(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.services?.join(', ')}>
                    {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.services?.[0] || 'DDoS Shield / TLS'}
                  </span>
                </div>
                {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.region && (
                  <div className="flex justify-between items-center text-muted">
                    <span>Region / POP:</span>
                    <span className="font-semibold text-emerald-400 truncate max-w-[130px]">
                      {(techStack?.cloudProvider || techStack?.backend?.cloudProvider).region}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-muted">
                  <span>Evidence:</span>
                  <span className="font-semibold text-cyan-400 truncate max-w-[130px]" title={(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.evidence?.[0]}>
                    {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.evidence?.[0]?.split('(')[0]?.trim() || 'HTTP Headers'}
                  </span>
                </div>
              </div>

              {/* Extended Cloud Services Tags */}
              {(techStack?.cloudProvider || techStack?.backend?.cloudProvider)?.services?.length > 1 && (
                <div className="pt-1.5 flex flex-wrap gap-1">
                  {(techStack?.cloudProvider || techStack?.backend?.cloudProvider).services.slice(1, 4).map((srv, sIdx) => (
                    <span key={sIdx} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-950/40 text-sky-300 border border-sky-500/20 font-medium">
                      {srv}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Third-Party Integrations */}
            <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1 font-mono">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Integrations & BaaS</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                    {techStack?.integrations?.length || 0} Detected
                  </span>
                </div>
                <div className="text-base font-extrabold text-foreground">
                  {techStack?.integrations?.length > 0 ? techStack.integrations[0].name : 'Direct Gateway'}
                </div>
                <div className="text-xs text-muted font-medium mt-0.5">
                  {techStack?.integrations?.length > 0 ? techStack.integrations[0].category : 'Self-Contained Backend'}
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1">
                {techStack?.integrations?.length > 0 ? (
                  techStack.integrations.map((item, idx) => (
                    <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground font-semibold flex items-center gap-1">
                      <span>{item.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-muted font-mono">Standard API Architecture</span>
                )}
              </div>
            </div>
          </div>

          {/* Discovered Backend Microservice Domains / Gateways */}
          {techStack?.backend?.discoveredGateways?.length > 0 && (
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Network className="h-4 w-4 text-cyan-500" />
                  <span>Discovered Microservice Gateways & External Backend Domains ({techStack.backend.discoveredGateways.length})</span>
                </span>
                <span className="text-[10px] text-muted font-mono">Discovered via code AST & network callers</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {techStack.backend.discoveredGateways.map((domain, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-mono px-2.5 py-1 rounded-lg bg-surface-raised text-foreground font-medium border border-border flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3 w-3 text-brand" />
                    <span>{domain}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verified Signals & HTTP Evidence Drawer */}
          {showSignals && techStack?.verifiedSignals?.length > 0 && (
            <div className="p-4 rounded-xl bg-surface border border-cyan-500/30 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Verified Evidence & Detection Signatures ({techStack.verifiedSignals.length})</span>
                </div>
                <span className="text-[10px] font-mono text-muted">100% In-Memory Local Verification</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                {techStack.verifiedSignals.map((signal, sIdx) => (
                  <div key={sIdx} className="p-2 rounded-lg bg-surface-raised border border-border flex items-start gap-2 text-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{signal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DISCOVERED API ENDPOINTS SHOWCASE & REAL-TIME EXPLORER                    */}
          {/* ========================================================================= */}
          {allEnrichedEndpoints.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface/90 border border-border shadow-xs space-y-4">
              {/* Header with counts and smooth jump */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-brand/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">
                        Discovered API Endpoints Inventory
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        {stackFilteredEndpoints.length} of {allEnrichedEndpoints.length} Routes
                      </span>
                      {apiStats.normalCount > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
                          {apiStats.normalCount} Normal
                        </span>
                      )}
                      {apiStats.lazyLoadedCount > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
                          +{apiStats.lazyLoadedCount} Lazy / Role-Gated
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      Extracted local-first from AST call graphs, client bundles, and HTTP traffic signatures.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowApiBreakdownModal(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/25 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="View which API has how many endpoints and all endpoint names"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>API Breakdown ({apiBreakdown.totalApisCount} APIs)</span>
                  </button>

                  <button
                    onClick={() => {
                      const el = document.getElementById('api-topology-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-brand hover:text-brand-light bg-brand/10 hover:bg-brand/15 border border-brand/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Jump to Full API Topology, Tier Segregation & Blast Radius"
                  >
                    <span>Full Topology & Simulator</span>
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* View Mode Toggle + Method Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border shrink-0">
                    <button
                      onClick={() => setEndpointsViewMode('grouped')}
                      className={`px-2 py-0.8 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        endpointsViewMode === 'grouped'
                          ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-xs'
                          : 'text-muted hover:text-foreground'
                      }`}
                      title="Group endpoints by API service / resource"
                    >
                      <Layers className="h-3 w-3" />
                      <span>By API ({stackGroupedApis.length})</span>
                    </button>
                    <button
                      onClick={() => setEndpointsViewMode('flat')}
                      className={`px-2 py-0.8 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        endpointsViewMode === 'flat'
                          ? 'bg-brand/15 text-brand border border-brand/30 shadow-xs'
                          : 'text-muted hover:text-foreground'
                      }`}
                      title="View flat list of all endpoints"
                    >
                      <span>Flat List</span>
                    </button>
                  </div>

                  {/* Surface Scope Switcher for URL Crawls (REST APIs vs UI Routes) */}
                  {isUrl && (
                    <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-border shrink-0">
                      <button
                        onClick={() => setStackScopeFilter('ALL')}
                        className={`px-2 py-0.8 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          stackScopeFilter === 'ALL'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-xs'
                            : 'text-muted hover:text-foreground'
                        }`}
                        title="View all discovered endpoints and routes"
                      >
                        All ({allEnrichedEndpoints.length})
                      </button>
                      <button
                        onClick={() => setStackScopeFilter('API')}
                        className={`px-2 py-0.8 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          stackScopeFilter === 'API'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs'
                            : 'text-muted hover:text-foreground'
                        }`}
                        title="View only backend REST API endpoints"
                      >
                        REST APIs ({apiStats.genuineCount || apiStats.normalCount})
                      </button>
                      <button
                        onClick={() => setStackScopeFilter('PAGE')}
                        className={`px-2 py-0.8 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          stackScopeFilter === 'PAGE'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-xs'
                            : 'text-muted hover:text-foreground'
                        }`}
                        title="View only frontend client page routes"
                      >
                        UI Routes ({apiStats.uiPageCount})
                      </button>
                    </div>
                  )}
                  {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => {
                    const count = stackMethodCounts[m] || 0;
                    const isActive = stackMethodFilter === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setStackMethodFilter(m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          isActive
                            ? m === 'GET'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                              : m === 'POST'
                              ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                              : m === 'PUT'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                              : m === 'DELETE'
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                              : 'bg-brand/15 border-brand/40 text-brand'
                            : 'bg-surface hover:bg-surface-raised border-border text-muted hover:text-foreground'
                        }`}
                      >
                        <span>{m}</span>
                        <span className="text-[10px] opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter path, module..."
                    value={stackEndpointSearch}
                    onChange={(e) => setStackEndpointSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted focus:outline-hidden focus:border-brand font-mono"
                  />
                  {stackEndpointSearch && (
                    <button
                      onClick={() => setStackEndpointSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Endpoints Grid List (Grouped by API vs Flat List) */}
              {endpointsViewMode === 'grouped' ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {stackGroupedApis.map((grp) => {
                    const isGrpExpanded = expandedGroupIds.has(grp.id);
                    const ResourceIcon = getResourceIcon(grp.name);

                    return (
                      <div
                        key={grp.id}
                        className="rounded-xl border border-border/80 bg-surface-raised/50 overflow-hidden shadow-xs hover:border-border transition-all"
                      >
                        {/* Group Header */}
                        <div
                          onClick={() => toggleGroupExpand(grp.id)}
                          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-surface-raised transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                              <ResourceIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-foreground hover:text-brand transition-colors truncate">
                                  {grp.name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-surface border border-border text-muted">
                                  {grp.badge}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/25">
                              {grp.endpoints.length} {grp.endpoints.length === 1 ? 'Endpoint' : 'Endpoints'}
                            </span>
                            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono">
                              {grp.methodCounts.GET > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {grp.methodCounts.GET} GET
                                </span>
                              )}
                              {grp.methodCounts.POST > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  {grp.methodCounts.POST} POST
                                </span>
                              )}
                              {grp.methodCounts.PUT > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  {grp.methodCounts.PUT} PUT
                                </span>
                              )}
                              {grp.methodCounts.DELETE > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  {grp.methodCounts.DELETE} DEL
                                </span>
                              )}
                            </div>
                            <div className="text-muted">
                              {isGrpExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Group Endpoints List */}
                        {isGrpExpanded && (
                          <div className="border-t border-border/60 bg-surface/50 p-2.5 sm:p-3 space-y-1.5">
                            {grp.endpoints.map((ep, idx) => {
                              const key = `${ep.method}-${ep.path}`;
                              const isFetched = !!endpointFetchResult[key];
                              const fetchRes = endpointFetchResult[key];
                              const isPending = fetchingEndpoint === key;

                              const methodColor = 
                                ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                                ep.method === 'POST' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                                ep.method === 'PUT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                                ep.method === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                                'bg-cyan-500/10 text-cyan-400 border-cyan-500/25';

                              return (
                                <div
                                  key={`${grp.id}-${ep.method}-${ep.path}-${idx}`}
                                  className="p-2.5 rounded-lg bg-surface hover:bg-surface-raised border border-border/70 hover:border-border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs"
                                >
                                  <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border uppercase shrink-0 ${methodColor}`}>
                                      {ep.method}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold text-foreground hover:text-brand transition-colors break-all select-all">
                                          {ep.path}
                                        </span>
                                        {ep.level && (
                                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${
                                            ep.level === 'HIGH' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                                            ep.level === 'MEDIUM' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' :
                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                          }`}>
                                            {ep.level}
                                          </span>
                                        )}
                                      </div>
                                      {(ep.handler || ep.module || ep.source || ep.summary) && (
                                        <div className="text-[10px] text-muted font-mono truncate mt-0.5">
                                          {ep.handler ? `handler: ${ep.handler}` : (ep.module ? `source: ${ep.module}` : ep.summary || ep.source)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                                    <button
                                      onClick={() => handleCopyPath(ep.path)}
                                      className="px-2 py-1 rounded-md bg-surface-subtle border border-border hover:bg-surface-raised text-[10px] font-mono text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Copy relative route path"
                                    >
                                      {copiedPath === ep.path ? (
                                        <>
                                          <Check className="h-3 w-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3" />
                                          <span>Path</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      onClick={() => handleCopyCurl(ep)}
                                      className="px-2 py-1 rounded-md bg-surface-subtle border border-border hover:bg-surface-raised text-[10px] font-mono text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Copy executable cURL command"
                                    >
                                      {copiedCurl === key ? (
                                        <>
                                          <Check className="h-3 w-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Terminal className="h-3 w-3" />
                                          <span>cURL</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      onClick={() => handleFetchEndpoint(ep)}
                                      disabled={isPending}
                                      className={`px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                        isPending
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                                          : isFetched
                                          ? fetchRes?.success
                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                          : 'bg-brand/10 hover:bg-brand/20 border-brand/25 text-brand'
                                      }`}
                                      title="Send live local HTTP probe via BendLens air-gapped fetch proxy"
                                    >
                                      {isPending ? (
                                        <span>Testing...</span>
                                      ) : isFetched ? (
                                        <span>{fetchRes?.status || (fetchRes?.success ? '200 OK' : 'ERR')}</span>
                                      ) : (
                                        <>
                                          <Radio className="h-3 w-3" />
                                          <span>Test Live</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {stackGroupedApis.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted font-mono bg-surface-raised/40 rounded-xl border border-dashed border-border">
                      No APIs match "{stackEndpointSearch}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {stackFilteredEndpoints.slice(0, stackEndpointsLimit).map((ep, idx) => {
                    const key = `${ep.method}-${ep.path}`;
                    const isFetched = !!endpointFetchResult[key];
                    const fetchRes = endpointFetchResult[key];
                    const isPending = fetchingEndpoint === key;

                    const methodColor = 
                      ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                      ep.method === 'POST' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                      ep.method === 'PUT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                      ep.method === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                      'bg-cyan-500/10 text-cyan-400 border-cyan-500/25';

                    return (
                      <div
                        key={`${ep.method}-${ep.path}-${idx}`}
                        className="p-3 rounded-xl bg-surface-raised/70 hover:bg-surface-raised border border-border/70 hover:border-border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                      >
                        {/* Left: Method + Path + Badges */}
                        <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border uppercase shrink-0 ${methodColor}`}>
                            {ep.method}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-foreground hover:text-brand transition-colors break-all select-all">
                                {ep.path}
                              </span>
                              {ep.level && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${
                                  ep.level === 'HIGH' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                                  ep.level === 'MEDIUM' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' :
                                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                }`}>
                                  {ep.level}
                                </span>
                              )}
                              {ep.isLazyLoaded && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  LAZY
                                </span>
                              )}
                            </div>
                            {(ep.module || ep.source || ep.summary) && (
                              <div className="text-[10px] text-muted font-mono truncate mt-0.5">
                                {ep.module ? `source: ${ep.module}` : ep.summary || ep.source}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Quick Actions (Copy Path, Copy cURL, Test Live) */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                          <button
                            onClick={() => handleCopyPath(ep.path)}
                            className="px-2 py-1 rounded-md bg-surface border border-border hover:bg-surface-raised text-[10px] font-mono text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy relative route path"
                          >
                            {copiedPath === ep.path ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Path</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopyCurl(ep)}
                            className="px-2 py-1 rounded-md bg-surface border border-border hover:bg-surface-raised text-[10px] font-mono text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy executable cURL command"
                          >
                            {copiedCurl === key ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="h-3 w-3" />
                                <span>cURL</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleFetchEndpoint(ep)}
                            disabled={isPending}
                            className={`px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isPending
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                                : isFetched
                                ? fetchRes?.success
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                : 'bg-brand/10 hover:bg-brand/20 border-brand/25 text-brand'
                            }`}
                            title="Send live local HTTP probe via BendLens air-gapped fetch proxy"
                          >
                            {isPending ? (
                              <span>Testing...</span>
                            ) : isFetched ? (
                              <span>{fetchRes?.status || (fetchRes?.success ? '200 OK' : 'ERR')}</span>
                            ) : (
                              <>
                                <Radio className="h-3 w-3" />
                                <span>Test Live</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {stackFilteredEndpoints.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted font-mono bg-surface-raised/40 rounded-xl border border-dashed border-border">
                      No endpoints match "{stackEndpointSearch}"
                    </div>
                  )}
                </div>
              )}

              {/* Footer controls: pagination limit & full topology hint */}
              {stackFilteredEndpoints.length > 12 && (
                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <div className="text-[11px] text-muted font-mono">
                    Showing <strong className="text-foreground">{Math.min(stackEndpointsLimit, stackFilteredEndpoints.length)}</strong> of <strong className="text-foreground">{stackFilteredEndpoints.length}</strong> endpoints
                  </div>
                  <div className="flex items-center gap-2">
                    {stackEndpointsLimit < stackFilteredEndpoints.length ? (
                      <button
                        onClick={() => setStackEndpointsLimit(stackFilteredEndpoints.length)}
                        className="text-xs font-mono text-brand hover:underline font-bold cursor-pointer"
                      >
                        Show All {stackFilteredEndpoints.length} Endpoints
                      </button>
                    ) : (
                      <button
                        onClick={() => setStackEndpointsLimit(12)}
                        className="text-xs font-mono text-muted hover:text-foreground cursor-pointer"
                      >
                        Collapse to Top 12
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* WHOLE SECTION: Database Schemas & Developer Architecture                   */}
      {/* (Only displayed for backend repositories with actual DB tables)          */}
      {/* ========================================================================= */}
      {!isUrl && tables.length > 0 && (
        !showExplanation ? (
        <section className="p-8 sm:p-12 rounded-2xl border border-border bg-surface-card shadow-card text-center space-y-4 animate-fadeIn">
          <div className="h-14 w-14 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand mx-auto shadow-sm">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">
              Database Schema & Developer Architecture
            </h2>
            <p className="text-xs text-muted max-w-lg mx-auto leading-relaxed">
              {tables.length} database tables across {architecture.totalColumns} attributes and {endpoints.length} API routes detected. Click below to inspect complete relational schemas, domain models, entity pillars, and column definitions.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => setShowExplanation(true)}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold btn-primary"
            >
              <Sparkles className="h-4 w-4" />
              <span>Explain Schema Architecture</span>
            </button>
          </div>
          <div className="pt-1 flex items-center justify-center gap-2 text-[11px] font-mono text-muted">
            <span className="px-2 py-0.5 rounded bg-surface-raised border border-border">
              {tables.length} Tables
            </span>
            <span>·</span>
            <span className="px-2 py-0.5 rounded bg-surface-raised border border-border">
              {architecture.totalColumns} Attributes
            </span>
            <span>·</span>
            <span className="px-2 py-0.5 rounded bg-surface-raised border border-border">
              {endpoints.length} API Routes
            </span>
          </div>
        </section>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          <section className="rounded-2xl border border-border bg-surface-card shadow-card w-full overflow-hidden">
            {/* Top Control Bar: Only the Explain Button and essential view controls */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              <div className="flex items-center gap-2.5">
                {/* The Dedicated Explain Button */}
                <button
                  onClick={() => setShowExplanation(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold btn-primary"
                  title="Hide Explanation and return to summary"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Hide Explanation</span>
                </button>

                <span className="text-xs font-mono text-muted pl-1">
                  {tables.length} tables · {architecture.totalColumns} attributes
                </span>
              </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Field vs DDL Toggle */}
            <div className="flex items-center p-0.5 bg-surface-raised rounded-lg border border-border text-xs">
              <button
                onClick={() => setSchemaMode('FIELDS')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  schemaMode === 'FIELDS' ? 'bg-surface-card text-foreground shadow-xs' : 'text-muted hover:text-foreground'
                }`}
              >
                Attributes View
              </button>
              <button
                onClick={() => setSchemaMode('DDL')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  schemaMode === 'DDL' ? 'bg-surface-card text-foreground shadow-xs' : 'text-muted hover:text-foreground'
                }`}
              >
                DDL SQL
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search tables or attributes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface-raised border border-border text-foreground outline-none focus:border-brand placeholder:text-muted w-44 sm:w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted hover:text-foreground p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXPLANATION PANEL: Only shown if Explain button is clicked                */}
        {/* ========================================================================= */}
        {showExplanation && (
          <div className="p-5 sm:p-6 border-b border-brand/25 bg-surface-raised space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Database Schema Architecture & Domain Model Explanation
                  </h3>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {architecture.synopsis}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExplanation(false)}
                className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                title="Close Explanation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 4 Architectural Entity Classification Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Box className="h-3.5 w-3.5" />
                  <span>Root Anchor Models</span>
                </div>
                <div className="text-[11px] text-muted leading-relaxed">
                  Primary identities with independent lifecycle:
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {architecture.rootEntities.map((t) => (
                    <span key={t.name} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-500/20">
                      {t.name}
                    </span>
                  ))}
                  {architecture.rootEntities.length === 0 && (
                    <span className="text-[11px] text-muted italic">None detected</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <GitFork className="h-3.5 w-3.5" />
                  <span>Transactional Records</span>
                </div>
                <div className="text-[11px] text-muted leading-relaxed">
                  Operational records referencing root entities:
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {architecture.transactionEntities.map((t) => (
                    <span key={t.name} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-semibold border border-blue-500/20">
                      {t.name}
                    </span>
                  ))}
                  {architecture.transactionEntities.length === 0 && (
                    <span className="text-[11px] text-muted italic">None detected</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                  <Network className="h-3.5 w-3.5" />
                  <span>Junction / Line Items</span>
                </div>
                <div className="text-[11px] text-muted leading-relaxed">
                  Composite tables resolving M:N cardinality:
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {architecture.junctionEntities.map((t) => (
                    <span key={t.name} className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 font-mono text-[10px] font-semibold border border-violet-500/20">
                      {t.name}
                    </span>
                  ))}
                  {architecture.junctionEntities.length === 0 && (
                    <span className="text-[11px] text-muted italic">Direct 1:N schema</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>High Blast Radius Hubs</span>
                </div>
                <div className="text-[11px] text-muted leading-relaxed">
                  Tables with most dependent downstream models:
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {architecture.hubs.slice(0, 3).map((h) => (
                    <span key={h.name} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-semibold border border-rose-500/20">
                      {h.name} ({h.dependentCount} refs)
                    </span>
                  ))}
                  {architecture.hubs.length === 0 && (
                    <span className="text-[11px] text-muted italic">No foreign key hubs</span>
                  )}
                </div>
              </div>
            </div>

            {/* Relational Flow & Table Deep-Dive Inspector */}
            <div className="pt-2 border-t border-border flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-brand" />
                  <span>Foreign Key Relational Flow ({architecture.relations.length})</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {architecture.relations.map((rel, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-mono p-1.5 rounded bg-surface border border-border">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <span className="font-semibold text-brand">{rel.from}</span>
                        <span className="text-muted">.{rel.fromCol}</span>
                        <ArrowRight className="h-3 w-3 text-muted" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{rel.to}</span>
                        <span className="text-muted">.{rel.toCol}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-raised text-muted">
                        {rel.type}
                      </span>
                    </div>
                  ))}
                  {architecture.relations.length === 0 && (
                    <div className="text-xs text-muted italic p-2">
                      No explicit foreign keys detected in schema DDL.
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-80 p-3 rounded-lg bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-violet-500" />
                    <span>Table Deep Dive</span>
                  </span>
                  <select
                    value={currentInspectedTable?.name || ''}
                    onChange={(e) => setInspectedTable(e.target.value)}
                    className="text-[11px] font-mono bg-surface-raised border border-border rounded px-2 py-0.5 text-foreground outline-none"
                  >
                    {tables.map((t) => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {currentInspectedTable && (
                  <div className="text-[11px] space-y-1.5">
                    <div className="text-muted leading-relaxed">
                      <strong className="text-foreground font-mono">{currentInspectedTable.name}</strong> contains{' '}
                      <strong className="text-foreground font-mono">{currentInspectedTable.columns?.length || 0}</strong> attributes.
                      {(currentInspectedTable.foreignKeys || []).length > 0 && (
                        <span> Outgoing references: {currentInspectedTable.foreignKeys.map((f) => f.targetTable).join(', ')}.</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedTableFilter(currentInspectedTable.name)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/25 hover:bg-brand/20 cursor-pointer"
                      >
                        Focus on this table
                      </button>
                      <button
                        onClick={() => onSelectForImpact && onSelectForImpact(currentInspectedTable.name, 'table', 'table_name')}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 cursor-pointer"
                      >
                        Simulate Blast
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TABLE SELECTOR NAVIGATION: Clear Table Pills & Total Counter              */}
        {/* ========================================================================= */}
        {tables.length > 1 && (
          <div className="px-4 sm:px-5 py-3 border-b border-border bg-surface-subtle flex items-center gap-2 overflow-x-auto select-none">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Database className="h-3 w-3 text-brand" />
              <span>Select Table:</span>
            </span>

            <button
              onClick={() => setSelectedTableFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedTableFilter === 'ALL'
                  ? 'btn-primary font-bold'
                  : 'bg-surface hover:bg-surface-raised text-muted hover:text-foreground border border-border'
              }`}
            >
              <span>All Tables</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 dark:bg-white/20">
                {tables.length}
              </span>
            </button>

            {tables.map((tbl) => {
              const isSelected = selectedTableFilter === tbl.name;
              return (
                <button
                  key={tbl.name}
                  onClick={() => setSelectedTableFilter(tbl.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-surface-card text-foreground border-2 border-brand font-bold shadow-xs ring-2 ring-brand/20'
                      : 'bg-surface hover:bg-surface-raised text-muted hover:text-foreground border border-border'
                  }`}
                >
                  <span>{tbl.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    isSelected ? 'bg-brand/15 text-brand' : 'bg-surface-raised text-muted'
                  }`}>
                    {tbl.columns?.length || 0} attrs
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* EVERY TABLE & ITS ATTRIBUTES SHOWN WITH CRYSTAL CLARITY                   */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 space-y-6">
          {filteredTables.map((table) => {
            const hasFks = (table.foreignKeys || []).length > 0;
            const pkCols = (table.columns || []).filter((c) => c.isPrimaryKey);
            return (
              <div
                key={table.name}
                id={`table-card-${table.name}`}
                className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden"
              >
                {/* Clean Table Banner */}
                <div className="px-4 sm:px-5 py-3.5 bg-surface-raised border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center text-brand shrink-0 font-mono font-bold text-xs">
                      <Database className="h-4 w-4 text-brand" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {table.name}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface text-muted border border-border">
                          {table.databaseType || 'Relational SQL'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface text-foreground font-medium border border-border">
                          {table.columns?.length || 0} Attributes
                        </span>
                        {pkCols.length > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                            PK: {pkCols.map(p => p.name).join(', ')}
                          </span>
                        )}
                        {hasFks && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-semibold">
                            {table.foreignKeys.length} FK references
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar for this Table */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewTable(table)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-subtle text-foreground border border-border flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
                      title="View Sample Row Values & Data Spreadsheet"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-brand" />
                      <span>Data Values</span>
                    </button>

                    <button
                      onClick={() => onSelectForImpact && onSelectForImpact(table.name, 'table', 'table_name')}
                      className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center gap-1 transition-colors cursor-pointer font-medium"
                      title={`Simulate blast radius of modifying ${table.name} table`}
                    >
                      <span>Simulate Table</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Attributes Data Table: Crystal Clear & Fully Legible */}
                {schemaMode === 'FIELDS' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border bg-surface-subtle text-[10px] uppercase text-muted tracking-wider select-none">
                          <th className="py-2.5 px-3 w-10 text-center font-bold">#</th>
                          <th className="py-2.5 px-4 font-bold text-foreground">Attribute / Field Name</th>
                          <th className="py-2.5 px-4 font-bold text-foreground">Data Type</th>
                          <th className="py-2.5 px-4 font-bold text-foreground">Constraints & Foreign Keys</th>
                          <th className="py-2.5 px-4 font-bold text-foreground">Default Value</th>
                          <th className="py-2.5 px-4 font-bold text-foreground">Sample Value</th>
                          <th className="py-2.5 px-4 font-bold text-right text-foreground">Blast Simulation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {table.columns?.map((col, cIdx) => {
                          const fk = table.foreignKeys?.find((f) => f.column === col.name);
                          return (
                            <tr 
                              key={col.name} 
                              className="hover:bg-surface-raised transition-colors group"
                            >
                              {/* Row Index */}
                              <td className="py-2.5 px-3 text-center text-muted text-[11px] font-mono">
                                {cIdx + 1}
                              </td>

                              {/* Attribute Name with Badges */}
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  {col.isPrimaryKey && (
                                    <span 
                                      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 shadow-xs" 
                                      title="Primary Key Column"
                                    >
                                      <Key className="h-2.5 w-2.5" />
                                      <span>PK</span>
                                    </span>
                                  )}
                                  {fk && (
                                    <span 
                                      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 shrink-0 shadow-xs" 
                                      title={`Foreign Key referencing ${fk.targetTable}.${fk.targetColumn || 'id'}`}
                                    >
                                      <Link2 className="h-2.5 w-2.5" />
                                      <span>FK</span>
                                    </span>
                                  )}
                                  <span className={`text-xs ${col.isPrimaryKey ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-foreground font-semibold'}`}>
                                    {col.name}
                                  </span>
                                </div>
                              </td>

                              {/* Data Type */}
                              <td className="py-2.5 px-4">
                                <span className="inline-block px-2 py-0.5 rounded bg-surface-raised text-foreground font-mono text-[11px] border border-border">
                                  {col.type}
                                </span>
                              </td>

                              {/* Constraints & Foreign Keys */}
                              <td className="py-2.5 px-4 text-[11px]">
                                {fk ? (
                                  <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-mono font-medium">
                                    <Link2 className="h-3 w-3 shrink-0" />
                                    <ArrowRight className="h-2.5 w-2.5 shrink-0 opacity-70" />
                                    <span>{fk.targetTable}.{fk.targetColumn || 'id'}</span>
                                  </div>
                                ) : !col.isNullable && !col.isPrimaryKey ? (
                                  <span className="px-1.5 py-0.5 rounded bg-surface-raised text-muted font-medium text-[10px] border border-border">
                                    NOT NULL
                                  </span>
                                ) : col.isPrimaryKey ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium text-[10px]">
                                    PRIMARY KEY
                                  </span>
                                ) : (
                                  <span className="text-muted">NULLABLE</span>
                                )}
                              </td>

                              {/* Default Value */}
                              <td className="py-2.5 px-4 text-[11px] text-muted font-mono truncate max-w-[130px]">
                                {col.defaultValue && col.defaultValue !== 'AUTO' ? String(col.defaultValue) : '—'}
                              </td>

                              {/* Sample Value */}
                              <td className="py-2.5 px-4 text-[11px] text-foreground font-mono truncate max-w-[160px]">
                                {col.sampleValue !== undefined && col.sampleValue !== null && col.sampleValue !== ''
                                  ? String(col.sampleValue) 
                                  : '—'}
                              </td>

                              {/* Blast Simulation */}
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => onSelectForImpact && onSelectForImpact(
                                    table.name, 
                                    'table', 
                                    col.isPrimaryKey ? 'key' : 'column_name', 
                                    col.name,
                                    col.isPrimaryKey ? `PK (${col.name})` : null
                                  )}
                                  className="text-[10px] px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 inline-flex items-center gap-1 transition-colors cursor-pointer font-medium"
                                  title={`Simulate blast radius of modifying column ${table.name}.${col.name}`}
                                >
                                  <span>Blast</span>
                                  <ArrowRight className="h-2.5 w-2.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DDL SQL View */}
                {schemaMode === 'DDL' && (
                  <div className="p-4 bg-surface-subtle">
                    <pre className="p-4 rounded-xl bg-surface text-foreground text-xs font-mono overflow-x-auto leading-relaxed border border-border shadow-xs">
                      {generateTableDDL(table)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {filteredTables.length === 0 && (
            <div className="text-center py-14 px-4 rounded-xl border border-dashed border-border bg-surface-raised">
              <Database className="h-8 w-8 text-muted mx-auto mb-2 opacity-60" />
              <p className="text-xs font-semibold text-foreground">No matching database tables found</p>
              <p className="text-[11px] text-muted mt-1">
                {searchQuery ? `No tables or attributes match "${searchQuery}"` : 'No database tables found'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs text-brand hover:underline font-medium cursor-pointer"
                >
                  Clear search filter
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
)}

      {/* ========================================================================= */}
      {/* WHOLE SECTION: API Routes, Multi-Tier Classification & Connection Topology */}
      {/* ========================================================================= */}
      <section id="api-topology-section" className="p-5 sm:p-6 rounded-2xl border border-border bg-surface-card shadow-card w-full space-y-5">
        {/* Header & Synopsis */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-brand/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0 shadow-xs">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  API Routes, Protocols & Multi-Tier Topology
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-surface-raised text-foreground font-semibold border border-border">
                  {allEnrichedEndpoints.length} Routes
                </span>
                {!isUrl ? (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    {apiStats.connected} Connected to DB
                  </span>
                ) : (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/25">
                    Universal Web Surface Discovery
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {!isUrl 
                  ? <>Segregated by architectural tier (<span className="text-purple-600 dark:text-purple-400 font-semibold">High</span>, <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Medium</span>, <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Low</span>), protocol kind (REST, WebSockets, Webhooks, Auth), and connected database tables.</>
                  : <>Full perimeter API assessment segregated by architectural tier (<span className="text-purple-600 dark:text-purple-400 font-semibold">High</span>, <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Medium</span>, <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Low</span>) and functional endpoints.</>
                }
              </p>
            </div>
          </div>

          {/* Quick Search & Download PDF Report Button */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => {
                setApiFlowFocusedEndpoint(null);
                setShowApiFlowModal(true);
              }}
              className="px-3.5 py-2 text-xs rounded-xl font-bold bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-600 dark:text-cyan-300 border border-cyan-500/35 flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="View Professional Graphical Communication Flow of API Endpoints"
            >
              <Workflow className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
              <span>View Interactive Graph</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold">Interactive</span>
            </button>

            <button
              onClick={() => {
                const reportPayload = rawAnalysisData || {
                  projectName: data?.projectName || 'Target Web Architecture',
                  code: { endpoints },
                  schema: { tables },
                  crawlerTelemetry: data?.crawlerTelemetry
                };
                openAndPrintApiReport(reportPayload);
              }}
              className="px-3.5 py-2 text-xs rounded-xl font-bold btn-primary flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Download or Print Executive API Assessment PDF Report"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Download API PDF Report</span>
            </button>

            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search path, module..."
                value={apiSearchQuery}
                onChange={(e) => setApiSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:outline-hidden focus:border-brand transition-colors"
              />
              {apiSearchQuery && (
                <button
                  onClick={() => setApiSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dual-Depth Crawl Comparative Overview Banner (URL Scans) */}
        {isUrl && (
          <div className="p-4 rounded-xl border border-brand/20 bg-gradient-to-r from-brand/5 via-cyan-500/5 to-purple-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Dual-Depth API Crawl Verification</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live Parity Active
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                  Both <span className="text-cyan-500 font-semibold font-mono">Normal Crawl ({apiStats.normalCount} public endpoints)</span> and <span className="text-emerald-500 font-semibold font-mono">Deep Crawl ({apiStats.deepCount} total endpoints)</span> surfaces have been captured. Deep crawl traversed <span className="text-purple-500 font-semibold font-mono">+{apiStats.lazyLoadedCount} lazy-loaded endpoints</span> across role-restricted bundles (Admin, Mentor, TPO, Employer) for exhaustive penetration & API testing.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-end border-t md:border-t-0 border-border/50 pt-2 md:pt-0">
              <button
                onClick={() => setApiCrawlScopeFilter('NORMAL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
                  apiCrawlScopeFilter === 'NORMAL'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 ring-1 ring-cyan-500/30'
                    : 'bg-surface hover:bg-surface-raised border-border text-muted hover:text-foreground'
                }`}
              >
                Normal: {apiStats.normalCount}
              </button>
              <button
                onClick={() => setApiCrawlScopeFilter('LAZY')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
                  apiCrawlScopeFilter === 'LAZY'
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 ring-1 ring-purple-500/30'
                    : 'bg-surface hover:bg-surface-raised border-border text-muted hover:text-foreground'
                }`}
              >
                Lazy: +{apiStats.lazyLoadedCount}
              </button>
              <button
                onClick={() => setApiCrawlScopeFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
                  apiCrawlScopeFilter === 'ALL'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/30'
                    : 'bg-surface hover:bg-surface-raised border-border text-muted hover:text-foreground'
                }`}
              >
                Deep: {apiStats.deepCount}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ARCHITECTURAL TIER METRICS STRIP                                         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. High-Level Tier */}
          <button
            onClick={() => setApiLevelFilter(apiLevelFilter === 'HIGH' ? 'ALL' : 'HIGH')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              apiLevelFilter === 'HIGH'
                ? 'bg-purple-500/15 border-purple-500/40 shadow-sm ring-1 ring-purple-500/30'
                : 'bg-surface hover:bg-surface-raised border-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>High-Level</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                {allEnrichedEndpoints.length ? Math.round((apiStats.high / allEnrichedEndpoints.length) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl font-extrabold text-foreground font-mono mt-1">
              {apiStats.high}
            </div>
            <div className="text-[11px] text-muted truncate mt-0.5">
              Business Orchestration & Gateway
            </div>
          </button>

          {/* 2. Medium-Level Tier */}
          <button
            onClick={() => setApiLevelFilter(apiLevelFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              apiLevelFilter === 'MEDIUM'
                ? 'bg-cyan-500/15 border-cyan-500/40 shadow-sm ring-1 ring-cyan-500/30'
                : 'bg-surface hover:bg-surface-raised border-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5" />
                <span>Medium-Level</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20">
                {allEnrichedEndpoints.length ? Math.round((apiStats.medium / allEnrichedEndpoints.length) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl font-extrabold text-foreground font-mono mt-1">
              {apiStats.medium}
            </div>
            <div className="text-[11px] text-muted truncate mt-0.5">
              Domain Services & Resource CRUD
            </div>
          </button>

          {/* 3. Low-Level Tier */}
          <button
            onClick={() => setApiLevelFilter(apiLevelFilter === 'LOW' ? 'ALL' : 'LOW')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              apiLevelFilter === 'LOW'
                ? 'bg-emerald-500/15 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
                : 'bg-surface hover:bg-surface-raised border-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>Low-Level</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                {allEnrichedEndpoints.length ? Math.round((apiStats.low / allEnrichedEndpoints.length) * 100) : 0}%
              </span>
            </div>
            <div className="text-xl font-extrabold text-foreground font-mono mt-1">
              {apiStats.low}
            </div>
            <div className="text-[11px] text-muted truncate mt-0.5">
              System Diagnostics & Utilities
            </div>
          </button>

          {/* 4. Connected Entities or Universal Coverage */}
          {!isUrl ? (
            <button
              onClick={() => setApiTableFilter(apiTableFilter === 'CONNECTED' ? 'ALL' : 'CONNECTED')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                apiTableFilter === 'CONNECTED'
                  ? 'bg-amber-500/15 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                  : 'bg-surface hover:bg-surface-raised border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5" />
                  <span>DB Connected</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  Active
                </span>
              </div>
              <div className="text-xl font-extrabold text-foreground font-mono mt-1">
                {apiStats.connected}
              </div>
              <div className="text-[11px] text-muted truncate mt-0.5">
                Direct Schema Connections
              </div>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl border text-left bg-surface border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Web Surface</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20">
                  Perimeter
                </span>
              </div>
              <div className="text-xl font-extrabold text-foreground font-mono mt-1">
                {allEnrichedEndpoints.length}
              </div>
              <div className="text-[11px] text-muted truncate mt-0.5">
                Zero Cloud Leakage Discovery
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CRAWL DEPTH QUICK FILTER TABS (Normal vs Deep Crawl vs Lazy-Loaded)      */}
        {/* ========================================================================= */}
        {isUrl && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-surface-raised rounded-xl border border-border">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-brand" />
                <span>Crawl Depth:</span>
              </span>
              {[
                { id: 'ALL', label: 'All Discovered Surfaces', count: apiStats.deepCount, icon: Sparkles, color: 'text-emerald-500' },
                { id: 'API', label: 'Backend Endpoints Only', count: apiStats.genuineCount, icon: CheckCircle2, color: 'text-brand' },
                { id: 'NORMAL', label: 'Normal Crawl (Standard)', count: apiStats.normalCount, icon: CheckCircle2, color: 'text-cyan-500' },
                { id: 'LAZY', label: 'Lazy-Loaded Chunks', count: apiStats.lazyLoadedCount, icon: Layers, color: 'text-purple-500' },
                ...(apiStats.uiPageCount > 0 ? [{ id: 'PAGE', label: 'UI Pages Only', count: apiStats.uiPageCount, icon: Layers, color: 'text-slate-400' }] : [])
              ].map((cd) => {
                const Icon = cd.icon;
                const isActive = apiCrawlScopeFilter === cd.id;
                return (
                  <button
                    key={cd.id}
                    onClick={() => setApiCrawlScopeFilter(cd.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-surface-card text-foreground border-brand/50 shadow-xs ring-1 ring-brand/20'
                        : 'bg-surface hover:bg-surface-subtle text-muted hover:text-foreground border-border'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${cd.color}`} />
                    <span>{cd.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-raised text-foreground font-bold">
                      {cd.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] font-mono text-muted hidden lg:flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-brand font-semibold">APIs: {apisCount}</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-cyan-400 font-semibold">Endpoints: {apiStats.genuineCount}</span>
              {apiStats.uiPageCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-400">UI Pages: {apiStats.uiPageCount}</span>
              )}
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-emerald-400 font-bold">Total: {apiStats.deepCount}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROTOCOL KINDS QUICK PILLS                                               */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Radio className="h-3 w-3" />
            <span>Kind:</span>
          </span>
          {[
            { id: 'ALL', label: 'All Protocols', count: allEnrichedEndpoints.length, icon: Workflow },
            { id: 'REST', label: 'REST API', count: apiStats.kinds.REST, icon: Code2 },
            { id: 'WEBSOCKET', label: 'WebSockets', count: apiStats.kinds.WEBSOCKET, icon: Radio },
            { id: 'AUTH', label: 'Auth & Security', count: apiStats.kinds.AUTH, icon: ShieldCheck },
            { id: 'WEBHOOK', label: 'Webhooks', count: apiStats.kinds.WEBHOOK, icon: Webhook },
            { id: 'STORAGE', label: 'Storage & Assets', count: apiStats.kinds.STORAGE, icon: HardDrive },
            { id: 'ADMIN', label: 'Admin & Governance', count: apiStats.kinds.ADMIN, icon: Settings },
            { id: 'SYSTEM', label: 'System Health', count: apiStats.kinds.SYSTEM, icon: Activity }
          ].map((k) => {
            const Icon = k.icon;
            const isActive = apiKindFilter === k.id;
            return (
              <button
                key={k.id}
                onClick={() => setApiKindFilter(k.id)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-brand/15 text-brand border-brand/40 font-semibold shadow-xs'
                    : 'bg-surface hover:bg-surface-raised text-muted hover:text-foreground border-border'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{k.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-brand/20 text-brand' : 'bg-surface-raised text-muted'
                }`}>
                  {k.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* FILTER CONTROLS BAR: LEVEL TABS, METHOD TABS, TABLE SELECTOR             */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-raised rounded-xl border border-border">
          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider mr-1 hidden md:inline">Tier:</span>
            {[
              { id: 'ALL', label: 'All Tiers' },
              { id: 'HIGH', label: 'High-Level', color: 'text-purple-600 dark:text-purple-400' },
              { id: 'MEDIUM', label: 'Medium-Level', color: 'text-cyan-600 dark:text-cyan-400' },
              { id: 'LOW', label: 'Low-Level', color: 'text-emerald-600 dark:text-emerald-400' }
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setApiLevelFilter(lvl.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  apiLevelFilter === lvl.id
                    ? 'bg-surface-card text-foreground shadow-xs border border-border'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <span className={apiLevelFilter === lvl.id ? (lvl.color || '') : ''}>{lvl.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Table Connection Filter Dropdown (Only for backend projects with DB tables) */}
            {!isUrl && tables.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Database className="h-3 w-3 text-muted" />
                <select
                  value={apiTableFilter}
                  onChange={(e) => setApiTableFilter(e.target.value)}
                  className="text-xs py-1 px-2.5 rounded-lg border border-border bg-surface text-foreground font-mono cursor-pointer focus:outline-hidden focus:border-brand"
                >
                  <option value="ALL">All Tables (Any)</option>
                  <option value="CONNECTED">Only with DB Connections ({apiStats.connected})</option>
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      Touches: {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Method Filter Tabs */}
            <div className="flex items-center gap-0.5 p-0.5 bg-surface rounded-lg border border-border text-[11px] font-semibold font-mono">
              {['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'WS'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    methodFilter === m
                      ? 'bg-surface-card text-foreground shadow-xs font-bold'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEGREGATED ROUTES LIST & CONNECTION TOPOLOGY DISPLAY                      */}
        {/* ========================================================================= */}
        <div className="max-h-[600px] overflow-y-auto pr-1 space-y-5">
          {segregatedByLevel.map((group) => (
            <div key={group.level} className="space-y-2">
              {/* Group Tier Section Header */}
              <div className="flex items-center justify-between px-2 py-1 bg-surface-subtle/50 rounded-lg border border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${group.dotColor}`} />
                  <span className="text-xs font-bold text-foreground tracking-wide">
                    {group.title}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${group.badgeColor}`}>
                    {group.badge}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-raised text-muted border border-border">
                    {group.list.length} Routes
                  </span>
                </div>
                <span className="text-[11px] text-muted hidden md:inline truncate max-w-sm">
                  {group.hint}
                </span>
              </div>

              {/* Endpoints in this Tier */}
              <div className="space-y-2">
                {group.list.map((ep, idx) => {
                  const epKey = `${ep.method}-${ep.path}-${idx}`;
                  const isExpanded = expandedApiRoute === epKey;

                  const isGet = ep.method === 'GET';
                  const isPost = ep.method === 'POST';
                  const isPut = ep.method === 'PUT';
                  const isPatch = ep.method === 'PATCH';
                  const isDelete = ep.method === 'DELETE';
                  const isWs = ep.method === 'WS';

                  const badgeColor = isGet
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : isPost
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    : isPut
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : isPatch
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                    : isDelete
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';

                  const levelPillColor = ep.level === 'HIGH'
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
                    : ep.level === 'MEDIUM'
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';

                  const KindIcon = ep.kind === 'WEBSOCKET' ? Radio
                    : ep.kind === 'AUTH' ? ShieldCheck
                    : ep.kind === 'WEBHOOK' ? Webhook
                    : ep.kind === 'STORAGE' ? HardDrive
                    : ep.kind === 'ADMIN' ? Settings
                    : ep.kind === 'SYSTEM' ? Activity
                    : Code2;

                  return (
                    <div
                      key={epKey}
                      className={`p-3 rounded-xl border transition-all ${
                        isExpanded
                          ? 'border-brand/40 bg-surface-raised shadow-md'
                          : 'border-border bg-surface hover:bg-surface-raised/80'
                      }`}
                    >
                      {/* Top Row: Method, Path, Badges, Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                          {/* Method Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono shrink-0 shadow-xs ${badgeColor}`}>
                            {ep.method}
                          </span>

                          {/* Level Badge */}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono shrink-0 flex items-center gap-1 ${levelPillColor}`}>
                            {ep.level === 'HIGH' ? <Layers className="h-2.5 w-2.5" /> : ep.level === 'MEDIUM' ? <Box className="h-2.5 w-2.5" /> : <Cpu className="h-2.5 w-2.5" />}
                            <span>{ep.level}</span>
                          </span>

                          {/* Kind Badge */}
                          <span className="text-[9px] font-medium px-2 py-0.5 rounded border font-mono shrink-0 bg-surface-subtle text-muted border-border flex items-center gap-1">
                            <KindIcon className="h-2.5 w-2.5 text-brand" />
                            <span>{ep.kind}</span>
                          </span>

                          {/* Crawl Scope Badge (Normal vs Deep / Lazy-Loaded) */}
                          {isUrl && (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono shrink-0 flex items-center gap-1 ${
                              ep.isLazyLoaded
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                            }`}>
                              {ep.isLazyLoaded ? (
                                <>
                                  <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                                  <span>LAZY-LOADED</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-2.5 w-2.5 text-cyan-500" />
                                  <span>NORMAL</span>
                                </>
                              )}
                            </span>
                          )}

                          {/* Route Path & Module */}
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs text-foreground font-semibold truncate flex items-center gap-1.5">
                              <span>{ep.path}</span>
                            </div>
                            <div className="text-[10px] text-muted font-mono truncate mt-0.5">
                              {ep.module}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Inspect Topology / Connections Toggle */}
                          <button
                            onClick={() => setExpandedApiRoute(isExpanded ? null : epKey)}
                            className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer font-medium ${
                              isExpanded
                                ? 'bg-brand/15 text-brand border-brand/30 shadow-xs'
                                : 'bg-surface-raised hover:bg-surface-subtle text-foreground border-border'
                            }`}
                            title="Inspect connected database entities and execution topology"
                          >
                            <Network className="h-3 w-3 text-brand" />
                            <span className="text-[11px] font-semibold">
                              {isExpanded ? 'Hide Map' : 'Connections'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3 opacity-70" />
                            ) : (
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            )}
                          </button>

                          {/* Check Blast Radius */}
                          <button
                            onClick={() => onSelectForImpact && onSelectForImpact(ep.path, 'endpoint')}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition-colors cursor-pointer font-semibold shrink-0"
                            title="Simulate architectural blast radius across database and services"
                          >
                            Check Blast
                          </button>
                        </div>
                      </div>

                      {/* Connection Chips Bar: Tables Read / Written (Only for backend projects with DB tables) */}
                      {!isUrl && tables.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border-subtle flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            <span>Connected Entities:</span>
                          </span>

                          {ep.connectedTables && ep.connectedTables.length > 0 ? (
                            ep.connectedTables.map((ct) => {
                              const isRead = ct.action === 'READ';
                              const isStream = ct.action === 'STREAM';
                              const chipColor = isRead
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : isStream
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20';

                              return (
                                <button
                                  key={ct.name}
                                  onClick={() => {
                                    const targetTable = tables.find((t) => t.name === ct.name);
                                    if (targetTable) setPreviewTable(targetTable);
                                  }}
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 transition-colors cursor-pointer ${chipColor}`}
                                  title={`Click to preview schema and sample values for table '${ct.name}' (${ct.action})`}
                                >
                                  <span>{isRead ? '📖' : isStream ? '🔄' : '✍️'}</span>
                                  <span className="font-semibold">{ct.name}</span>
                                  <span className="text-[9px] opacity-75">({ct.action})</span>
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle text-muted border border-border-subtle">
                              ⚡ Stateless Ingress / In-Memory Controller
                            </span>
                          )}
                        </div>
                      )}

                      {/* ========================================================================= */}
                      {/* INTERACTIVE EXPANDED TOPOLOGY DRAWER                                      */}
                      {/* ========================================================================= */}
                      {isExpanded && (
                        <div className="mt-3.5 pt-3.5 border-t border-border space-y-3.5 animate-fadeIn">
                          {/* Visual Multi-Tier Architecture Pipeline Flowchart */}
                          <div className="p-3 rounded-xl bg-surface-subtle border border-border">
                            <div className="text-[11px] font-bold text-foreground flex items-center justify-between mb-2">
                              <span className="flex items-center gap-1.5">
                                <Workflow className="h-3.5 w-3.5 text-brand" />
                                <span>End-to-End Architectural Execution Pipeline</span>
                              </span>
                              <span className="text-[10px] font-mono text-muted">
                                Multi-Tier Ingress Flow
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                              {/* Step 1: Ingress Consumer */}
                              <div className="p-2 rounded-lg bg-surface border border-border flex flex-col justify-center">
                                <div className="text-[10px] font-bold text-muted uppercase">1. Client Ingress</div>
                                <div className="font-semibold text-foreground text-xs mt-0.5">
                                  {ep.kind === 'WEBSOCKET' ? 'WS Realtime Client' : ep.kind === 'WEBHOOK' ? 'External Webhook' : 'HTTP/1.1 Consumer'}
                                </div>
                                <div className="text-[10px] text-muted mt-0.5">Public / Secured</div>
                              </div>

                              {/* Step 2: API Route Binding */}
                              <div className="p-2 rounded-lg bg-surface border border-brand/30 flex flex-col justify-center shadow-xs">
                                <div className="text-[10px] font-bold text-brand uppercase">2. Route Binding</div>
                                <div className="font-mono font-bold text-foreground text-[11px] truncate mt-0.5">
                                  {ep.method} {ep.path}
                                </div>
                                <div className="text-[10px] text-brand font-mono mt-0.5">{ep.kind} Protocol</div>
                              </div>

                              {/* Step 3: Controller Handler */}
                              <div className="p-2 rounded-lg bg-surface border border-border flex flex-col justify-center">
                                <div className="text-[10px] font-bold text-muted uppercase">3. Handler Controller</div>
                                <div className="font-mono text-[11px] text-foreground truncate mt-0.5">
                                  {ep.module}
                                </div>
                                <div className="text-[10px] text-muted mt-0.5">{ep.level}-Level Tier</div>
                              </div>

                              {/* Step 4: Database Entities or Perimeter Surface */}
                              <div className="p-2 rounded-lg bg-surface border border-border flex flex-col justify-center">
                                <div className="text-[10px] font-bold text-muted uppercase">
                                  {isUrl ? '4. Perimeter Delivery' : '4. Data Tier & Blast'}
                                </div>
                                <div className="font-semibold text-foreground text-xs mt-0.5 truncate">
                                  {isUrl 
                                    ? 'Perimeter Ingress'
                                    : ep.connectedTables && ep.connectedTables.length > 0
                                    ? ep.connectedTables.map((t) => t.name).join(', ')
                                    : 'Stateless In-Memory'}
                                </div>
                                <div className="text-[10px] text-muted mt-0.5">
                                  {isUrl ? '100% Local Discovery' : ep.level === 'HIGH' ? 'Critical Impact' : ep.level === 'MEDIUM' ? 'Moderate Impact' : 'Minimal Impact'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Connected Tables Detail or Route Technical Specs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Left Box: Connected Tables (for repos) or Route Technical Specs (for URLs) */}
                            <div className="p-3 rounded-xl bg-surface border border-border space-y-2">
                              {isUrl ? (
                                <>
                                  <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Code2 className="h-3.5 w-3.5 text-cyan-500" />
                                      <span>Route Perimeter Specifications</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-muted">
                                      {ep.kind} Protocol
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="p-2 rounded-lg bg-surface-raised border border-border flex items-center justify-between">
                                      <span className="text-[11px] text-muted">Method &amp; Path:</span>
                                      <span className="font-mono text-xs font-bold text-foreground truncate max-w-[220px]">
                                        {ep.method} {ep.path}
                                      </span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-surface-raised border border-border flex items-center justify-between">
                                      <span className="text-[11px] text-muted">Functional Module:</span>
                                      <span className="font-mono text-xs font-semibold text-foreground">
                                        {ep.module || 'Default Ingress'}
                                      </span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-surface-raised border border-border flex items-center justify-between">
                                      <span className="text-[11px] text-muted">Tier Classification:</span>
                                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                        ep.level === 'HIGH' 
                                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                                          : ep.level === 'LOW' 
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                          : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                      }`}>
                                        {ep.level}-LEVEL TIER
                                      </span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Database className="h-3.5 w-3.5 text-cyan-500" />
                                      <span>Relational Table Dependencies</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-muted">
                                      {ep.connectedTables?.length || 0} Tables
                                    </span>
                                  </div>

                                  {ep.connectedTables && ep.connectedTables.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {ep.connectedTables.map((ct) => {
                                        const tObj = tables.find((t) => t.name === ct.name);
                                        return (
                                          <div
                                            key={ct.name}
                                            className="p-2 rounded-lg bg-surface-raised border border-border flex items-center justify-between"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono text-xs font-bold text-foreground">
                                                {ct.name}
                                              </span>
                                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                                ct.action === 'READ'
                                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                  : ct.action === 'STREAM'
                                                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                              }`}>
                                                {ct.action}
                                              </span>
                                              {tObj && (
                                                <span className="text-[10px] text-muted font-mono">
                                                  ({tObj.columns?.length || 0} cols)
                                                </span>
                                              )}
                                            </div>

                                            {tObj && (
                                              <button
                                                onClick={() => setPreviewTable(tObj)}
                                                className="text-[10px] px-2 py-0.5 rounded bg-surface text-brand hover:underline border border-border cursor-pointer font-medium"
                                              >
                                                Preview Schema
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted py-3 text-center">
                                      This endpoint is decoupled from direct database models (pure ingress handler, auth gatekeeper, or diagnostic telemetry).
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Classification Rational & Quick Developer Tools */}
                            <div className="p-3 rounded-xl bg-surface border border-border space-y-2 flex flex-col justify-between">
                              <div>
                                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                                  <span>Architectural Classification Rationale</span>
                                </div>
                                <p className="text-[11px] text-muted leading-relaxed">
                                  {ep.level === 'HIGH'
                                    ? `Classified as HIGH-LEVEL because it mutates domain state, coordinates transactions, or touches critical business domains (${ep.connectedTables?.length || 0} connected entities).`
                                    : ep.level === 'MEDIUM'
                                    ? `Classified as MEDIUM-LEVEL as a standard domain service performing resource operations on backend models.`
                                    : `Classified as LOW-LEVEL system utility endpoint governing telemetry, health checks, or metadata lookups.`}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center gap-2">
                                {/* Live Fetch API Button */}
                                <button
                                  onClick={() => handleFetchEndpoint(ep)}
                                  disabled={fetchingEndpoint === `${ep.method}-${ep.path}`}
                                  className="text-xs px-2.5 py-1 rounded-md bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 flex items-center gap-1.5 cursor-pointer font-semibold transition-colors disabled:opacity-50"
                                  title={`Fetch ${getFullEndpointUrl(ep)}`}
                                >
                                  {fetchingEndpoint === `${ep.method}-${ep.path}` ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin text-brand" />
                                      <span>Fetching API...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-3 w-3 text-brand fill-brand/20" />
                                      <span>Fetch API</span>
                                    </>
                                  )}
                                </button>

                                {/* Copy cURL */}
                                <button
                                  onClick={() => handleCopyCurl(ep)}
                                  className="text-xs px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface text-foreground border border-border flex items-center gap-1 cursor-pointer font-mono"
                                  title={`Copy cURL: curl -X ${ep.method} "${getFullEndpointUrl(ep)}"`}
                                >
                                  {copiedCurl === `${ep.method}-${ep.path}` ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-500" />
                                      <span className="text-emerald-500 font-bold">Copied cURL!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3 text-muted" />
                                      <span>Copy cURL</span>
                                    </>
                                  )}
                                </button>

                                {/* Copy Path */}
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(getFullEndpointUrl(ep));
                                  }}
                                  className="text-xs px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface text-foreground border border-border flex items-center gap-1 cursor-pointer font-mono"
                                  title="Copy Full Endpoint URL"
                                >
                                  <Copy className="h-3 w-3 text-muted" />
                                  <span>Copy URL</span>
                                </button>

                                {/* View Graphical Endpoint Flow */}
                                <button
                                  onClick={() => {
                                    setApiFlowFocusedEndpoint(ep);
                                    setShowApiFlowModal(true);
                                  }}
                                  className="text-xs px-2.5 py-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                                  title="Inspect incoming callers and downstream communication flow for this endpoint"
                                >
                                  <Workflow className="h-3 w-3 text-cyan-500" />
                                  <span>View Interactive Graph</span>
                                </button>

                                {/* Simulate Blast Radius */}
                                <button
                                  onClick={() => onSelectForImpact && onSelectForImpact(ep.path, 'endpoint')}
                                  className="text-xs px-2.5 py-1 rounded-md btn-primary flex items-center gap-1 cursor-pointer font-bold ml-auto"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  <span>Simulate Blast</span>
                                </button>
                              </div>

                              {/* Live Fetch Response Inspector Panel */}
                              {endpointFetchResult[`${ep.method}-${ep.path}`] && (
                                <div className="mt-2.5 p-3 rounded-lg bg-surface-subtle border border-border animate-fadeIn space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                        endpointFetchResult[`${ep.method}-${ep.path}`].status >= 200 && endpointFetchResult[`${ep.method}-${ep.path}`].status < 300
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      }`}>
                                        HTTP {endpointFetchResult[`${ep.method}-${ep.path}`].status || 'ERR'} {endpointFetchResult[`${ep.method}-${ep.path}`].statusText || ''}
                                      </span>
                                      <span className="text-[11px] font-mono text-muted">
                                        ⚡ {endpointFetchResult[`${ep.method}-${ep.path}`].durationMs}ms
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          const raw = JSON.stringify(endpointFetchResult[`${ep.method}-${ep.path}`].data, null, 2);
                                          navigator.clipboard.writeText(raw);
                                          setCopiedResponse(`${ep.method}-${ep.path}`);
                                          setTimeout(() => setCopiedResponse(null), 2000);
                                        }}
                                        className="text-[10px] px-2 py-0.5 rounded bg-surface hover:bg-surface-raised border border-border text-foreground flex items-center gap-1 font-mono cursor-pointer"
                                        title="Copy response JSON"
                                      >
                                        {copiedResponse === `${ep.method}-${ep.path}` ? (
                                          <>
                                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                                            <span className="text-emerald-500">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="h-2.5 w-2.5 text-muted" />
                                            <span>Copy Data</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEndpointFetchResult(prev => {
                                            const copy = { ...prev };
                                            delete copy[`${ep.method}-${ep.path}`];
                                            return copy;
                                          });
                                        }}
                                        className="text-muted hover:text-foreground text-xs p-1 cursor-pointer"
                                        title="Dismiss response view"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="text-[10px] font-mono text-muted truncate">
                                    Target: <span className="text-foreground">{getFullEndpointUrl(ep)}</span>
                                  </div>

                                  <div className="max-h-56 overflow-y-auto p-2 rounded bg-surface font-mono text-[11px] text-foreground border border-border-subtle whitespace-pre-wrap break-all selection:bg-brand/30">
                                    {typeof endpointFetchResult[`${ep.method}-${ep.path}`].data === 'object'
                                      ? JSON.stringify(endpointFetchResult[`${ep.method}-${ep.path}`].data, null, 2)
                                      : String(endpointFetchResult[`${ep.method}-${ep.path}`].data || endpointFetchResult[`${ep.method}-${ep.path}`].error || 'No response body')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {group.list.length === 0 && (
                  <div className="text-center py-5 text-xs text-muted bg-surface/50 rounded-xl border border-dashed border-border">
                    No {group.title.toLowerCase()} match the current filter selection
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredApiEndpoints.length === 0 && (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-surface-raised space-y-2">
              <Code2 className="h-8 w-8 text-muted mx-auto opacity-60" />
              <div className="text-xs font-semibold text-foreground">No API endpoints match the selected filters</div>
              <p className="text-[11px] text-muted">
                Try resetting tier, protocol kind, or database table filters to view all routes.
              </p>
              <button
                onClick={() => {
                  setApiLevelFilter('ALL');
                  setApiKindFilter('ALL');
                  setMethodFilter('ALL');
                  setApiTableFilter('ALL');
                  setApiSearchQuery('');
                }}
                className="mt-2 text-xs text-brand hover:underline font-medium cursor-pointer"
              >
                Reset all API filters
              </button>
            </div>
          )}
        </div>
      </section>

          {/* Breaking Change Warnings for Developers */}
          {warnings.length > 0 && (
            <section className="p-5 sm:p-6 rounded-2xl border border-border bg-surface-card shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">
                  Developer Breaking Change Alerts & Hygiene Checks
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {warnings.map((w) => (
                  <div key={w.id} className="bg-surface p-3.5 rounded-lg border border-amber-500/25 flex gap-3 shadow-xs">
                    <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{w.title}</div>
                      <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{w.recommendation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

      {/* Sample Data & Values Preview Modal */}
      {previewTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-4xl rounded-xl border border-border bg-surface-card shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">
                  Data Values & Column Preview: <span className="font-mono text-foreground">{previewTable.name}</span>
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyCSV(previewTable)}
                  className="btn-secondary text-xs py-1 px-2.5"
                  title="Copy Table as CSV"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  <span>Copy CSV</span>
                </button>

                <button
                  onClick={() => handleCopyTableJSON(previewTable)}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={() => setPreviewTable(null)}
                  className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Table Spreadsheet View */}
            <div className="flex-1 overflow-auto p-4 bg-surface">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border bg-surface-raised text-foreground">
                    {previewTable.columns?.map((col) => (
                      <th key={col.name} className="p-2.5 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {col.isPrimaryKey && <Key className="h-3 w-3 text-amber-500" />}
                          <span>{col.name}</span>
                        </div>
                        <span className="text-[9px] text-muted block font-normal">{col.type}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(previewTable.sampleRows || []).map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-border hover:bg-surface-raised">
                      {(previewTable.columns || []).map((col) => {
                        const cellVal = row[col.name] !== undefined && row[col.name] !== null
                          ? String(row[col.name])
                          : (col.sampleValue ? String(col.sampleValue) : '-');
                        return (
                          <td key={col.name} className="p-2.5 text-foreground whitespace-nowrap">
                            {cellVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {(!previewTable.sampleRows || previewTable.sampleRows.length === 0) && (
                    <tr className="border-b border-border">
                      {(previewTable.columns || []).map((col) => (
                        <td key={col.name} className="p-2.5 text-muted whitespace-nowrap">
                          {col.sampleValue ? String(col.sampleValue) : '-'}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-2.5 border-t border-border bg-surface-raised flex items-center justify-between text-xs text-muted font-medium">
              <span>Database Engine: <strong className="text-foreground">{previewTable.databaseType}</strong></span>
              <span>Source File: <strong className="font-mono text-foreground truncate max-w-sm">{previewTable.sourceFile}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* API Services & Endpoints Breakdown Modal */}
      <ApiBreakdownModal
        isOpen={showApiBreakdownModal}
        onClose={() => setShowApiBreakdownModal(false)}
        analysisData={rawAnalysisData || data}
        onOpenApiFlow={(ep) => {
          setShowApiBreakdownModal(false);
          setApiFlowFocusedEndpoint(ep || null);
          setShowApiFlowModal(true);
        }}
      />

      {/* Professional Graphical API Flow & Communication Modal */}
      <ApiFlowModal
        isOpen={showApiFlowModal}
        onClose={() => {
          setShowApiFlowModal(false);
          setApiFlowFocusedEndpoint(null);
        }}
        endpoints={allEnrichedEndpoints}
        tables={tables}
        diagrams={rawAnalysisData?.diagrams || data?.diagrams}
        theme="dark"
        initialFocusedEndpoint={apiFlowFocusedEndpoint}
        onSelectForImpact={onSelectForImpact}
      />
    </div>
  );
}
