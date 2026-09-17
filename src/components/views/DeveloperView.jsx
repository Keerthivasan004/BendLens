'use client';

import React, { useState, useMemo } from 'react';
import { 
  Database, Key, Link2, Code2, AlertTriangle, CheckCircle, 
  Terminal, Layers, ArrowRight, Table, Eye, X, FileSpreadsheet,
  Copy, Check, Search, ExternalLink, Hash, ArrowUpRight, Download, Filter,
  Sparkles, BookOpen, ShieldAlert, Network, GitFork, ChevronDown, ChevronUp,
  Info, Cpu, Box, CheckCircle2, ChevronRight
} from 'lucide-react';

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

export default function DeveloperView({ data, onSelectForImpact }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [schemaMode, setSchemaMode] = useState('FIELDS'); // 'FIELDS' | 'DDL'
  const [previewTable, setPreviewTable] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [inspectedTable, setInspectedTable] = useState(null);

  const tables = data?.tables || data?.schema?.tables || [];
  const endpoints = data?.endpoints || data?.code?.endpoints || [];
  const warnings = data?.breakingChangeWarnings || [];

  const architecture = useMemo(() => analyzeSchemaArchitecture(tables), [tables]);

  const currentInspectedTable = inspectedTable 
    ? tables.find((t) => t.name === inspectedTable) || tables[0]
    : tables[0];

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

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesMethod = methodFilter === 'ALL' || ep.method.toUpperCase() === methodFilter;
    const matchesQuery = !searchQuery.trim() || 
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.module || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesQuery;
  });

  // Core APIs touch a known table (CRUD on domain models); everything else
  // (health, auth, webhooks, misc) is grouped as Other APIs so no route hides
  // in a single flat list.
  const tableNameTokens = useMemo(
    () => tables.map((t) => String(t.name || '').toLowerCase()).filter(Boolean),
    [tables]
  );
  const { coreEndpoints, otherEndpoints } = useMemo(() => {
    const core = [];
    const other = [];
    for (const ep of filteredEndpoints) {
      const p = String(ep.path || '').toLowerCase();
      const hitsTable = tableNameTokens.some((t) => p.includes(t) || p.includes(t.replace(/s$/, '')));
      if (hitsTable) core.push(ep);
      else other.push(ep);
    }
    return { coreEndpoints: core, otherEndpoints: other };
  }, [filteredEndpoints, tableNameTokens]);

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
      {/* Top Quick Metrics Ribbon (Retains exact labels for test compatibility) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-3">
        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-foreground font-mono">{tables.length}</div>
          <div className="text-[11px] font-medium text-muted flex items-center gap-1 mt-0.5">
            <Database className="h-3 w-3 text-brand" />
            <span>Database Tables</span>
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
            <Layers className="h-3 w-3 text-violet-500" />
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
      </div>

      {/* ========================================================================= */}
      {/* WHOLE SECTION: Database Schemas & Developer Architecture                   */}
      {/* ========================================================================= */}
      {!showExplanation ? (
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

      {/* ========================================================================= */}
      {/* WHOLE SECTION: API Routes & Backend Handlers                              */}
      {/* ========================================================================= */}
      <section className="p-5 sm:p-6 rounded-2xl border border-border bg-surface-card shadow-card w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">API Routes & Backend Handlers</h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-surface-raised text-muted border border-border">
                  {endpoints.length} Routes
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                HTTP routing map, API controller bindings, and impact endpoints across your backend.
              </p>
            </div>
          </div>

          {/* Method Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-surface-raised rounded-lg border border-border text-xs font-semibold font-mono">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  methodFilter === m ? 'bg-surface-card text-foreground shadow-xs' : 'text-muted hover:text-foreground'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto pr-1 space-y-4">
          {[
            { title: 'Core API Routes', hint: 'CRUD on detected tables', list: coreEndpoints },
            { title: 'Other API Routes', hint: 'health, auth, webhooks, misc', list: otherEndpoints }
          ].map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 px-2 pb-1.5">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{group.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-raised text-muted border border-border">
                  {group.list.length} Routes
                </span>
                <span className="text-[10px] text-muted hidden sm:inline">· {group.hint}</span>
              </div>
              <div className="divide-y divide-border-subtle">
                {group.list.map((ep, idx) => {
                  const isGet = ep.method === 'GET';
                  const isPost = ep.method === 'POST';
                  const isPut = ep.method === 'PUT';

                  const badgeColor = isGet
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : isPost
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    : isPut
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';

                  return (
                    <div
                      key={`${group.title}-${idx}`}
                      className="py-3 px-2 flex items-center justify-between hover:bg-surface-raised transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded border font-mono shrink-0 ${badgeColor}`}>
                          {ep.method}
                        </span>
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-foreground font-semibold truncate">{ep.path}</div>
                          <div className="text-[11px] text-muted font-mono truncate">{ep.module}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => onSelectForImpact && onSelectForImpact(ep.path, 'endpoint')}
                        className="text-xs px-3 py-1 rounded-md bg-surface-raised hover:bg-surface-subtle text-foreground border border-border cursor-pointer font-medium shrink-0 ml-3"
                      >
                        Check Blast
                      </button>
                    </div>
                  );
                })}
                {group.list.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted">No {group.title.toLowerCase()} match the current filter</div>
                )}
              </div>
            </div>
          ))}
          {filteredEndpoints.length === 0 && (
            <div className="text-center py-10 text-xs text-muted">No API endpoints match the current filter</div>
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
        </div>
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
    </div>
  );
}
