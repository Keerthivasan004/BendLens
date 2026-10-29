'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Layers, Search, Filter, Copy, Check, Terminal,
  ChevronDown, ChevronUp, ArrowUpDown, Key, Users,
  ShoppingBag, Package, CreditCard, Shield, Activity,
  Globe, Code, HardDrive, Webhook, Zap, Radio, FileCode,
  Sparkles, ExternalLink, Box, Workflow
} from 'lucide-react';
import { getApiEndpointsBreakdown } from '@/lib/apiBreakdownHelper';

function getApiIcon(api) {
  const name = (api.name || '').toLowerCase();
  const rawKey = (api.rawKey || '').toLowerCase();

  if (name.includes('auth') || rawKey.includes('auth') || rawKey.includes('login')) return Key;
  if (name.includes('user') || rawKey.includes('user') || name.includes('profile')) return Users;
  if (name.includes('order') || rawKey.includes('order') || name.includes('cart') || rawKey.includes('cart')) return ShoppingBag;
  if (name.includes('product') || rawKey.includes('product') || name.includes('catalog')) return Package;
  if (name.includes('payment') || rawKey.includes('payment') || name.includes('billing') || name.includes('invoice')) return CreditCard;
  if (name.includes('admin') || rawKey.includes('admin') || name.includes('governance')) return Shield;
  if (name.includes('health') || rawKey.includes('health') || name.includes('ping') || name.includes('status')) return Activity;
  if (name.includes('wordpress') || rawKey.includes('wp')) return Globe;
  if (name.includes('storage') || rawKey.includes('storage') || name.includes('file')) return HardDrive;
  if (name.includes('webhook') || rawKey.includes('webhook')) return Webhook;
  if (name.includes('graphql') || rawKey.includes('graphql')) return Zap;
  if (name.includes('websocket') || rawKey.includes('ws')) return Radio;

  return Code;
}

export default function ApiBreakdownModal({ isOpen, onClose, analysisData, onOpenApiFlow }) {
  const [mounted, setMounted] = useState(false);
  const [groupBy, setGroupBy] = useState('auto'); // 'auto' | 'subdomain' | 'domain' | 'resource' | 'controller' | 'kind'
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('count_desc'); // 'count_desc' | 'count_asc' | 'name_asc'
  const [expandedApiIds, setExpandedApiIds] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute breakdown based on current groupBy strategy
  const breakdown = useMemo(() => {
    return getApiEndpointsBreakdown(analysisData, groupBy);
  }, [analysisData, groupBy]);

  // Auto-expand first 2 APIs by default on initial load
  useEffect(() => {
    if (breakdown.apis.length > 0) {
      setExpandedApiIds(new Set(breakdown.apis.slice(0, 3).map((a) => a.id)));
    }
  }, [breakdown.apis]);

  // Filter & sort APIs
  const filteredApis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return breakdown.apis
      .map((api) => {
        // Filter endpoints inside this API by search & method
        const matchingEndpoints = api.endpoints.filter((ep) => {
          const matchesMethod = methodFilter === 'ALL' || ep.method === methodFilter;
          const matchesQuery = !q ||
            api.name.toLowerCase().includes(q) ||
            ep.path.toLowerCase().includes(q) ||
            ep.method.toLowerCase().includes(q) ||
            (ep.handler && ep.handler.toLowerCase().includes(q)) ||
            (ep.module && ep.module.toLowerCase().includes(q)) ||
            (ep.summary && ep.summary.toLowerCase().includes(q));

          return matchesMethod && matchesQuery;
        });

        const apiMatchesDirectly = !q || api.name.toLowerCase().includes(q) || api.badge.toLowerCase().includes(q);

        if (matchingEndpoints.length === 0 && !apiMatchesDirectly) {
          return null;
        }

        // Return updated API with filtered endpoints for view
        return {
          ...api,
          displayEndpoints: matchingEndpoints.length > 0 ? matchingEndpoints : api.endpoints
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (sortBy === 'count_desc') return b.totalEndpoints - a.totalEndpoints;
        if (sortBy === 'count_asc') return a.totalEndpoints - b.totalEndpoints;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [breakdown.apis, searchQuery, methodFilter, sortBy]);

  if (!isOpen || !mounted) return null;

  const toggleExpand = (apiId) => {
    setExpandedApiIds((prev) => {
      const next = new Set(prev);
      if (next.has(apiId)) next.delete(apiId);
      else next.add(apiId);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedApiIds(new Set(filteredApis.map((a) => a.id)));
  };

  const handleCollapseAll = () => {
    setExpandedApiIds(new Set());
  };

  const handleCopyPath = (path, key) => {
    try {
      navigator.clipboard.writeText(path);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const handleCopyCurl = (ep, key) => {
    try {
      const curl = `curl -X ${ep.method} "${ep.path}"`;
      navigator.clipboard.writeText(curl);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-border bg-surface-raised/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 via-brand/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">
                  API Services & Endpoints Breakdown
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/25">
                  {breakdown.totalApisCount} Distinct APIs · {breakdown.totalEndpointsCount} Endpoints
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Exact mapping of which API has how many endpoints and all corresponding route definitions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenApiFlow && (
              <button
                onClick={() => {
                  onClose();
                  onOpenApiFlow();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border border-cyan-500/35 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs group"
                title="Open interactive visual API communication graph"
              >
                <Workflow className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />
                <span>View Interactive Graph</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Hero KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border bg-surface-subtle/50 px-2 py-2.5 shrink-0 text-xs">
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase font-semibold text-muted block">Discovered APIs</span>
            <div className="text-lg font-mono font-extrabold text-foreground mt-0.5">
              {breakdown.totalApisCount}
              <span className="text-[10px] font-sans font-normal text-muted ml-1.5">services</span>
            </div>
          </div>
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase font-semibold text-muted block">Total Endpoints</span>
            <div className="text-lg font-mono font-extrabold text-brand mt-0.5">
              {breakdown.totalEndpointsCount}
              <span className="text-[10px] font-sans font-normal text-muted ml-1.5">routes</span>
            </div>
          </div>
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase font-semibold text-muted block">Average Density</span>
            <div className="text-lg font-mono font-extrabold text-cyan-400 mt-0.5">
              {breakdown.averageEndpointsPerApi}
              <span className="text-[10px] font-sans font-normal text-muted ml-1.5">endpoints/API</span>
            </div>
          </div>
          <div className="px-3 py-1">
            <span className="text-[10px] uppercase font-semibold text-muted block">Largest Service</span>
            <div className="text-sm font-mono font-bold text-violet-400 truncate mt-0.5" title={breakdown.maxEndpointsApi?.name}>
              {breakdown.maxEndpointsApi?.name || 'N/A'}
              {breakdown.maxEndpointsApi && (
                <span className="text-[10px] font-normal text-muted ml-1">({breakdown.maxEndpointsApi.count})</span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-border bg-surface/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 text-xs">
          {/* Left: Grouping Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-muted font-medium mr-1 text-[11px] shrink-0">Group By:</span>
            {[
              { id: 'auto', label: 'Auto (Recommended)' },
              { id: 'subdomain', label: 'Subdomain / Host' },
              { id: 'domain', label: 'Role Domain / Portals' },
              { id: 'resource', label: 'API Resource / Service' },
              { id: 'controller', label: 'File / Controller' },
              { id: 'kind', label: 'Architectural Kind' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGroupBy(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border whitespace-nowrap cursor-pointer ${
                  groupBy === opt.id
                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-300 font-semibold shadow-xs'
                    : 'bg-surface hover:bg-surface-raised border-border text-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Right: Search + Method Filters + Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search API or endpoint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted focus:outline-hidden focus:border-brand font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-border bg-surface text-xs font-mono text-foreground focus:outline-hidden focus:border-brand cursor-pointer"
            >
              <option value="ALL">All Verbs</option>
              <option value="GET">GET Only</option>
              <option value="POST">POST Only</option>
              <option value="PUT">PUT Only</option>
              <option value="DELETE">DELETE Only</option>
            </select>

            {/* Expand / Collapse All */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleExpandAll}
                className="px-2 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-raised text-muted hover:text-foreground transition-colors cursor-pointer text-[11px]"
                title="Expand all API cards"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-raised text-muted hover:text-foreground transition-colors cursor-pointer text-[11px]"
                title="Collapse all API cards"
              >
                Collapse
              </button>
            </div>
          </div>
        </div>

        {/* Main Content: API Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y-0">
          {filteredApis.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-border bg-surface-subtle/30">
              <Layers className="h-8 w-8 mx-auto text-muted mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No APIs or Endpoints Match Criteria</p>
              <p className="text-xs text-muted mt-1">Try resetting the search query or HTTP method filter.</p>
              <button
                onClick={() => { setSearchQuery(''); setMethodFilter('ALL'); }}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredApis.map((api) => {
              const isExpanded = expandedApiIds.has(api.id);
              const Icon = getApiIcon(api);
              const endpointsToRender = api.displayEndpoints || api.endpoints;

              return (
                <div
                  key={api.id}
                  className="rounded-xl border border-border/80 bg-surface-raised/40 hover:border-border transition-all overflow-hidden shadow-xs"
                >
                  {/* API Card Header */}
                  <div
                    onClick={() => toggleExpand(api.id)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-surface-raised/80 transition-colors"
                  >
                    {/* Left: Icon + Name + Badge */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground hover:text-brand transition-colors truncate">
                            {api.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-surface border border-border text-muted truncate">
                            {api.badge}
                          </span>
                          {api.riskLevel && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-semibold ${
                              api.riskLevel === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                              api.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            }`}>
                              {api.riskLevel} IMPACT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted truncate mt-0.5">
                          {api.description || `${api.type} containing ${api.totalEndpoints} exposed operations`}
                        </div>
                      </div>
                    </div>

                    {/* Right: Counts + Method Distribution + Chevron */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {onOpenApiFlow && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onOpenApiFlow(api.endpoints?.[0]);
                          }}
                          className="px-2 py-1 rounded-md text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 flex items-center gap-1 cursor-pointer transition-colors"
                          title="View this API service cluster in the interactive graph"
                        >
                          <Workflow className="h-3 w-3 text-cyan-400" />
                          <span className="hidden sm:inline">Graph</span>
                        </button>
                      )}

                      {/* Endpoints Count Glow Pill */}
                      <div className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-violet-500/10 text-violet-300 border border-violet-500/30 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        <span>{api.totalEndpoints} {api.totalEndpoints === 1 ? 'Endpoint' : 'Endpoints'}</span>
                      </div>

                      {/* Method breakdown chips */}
                      <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono">
                        {api.methodCounts.GET > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {api.methodCounts.GET} GET
                          </span>
                        )}
                        {api.methodCounts.POST > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {api.methodCounts.POST} POST
                          </span>
                        )}
                        {api.methodCounts.PUT > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {api.methodCounts.PUT} PUT
                          </span>
                        )}
                        {api.methodCounts.DELETE > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {api.methodCounts.DELETE} DEL
                          </span>
                        )}
                      </div>

                      <div className="text-muted">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* API Card Expanded Content: Full Endpoints List */}
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-surface/60 p-3 sm:p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Endpoints in this API ({endpointsToRender.length}):</span>
                        <span className="text-[10px] font-normal lowercase">Click to copy route path or cURL command</span>
                      </div>

                      <div className="space-y-1.5">
                        {endpointsToRender.map((ep, idx) => {
                          const epKey = `${api.id}_${ep.method}_${ep.path}_${idx}`;
                          const isPathCopied = copiedKey === `path_${epKey}`;
                          const isCurlCopied = copiedKey === `curl_${epKey}`;

                          const methodColor =
                            ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                            ep.method === 'POST' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                            ep.method === 'PUT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                            ep.method === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                            'bg-cyan-500/10 text-cyan-400 border-cyan-500/25';

                          return (
                            <div
                              key={epKey}
                              className="p-2.5 rounded-lg bg-surface hover:bg-surface-raised border border-border/70 hover:border-border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs"
                            >
                              {/* Left: Method + Path + Handler */}
                              <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border uppercase shrink-0 ${methodColor}`}>
                                  {ep.method}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-foreground break-all select-all">
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
                                    {(ep.subdomain || (breakdown?.groupBy === 'subdomain' && api?.name ? api.name.replace(/\s*API$/i, '') : null)) && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-semibold shrink-0">
                                        <Globe className="h-2.5 w-2.5 shrink-0" />
                                        {ep.subdomain || api.name.replace(/\s*API$/i, '')}
                                      </span>
                                    )}
                                  </div>

                                  {(ep.handler || ep.module || ep.summary) && (
                                    <div className="text-[10px] text-muted font-mono truncate mt-0.5">
                                      {ep.handler ? `handler: ${ep.handler}` : (ep.module ? `file: ${ep.module}` : ep.summary)}
                                    </div>
                                  )}
                                  {onOpenApiFlow && (
                                    <button
                                      onClick={() => {
                                        onClose();
                                        onOpenApiFlow(ep);
                                      }}
                                      className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 text-[10px] font-mono text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Open interactive visual API graph focused on this endpoint"
                                    >
                                      <Workflow className="h-3 w-3" />
                                      <span>Graph</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Right: Quick Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                                <button
                                  onClick={() => handleCopyPath(ep.path, `path_${epKey}`)}
                                  className="px-2 py-1 rounded bg-surface-subtle border border-border hover:bg-surface-raised text-[10px] font-mono text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Copy relative route path"
                                >
                                  {isPathCopied ? (
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
                                  onClick={() => handleCopyCurl(ep, `curl_${epKey}`)}
                                  className="px-2 py-1 rounded bg-surface-subtle border border-border hover:bg-surface-raised text-[10px] font-mono text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Copy executable cURL command"
                                >
                                  {isCurlCopied ? (
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-raised/40 flex items-center justify-between text-xs text-muted shrink-0">
          <div>
            Showing <strong className="text-foreground font-mono">{filteredApis.length}</strong> of{' '}
            <strong className="text-foreground font-mono">{breakdown.totalApisCount}</strong> distinct APIs
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-raised text-foreground font-medium transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
