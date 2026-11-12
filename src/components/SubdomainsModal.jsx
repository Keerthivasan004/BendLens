'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Globe, Search, Copy, Check, ExternalLink,
  ShieldCheck, AlertCircle, Filter, ArrowUpDown,
  Download, Archive, Radio, Activity, Workflow
} from 'lucide-react';
import { getSubdomainsInventory } from '@/lib/subdomainsHelper';

export default function SubdomainsModal({ isOpen, onClose, analysisData }) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'LIVE' | 'HISTORICAL' | 'WITH_ENDPOINTS'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name_asc' | 'name_desc' | 'endpoints_desc'
  const [copiedKey, setCopiedKey] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(180);

  useEffect(() => {
    setVisibleCount(180);
  }, [searchQuery, statusTab, sortBy]);

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

  // Extract authoritative subdomains inventory
  const inventory = useMemo(() => {
    return getSubdomainsInventory(analysisData);
  }, [analysisData]);

  // Count subdomains with endpoints
  const withEndpointsCount = useMemo(() => {
    return inventory.allSubdomains.filter(s => (inventory.endpointCounts[s] || 0) > 0).length;
  }, [inventory]);

  // Filtered and sorted subdomains list
  const filteredSubdomains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = inventory.allSubdomains.filter((sub) => {
      const isLive = inventory.statusMap[sub] === 'live';
      const hasEndpoints = (inventory.endpointCounts[sub] || 0) > 0;

      if (statusTab === 'LIVE' && !isLive) return false;
      if (statusTab === 'HISTORICAL' && isLive) return false;
      if (statusTab === 'WITH_ENDPOINTS' && !hasEndpoints) return false;

      if (q && !sub.toLowerCase().includes(q)) return false;

      return true;
    });

    if (sortBy === 'name_asc') {
      list = [...list].sort((a, b) => a.localeCompare(b));
    } else if (sortBy === 'name_desc') {
      list = [...list].sort((a, b) => b.localeCompare(a));
    } else if (sortBy === 'endpoints_desc') {
      list = [...list].sort((a, b) => {
        const epA = inventory.endpointCounts[a] || 0;
        const epB = inventory.endpointCounts[b] || 0;
        if (epB !== epA) return epB - epA;
        return a.localeCompare(b);
      });
    }

    return list;
  }, [inventory, searchQuery, statusTab, sortBy]);

  if (!isOpen || !mounted) return null;

  const handleCopySingle = (sub, key) => {
    try {
      navigator.clipboard.writeText(sub);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const handleCopyAll = () => {
    try {
      const textToCopy = filteredSubdomains.join('\n');
      navigator.clipboard.writeText(textToCopy);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {}
  };

  const handleExportTxt = () => {
    try {
      const apex = inventory.apexDomain || 'subdomains';
      const lines = [
        `# BendLens Subdomain Architecture Inventory`,
        `# Apex Domain: ${apex}`,
        `# Total Discovered: ${inventory.counts.total}`,
        `# Live Active (DNS Verified): ${inventory.counts.live}`,
        `# Historical / OSINT Archive: ${inventory.counts.historical}`,
        `# Generated: ${new Date().toISOString()}`,
        ``,
        `# --- ALL SUBDOMAINS [Status] [Endpoints] ---`,
        ...inventory.allSubdomains.map(s => {
          const status = inventory.statusMap[s] || 'historical';
          const epCount = inventory.endpointCounts[s] || 0;
          return `${s}\t[${status.toUpperCase()}]\t[${epCount} endpoints]`;
        })
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subdomains-${apex}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
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
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-xs">
              <Globe className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-foreground">
                  Discovered Subdomains & Digital Perimeter
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                  {inventory.counts.total} Total Subdomains
                </span>
                {inventory.counts.live > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {inventory.counts.live} Live Active
                  </span>
                )}
                {inventory.counts.historical > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                    <Archive className="w-3 h-3 text-amber-400" />
                    {inventory.counts.historical} Historical OSINT
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                Target Apex: <strong className="text-indigo-400 font-mono font-semibold">{inventory.apexDomain || 'Domain'}</strong> · Real-time DNS resolution and historical Certificate Transparency perimeter inventory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyAll}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border-border hover:bg-surface-raised text-foreground cursor-pointer transition-colors shadow-xs"
              title="Copy all currently filtered subdomains to clipboard"
            >
              {copiedAll ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied ({filteredSubdomains.length})!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted" />
                  <span>Copy List</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportTxt}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border-indigo-500/30 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-indigo-400 cursor-pointer transition-colors shadow-xs"
              title="Download subdomains list as text file"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Export TXT</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-border bg-surface flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter subdomains by name (e.g. api, app, auth, booking, dev, mail)..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-surface-raised border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer font-semibold ${
                statusTab === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-surface-raised hover:bg-surface-subtle text-muted hover:text-foreground border-border'
              }`}
            >
              All ({inventory.counts.total})
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('LIVE')}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${
                statusTab === 'LIVE'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:border-emerald-500/40'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Active ({inventory.counts.live})</span>
            </button>

            {inventory.counts.historical > 0 && (
              <button
                type="button"
                onClick={() => setStatusTab('HISTORICAL')}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${
                  statusTab === 'HISTORICAL'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/25 hover:border-amber-500/40'
                }`}
              >
                <Archive className="w-3 h-3 text-amber-400" />
                <span>Historical Archive ({inventory.counts.historical})</span>
              </button>
            )}

            {withEndpointsCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusTab('WITH_ENDPOINTS')}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${
                  statusTab === 'WITH_ENDPOINTS'
                    ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/25 hover:border-violet-500/40'
                }`}
              >
                <Workflow className="w-3 h-3 text-violet-400" />
                <span>With Endpoints ({withEndpointsCount})</span>
              </button>
            )}

            {/* Sort Dropdown */}
            <div className="relative flex items-center gap-1 pl-2 border-l border-border">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-surface-raised border border-border text-foreground rounded-md px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="default">Default Order</option>
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                {withEndpointsCount > 0 && (
                  <option value="endpoints_desc">Endpoints (Most First)</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Subdomains Count & Showing Label */}
        <div className="px-5 py-2 bg-surface-raised/20 border-b border-border/60 flex items-center justify-between text-[11px] font-mono text-muted">
          <span>
            Showing <strong className="text-foreground">{filteredSubdomains.length}</strong> of{' '}
            <strong className="text-foreground">{inventory.counts.total}</strong> subdomains
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
          <span className="hidden sm:inline text-[10px]">
            Zero-hallucination DNS validation & OSINT certificate transparency
          </span>
        </div>

        {/* Scrollable Subdomains Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {filteredSubdomains.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Globe className="h-10 w-10 text-muted mx-auto opacity-40" />
              <h3 className="text-sm font-semibold text-foreground">No subdomains matched your criteria</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Try searching for a different keyword or switch the filter tab back to "All".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusTab('ALL');
                }}
                className="text-xs text-indigo-400 hover:underline pt-2 inline-block cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredSubdomains.slice(0, visibleCount).map((sub, idx) => {
                const isApex = sub === inventory.apexDomain || idx === 0 && !inventory.apexDomain;
                const isLive = inventory.statusMap[sub] === 'live';
                const epCount = inventory.endpointCounts[sub] || 0;
                const isCopied = copiedKey === `sub-${sub}`;

                return (
                  <div
                    key={sub}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all hover:shadow-xs group ${
                      isApex
                        ? 'bg-indigo-500/[0.08] border-indigo-500/40 ring-1 ring-indigo-500/20'
                        : isLive
                          ? 'bg-surface-raised/60 hover:bg-surface-raised border-border hover:border-emerald-500/40'
                          : 'bg-surface-raised/30 hover:bg-surface-raised/60 border-border/80 hover:border-amber-500/30 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {/* Top Row: Subdomain name and Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Globe className={`h-3.5 w-3.5 shrink-0 ${
                            isApex
                              ? 'text-indigo-400'
                              : isLive
                                ? 'text-emerald-400'
                                : 'text-amber-400/80'
                          }`} />
                          <span
                            className="font-mono text-xs font-bold text-foreground truncate select-all"
                            title={sub}
                          >
                            {sub}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopySingle(sub, `sub-${sub}`)}
                          className="p-1 rounded text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                          title="Copy subdomain to clipboard"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <a
                          href={`https://${sub}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-muted hover:text-indigo-400 hover:bg-surface transition-colors cursor-pointer"
                          title={isLive ? `Open https://${sub} in new tab` : `Historical domain (may be inactive / NXDOMAIN)`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Bottom Row: Status Tags & Endpoints */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/50 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isApex ? (
                          <span className="px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            Main Apex
                          </span>
                        ) : isLive ? (
                          <span className="px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Live Active
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400/90 border border-amber-500/25 flex items-center gap-1">
                            <Archive className="w-2.5 h-2.5 text-amber-400" />
                            Historical
                          </span>
                        )}
                      </div>

                      {epCount > 0 ? (
                        <span className="px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/25 font-bold flex items-center gap-1">
                          <Workflow className="w-2.5 h-2.5 text-violet-400" />
                          {epCount} {epCount === 1 ? 'Route' : 'Routes'}
                        </span>
                      ) : (
                        <span className="text-muted text-[10px]">
                          {isLive ? 'Gateway / Web' : 'NXDOMAIN Archive'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Load More Trigger for Large Subdomain Inventories (1,000 - 10,000+ items) */}
              {filteredSubdomains.length > visibleCount && (
                <div className="col-span-full py-4 text-center flex flex-col sm:flex-row items-center justify-center gap-3 bg-surface-raised/20 rounded-xl border border-border/60 p-3">
                  <span className="text-xs text-muted">
                    Showing {visibleCount} of {filteredSubdomains.length} subdomains
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 180)}
                      className="btn-secondary text-xs py-1.5 px-4 cursor-pointer font-semibold shadow-xs hover:border-indigo-500/50"
                    >
                      Load More (+{Math.min(180, filteredSubdomains.length - visibleCount)})
                    </button>
                    {filteredSubdomains.length <= 500 ? (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(filteredSubdomains.length)}
                        className="text-xs text-indigo-400 hover:underline cursor-pointer font-medium px-2 py-1"
                      >
                        Show All ({filteredSubdomains.length})
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(filteredSubdomains.length, prev + 500))}
                        className="text-xs text-indigo-400 hover:underline cursor-pointer font-medium px-2 py-1"
                      >
                        Load 500 More (+{Math.min(500, filteredSubdomains.length - visibleCount)})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / Legend */}
        <div className="px-5 py-3 border-t border-border bg-surface-raised/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0 text-xs text-muted">
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <strong className="text-foreground">Live Active:</strong> Resolves in DNS (A/AAAA).
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Archive className="w-3 h-3 text-amber-400" />
              <strong className="text-foreground">Historical:</strong> OSINT & Certificate Transparency record (NXDOMAIN).
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="btn-secondary text-xs py-1.5 px-4 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
