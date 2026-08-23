'use client';

import React, { useState } from 'react';
import { 
  Database, Key, Link2, Code2, AlertTriangle, CheckCircle, 
  Terminal, Layers, ArrowRight, Table, Eye, X, FileSpreadsheet,
  Copy, Check, Search, ExternalLink, Hash, ArrowUpRight
} from 'lucide-react';

export default function DeveloperView({ data, onSelectForImpact }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTable, setPreviewTable] = useState(null);
  const [copied, setCopied] = useState(false);

  const tables = data?.tables || [];
  const endpoints = data?.endpoints || [];
  const warnings = data?.breakingChangeWarnings || [];

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.databaseType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyTableJSON = (table) => {
    navigator.clipboard.writeText(JSON.stringify(table, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-border dark:border-blue-500/40 dark:bg-[#0f1322] shadow-sm">
          <span className="text-[11px] uppercase font-bold text-blue-900 dark:text-blue-400 block">Database Tables</span>
          <div className="text-2xl font-black text-foreground mt-1">{tables.length}</div>
          <span className="text-[10px] text-slate-500 font-medium">SQL & NoSQL Models</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-border dark:border-blue-500/40 dark:bg-[#0f1322] shadow-sm">
          <span className="text-[11px] uppercase font-bold text-blue-900 dark:text-blue-400 block">API Endpoints</span>
          <div className="text-2xl font-black text-foreground mt-1">{endpoints.length}</div>
          <span className="text-[10px] text-slate-500 font-medium">REST & Route Handlers</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-border dark:border-violet-500/40 dark:bg-[#141024] shadow-sm">
          <span className="text-[11px] uppercase font-bold text-violet-700 dark:text-violet-400 block">Code Functions</span>
          <div className="text-2xl font-black text-foreground mt-1">{data?.functions?.length || 0}</div>
          <span className="text-[10px] text-slate-500 font-medium">Parsed AST Call Nodes</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-border dark:border-emerald-500/40 dark:bg-[#0f1816] shadow-sm">
          <span className="text-[11px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Lines of Code</span>
          <div className="text-2xl font-black text-foreground mt-1">{data?.metrics?.linesOfCode || 0}</div>
          <span className="text-[10px] text-slate-500 font-medium">Polyglot Codebase</span>
        </div>
      </div>

      {/* Main Grid: Database Schema Inspector & API Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Schema & Data Inspector */}
        <div className="glass-panel p-5 rounded-3xl border border-border dark:border-slate-700 flex flex-col h-[580px] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border dark:border-slate-700 mb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-900 dark:text-blue-400" />
              <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">
                Database Schemas & Data Model Inspector
              </h3>
            </div>
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter tables or DB types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs rounded-lg bg-surface-card border border-border dark:border-slate-700 text-foreground outline-none focus:border-blue-900 dark:focus:border-blue-400 placeholder-slate-400 w-44"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredTables.map((table) => (
              <div
                key={table.name}
                className="bg-surface-card dark:bg-[#121626] hover:bg-slate-50 dark:hover:bg-[#181d32] rounded-2xl p-4 border border-border dark:border-slate-700 transition-all shadow-sm group"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-black text-blue-950 dark:text-blue-300">{table.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {table.databaseType || 'Relational SQL'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {table.columns?.length || 0} cols
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* View Sample Data Button */}
                    <button
                      onClick={() => setPreviewTable(table)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-neutral-700 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-slate-700 flex items-center gap-1 transition-all cursor-pointer font-bold"
                      title="View Sample Row Values"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      <span>Data Values</span>
                    </button>

                    <button
                      onClick={() => onSelectForImpact && onSelectForImpact(table.name, 'table')}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 transition-all cursor-pointer font-bold"
                    >
                      <span>Simulate Blast</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>

                {/* Columns & Sample Values Preview */}
                <div className="space-y-1">
                  {table.columns?.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-surface-raised dark:bg-[#181d30] border border-border/60 dark:border-slate-700/80 font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {col.isPrimaryKey && <Key className="h-3 w-3 text-amber-500 shrink-0" title="Primary Key" />}
                        {table.foreignKeys?.some((f) => f.column === col.name) && (
                          <Link2 className="h-3 w-3 text-violet-500 dark:text-violet-400 shrink-0" title="Foreign Key" />
                        )}
                        <span className={col.isPrimaryKey ? 'text-amber-700 dark:text-amber-300 font-bold truncate' : 'text-foreground font-semibold truncate'}>
                          {col.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500">{col.type}</span>
                        {col.sampleValue && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-900 text-blue-900 dark:text-cyan-300 font-mono">
                            val: {String(col.sampleValue).slice(0, 16)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Endpoints & Handlers */}
        <div className="glass-panel p-5 rounded-3xl border border-border dark:border-slate-700 flex flex-col h-[580px] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-border dark:border-slate-700 mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-900 dark:text-blue-400" />
              <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">API Routes & Backend Handlers</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">{endpoints.length} Active Endpoints</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {endpoints.map((ep, idx) => {
              const isGet = ep.method === 'GET';
              const isPost = ep.method === 'POST';
              const isPut = ep.method === 'PUT';
              const isDelete = ep.method === 'DELETE';

              const badgeColor = isGet
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : isPost
                ? 'bg-blue-500/10 text-blue-800 dark:text-blue-400 border-blue-500/30'
                : isPut
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';

              return (
                <div
                  key={idx}
                  className="bg-surface-card dark:bg-[#121626] p-3.5 rounded-2xl border border-border dark:border-slate-700 flex items-center justify-between hover:border-blue-900/40 dark:hover:border-blue-500 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${badgeColor}`}>
                      {ep.method}
                    </span>
                    <div>
                      <div className="font-mono text-xs text-foreground font-bold">{ep.path}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{ep.module}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectForImpact && onSelectForImpact(ep.path, 'endpoint')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-surface-raised dark:bg-[#181d30] hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground border border-border dark:border-slate-700 cursor-pointer font-bold"
                  >
                    Check Blast
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Breaking Change Warnings for Developers */}
      <div className="glass-panel p-5 rounded-3xl border border-border dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">
            Developer Breaking Change Alerts & Hygiene Checks
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {warnings.map((w) => (
            <div key={w.id} className="bg-surface-card dark:bg-[#15141c] p-4 rounded-2xl border border-amber-500/40 flex gap-3 shadow-sm">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-700 dark:text-amber-300">{w.title}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{w.recommendation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sample Data & Values Preview Modal */}
      {previewTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-4xl rounded-3xl border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2">
                <Table className="h-5 w-5 text-blue-900 dark:text-blue-400" />
                <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">
                  Data Values & Column Preview: <span className="font-mono text-blue-600 dark:text-blue-400">{previewTable.name}</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyTableJSON(previewTable)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-surface-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={() => setPreviewTable(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Table Spreadsheet View */}
            <div className="flex-1 overflow-auto p-5 bg-white dark:bg-black">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border bg-slate-50 dark:bg-neutral-900 text-blue-950 dark:text-blue-300">
                    {previewTable.columns.map((col) => (
                      <th key={col.name} className="p-3 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {col.isPrimaryKey && <Key className="h-3 w-3 text-amber-500" />}
                          <span>{col.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 block font-normal">{col.type}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(previewTable.sampleRows || []).map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-neutral-900">
                      {previewTable.columns.map((col) => (
                        <td key={col.name} className="p-3 text-foreground whitespace-nowrap">
                          {row[col.name] !== undefined ? String(row[col.name]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-border bg-surface-raised flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Database Engine: <strong className="text-foreground">{previewTable.databaseType}</strong></span>
              <span>Source File: <strong className="font-mono text-foreground truncate max-w-sm">{previewTable.sourceFile}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
