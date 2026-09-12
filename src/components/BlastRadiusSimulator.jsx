'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight, 
  RefreshCw, Cpu, Database, Briefcase, FileCode, Search, 
  Layers, Key, Table as TableIcon, Code2, AlertCircle, ArrowUpRight,
  Copy, Check, Sparkles, Activity, Eye, Terminal, ChevronRight,
  Filter, Play, ArrowDown
} from 'lucide-react';

export default function BlastRadiusSimulator({ 
  schemaData, 
  codeData, 
  currentPath, 
  initialImpact,
  initialSelection
}) {
  const tables = schemaData?.tables || [];
  const endpoints = codeData?.endpoints || [];

  // Active target selection states
  const defaultTable = initialSelection?.targetName || initialImpact?.target?.name || (tables[0]?.name || 'orders');
  const [selectedTable, setSelectedTable] = useState(defaultTable);
  const [changeType, setChangeType] = useState(initialSelection?.changeType || initialImpact?.target?.changeType || 'table_name');
  const [selectedColumn, setSelectedColumn] = useState(initialSelection?.columnName || '');
  const [selectedKey, setSelectedKey] = useState(initialSelection?.keyName || '');
  const [action, setAction] = useState(initialImpact?.target?.action || 'drop');
  const [newValue, setNewValue] = useState(initialImpact?.target?.newValue || '');

  // View Mode: 'VISUAL' (Shockwave Graph) | 'TABULAR' (Ranked Breakdown)
  const [displayMode, setDisplayMode] = useState('TABULAR');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'TABLES' | 'CODE'
  const [searchQuery, setSearchQuery] = useState('');
  const [impactData, setImpactData] = useState(initialImpact);
  const [isCalculating, setIsCalculating] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [selectedNodeDetails, setSelectedNodeDetails] = useState(null);

  // Find currently selected table object
  const currentTableObj = tables.find(t => t.name.toLowerCase() === selectedTable.toLowerCase()) || tables[0] || { name: selectedTable, columns: [], foreignKeys: [] };

  // Sync columns & keys when selected table changes
  useEffect(() => {
    if (currentTableObj?.columns?.length > 0 && !selectedColumn) {
      setSelectedColumn(currentTableObj.columns[0].name);
    }
    if (!selectedKey) {
      const defaultKey = currentTableObj.primaryKey ? `PK (${currentTableObj.primaryKey})` : (currentTableObj.foreignKeys?.[0]?.column ? `FK (${currentTableObj.foreignKeys[0].column})` : 'PRIMARY KEY');
      setSelectedKey(defaultKey);
    }
  }, [selectedTable, currentTableObj]);

  // Handle external selection overrides from DeveloperView
  useEffect(() => {
    if (initialSelection?.targetName) {
      setSelectedTable(initialSelection.targetName);
      if (initialSelection.changeType) setChangeType(initialSelection.changeType);
      if (initialSelection.columnName) setSelectedColumn(initialSelection.columnName);
      if (initialSelection.keyName) setSelectedKey(initialSelection.keyName);
      handleSimulate(
        initialSelection.targetName,
        initialSelection.changeType || changeType,
        initialSelection.columnName,
        initialSelection.keyName,
        action,
        newValue
      );
    }
  }, [initialSelection]);

  const handleSimulate = async (
    tbl = selectedTable,
    cType = changeType,
    col = selectedColumn,
    kName = selectedKey,
    act = action,
    nVal = newValue
  ) => {
    setIsCalculating(true);
    try {
      const res = await fetch('/api/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          targetName: tbl,
          targetType: 'table',
          changeType: cType,
          columnName: cType === 'column_name' ? (col || currentTableObj?.columns?.[0]?.name) : null,
          keyName: cType === 'key' ? (kName || currentTableObj?.primaryKey || 'PRIMARY KEY') : null,
          action: act,
          newValue: nVal
        })
      });
      const data = await res.json();
      if (data.success) {
        setImpactData(data.data);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Quick Preset Scenarios
  const presets = [
    {
      label: 'Drop orders.user_id (FK Breaking)',
      table: 'orders',
      type: 'column_name',
      column: 'user_id',
      action: 'drop',
      key: ''
    },
    {
      label: 'Rename users table',
      table: 'users',
      type: 'table_name',
      column: '',
      action: 'rename',
      key: '',
      newVal: 'customer_accounts'
    },
    {
      label: 'Drop order_items primary key',
      table: 'order_items',
      type: 'key',
      column: '',
      action: 'drop',
      key: 'PK (id)'
    }
  ];

  const handleApplyPreset = (p) => {
    setSelectedTable(p.table);
    setChangeType(p.type);
    if (p.column) setSelectedColumn(p.column);
    if (p.key) setSelectedKey(p.key);
    setAction(p.action);
    if (p.newVal) setNewValue(p.newVal);
    handleSimulate(p.table, p.type, p.column, p.key, p.action, p.newVal || '');
  };

  const riskScore = impactData?.blastRadius?.riskScore || 65;
  const riskLevel = impactData?.blastRadius?.riskLevel || 'MEDIUM';

  const riskBadge = riskLevel === 'HIGH' 
    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' 
    : riskLevel === 'MEDIUM' 
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

  // Impacted lists
  const rawImpactedTables = impactData?.blastRadius?.impactedTables || [];
  const rawImpactedCode = impactData?.blastRadius?.impactedCode || [];

  // Filtered lists by search query
  const filteredTables = rawImpactedTables.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCode = rawImpactedCode.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.module || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Available keys in selected table
  const availableKeys = [];
  if (currentTableObj?.primaryKey) {
    availableKeys.push({ label: `Primary Key (${currentTableObj.primaryKey})`, value: `PK (${currentTableObj.primaryKey})` });
  }
  (currentTableObj?.foreignKeys || []).forEach((fk) => {
    availableKeys.push({ label: `Foreign Key (${fk.column} -> ${fk.targetTable})`, value: `FK_${fk.column}` });
  });
  if (availableKeys.length === 0) {
    availableKeys.push({ label: 'Primary Key (id)', value: 'PRIMARY KEY' });
  }

  // Simulated SQL command preview
  const simulatedSQL = useMemo(() => {
    if (changeType === 'table_name') {
      if (action === 'drop') return `DROP TABLE ${selectedTable} CASCADE;`;
      if (action === 'rename') return `ALTER TABLE ${selectedTable} RENAME TO ${newValue || 'new_' + selectedTable};`;
    } else if (changeType === 'column_name') {
      const col = selectedColumn || currentTableObj?.columns?.[0]?.name || 'column_name';
      if (action === 'drop') return `ALTER TABLE ${selectedTable} DROP COLUMN ${col};`;
      if (action === 'rename') return `ALTER TABLE ${selectedTable} RENAME COLUMN ${col} TO ${newValue || 'new_' + col};`;
      if (action === 'type_change') return `ALTER TABLE ${selectedTable} ALTER COLUMN ${col} TYPE ${newValue || 'TEXT'};`;
    } else if (changeType === 'key') {
      return `ALTER TABLE ${selectedTable} DROP CONSTRAINT ${selectedKey || 'pk_' + selectedTable};`;
    }
    return `-- Custom DDL command for ${selectedTable}`;
  }, [selectedTable, changeType, selectedColumn, selectedKey, action, newValue, currentTableObj]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(simulatedSQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Target Selector & Simulator Control Bar */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card shadow-card">
        <div className="flex flex-col gap-3.5">
          {/* Header & Preset Scenarios */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Zap className="h-4 w-4 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    Live "What-If" Modification Blast-Radius Simulator
                  </h2>
                  <span className="px-2 py-0.2 rounded-full bg-surface-raised text-muted text-[10px] font-mono font-medium border border-border">
                    AST Graph Core
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  Simulate schema alterations (dropping columns, renaming tables, modifying constraints) and calculate downstream ripple effects across database relations and API route handlers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSimulate()}
                disabled={isCalculating}
                className="btn-primary text-xs py-2 px-4"
              >
                {isCalculating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Zap className="h-3.5 w-3.5 fill-current mr-1.5" />
                )}
                <span>Recalculate Blast</span>
              </button>
            </div>
          </div>

          {/* Quick Scenario Preset Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-muted flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Instant Scenarios:</span>
            </span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 rounded-md bg-surface hover:bg-surface-raised text-[11px] font-medium text-foreground border border-border transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>{p.label}</span>
                <ChevronRight className="h-3 w-3 text-muted" />
              </button>
            ))}
          </div>

          {/* Interactive Parameters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {/* 1. Select Table */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">
                Target Table
              </label>
              <select
                value={selectedTable}
                onChange={(e) => {
                  const newTbl = e.target.value;
                  setSelectedTable(newTbl);
                  const tblObj = tables.find(t => t.name.toLowerCase() === newTbl.toLowerCase());
                  const newCol = tblObj?.columns?.[0]?.name || '';
                  setSelectedColumn(newCol);
                  handleSimulate(newTbl, changeType, newCol, selectedKey, action, newValue);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-surface border border-border text-foreground font-mono font-medium outline-none focus:border-brand cursor-pointer"
              >
                {tables.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.columns?.length || 0} cols)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Value to Change */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">
                Entity Scope
              </label>
              <select
                value={changeType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setChangeType(newType);
                  handleSimulate(selectedTable, newType, selectedColumn, selectedKey, action, newValue);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-surface border border-border text-foreground font-medium outline-none focus:border-brand cursor-pointer"
              >
                <option value="table_name">Entire Table (table_name)</option>
                <option value="column_name">Table Column (column_name)</option>
                <option value="key">Key / Constraint (key)</option>
              </select>
            </div>

            {/* 3. Sub-target Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">
                {changeType === 'column_name' ? 'Select Column' : changeType === 'key' ? 'Select Key / FK' : 'Target Entity'}
              </label>
              {changeType === 'column_name' ? (
                <select
                  value={selectedColumn || currentTableObj?.columns?.[0]?.name || ''}
                  onChange={(e) => {
                    setSelectedColumn(e.target.value);
                    handleSimulate(selectedTable, changeType, e.target.value, selectedKey, action, newValue);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md bg-surface border border-border text-foreground font-mono font-medium outline-none focus:border-brand cursor-pointer"
                >
                  {(currentTableObj?.columns || []).map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.type}{c.isPrimaryKey ? ' - PK' : ''})
                    </option>
                  ))}
                </select>
              ) : changeType === 'key' ? (
                <select
                  value={selectedKey || availableKeys[0]?.value || ''}
                  onChange={(e) => {
                    setSelectedKey(e.target.value);
                    handleSimulate(selectedTable, changeType, selectedColumn, e.target.value, action, newValue);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md bg-surface border border-border text-foreground font-mono font-medium outline-none focus:border-brand cursor-pointer"
                >
                  {availableKeys.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-2.5 py-1.5 text-xs rounded-md bg-surface-raised border border-border text-muted font-mono truncate">
                  Entire {selectedTable} Table
                </div>
              )}
            </div>

            {/* 4. Action Type */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">
                Modification Action
              </label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  handleSimulate(selectedTable, changeType, selectedColumn, selectedKey, e.target.value, newValue);
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-surface border border-border text-foreground font-medium outline-none focus:border-brand cursor-pointer"
              >
                <option value="drop">Drop / Delete</option>
                <option value="rename">Rename / Alias</option>
                {changeType === 'column_name' && <option value="type_change">Change Data Type</option>}
                {changeType === 'key' && <option value="constraint_change">Alter Constraint Rules</option>}
              </select>
            </div>

            {/* 5. Proposed New Value Input */}
            <div>
              <label className="block text-[11px] font-semibold text-muted mb-1">
                New Value / Expression
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSimulate();
                }}
                placeholder={
                  changeType === 'column_name'
                    ? (action === 'type_change' ? 'e.g. UUID, BIGINT' : 'e.g. user_reference')
                    : changeType === 'key'
                    ? 'e.g. CASCADE'
                    : 'e.g. customer_orders'
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-surface border border-border text-foreground font-mono outline-none focus:border-brand placeholder:text-muted/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Gauge & High-Level Metrics - Seamless Hairline Ribbon (No Boxes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-3">
        {/* Active Modification Node */}
        <div className="py-2 sm:py-0 px-4">
          <div className="text-base font-bold font-mono text-foreground flex items-center gap-1.5 truncate">
            <Database className="h-4 w-4 text-rose-500 shrink-0" />
            <span className="truncate">{selectedTable}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
              {changeType.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-muted font-mono truncate">
              {changeType === 'column_name' ? selectedColumn : changeType === 'key' ? selectedKey : 'table_name'}
            </span>
          </div>
          <div className="text-[11px] font-medium text-muted mt-1">
            Total Ripple Nodes: <span className="font-semibold text-foreground font-mono">{impactData?.blastRadius?.totalAffectedComponents || (rawImpactedTables.length + rawImpactedCode.length)}</span>
          </div>
        </div>

        {/* Computed Blast Severity */}
        <div className="py-2 sm:py-0 px-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-extrabold text-foreground font-mono">{riskScore}%</span>
            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${riskBadge}`}>
              {riskLevel} RISK
            </span>
          </div>
          <div className="w-full bg-surface-subtle rounded-full h-1.5 overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                riskScore > 70 ? 'bg-rose-500' : riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-muted block mt-1">Computed Blast Severity</span>
        </div>

        {/* Cascading Relational Models */}
        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-foreground font-mono">{rawImpactedTables.length} Tables</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Cascading Relational Models</span>
        </div>

        {/* Upstream Code & Endpoints */}
        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-foreground font-mono">{rawImpactedCode.length} Handlers</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Upstream Endpoints & Code</span>
        </div>
      </div>

      {/* View Switcher: Shockwave Canvas vs Tabular Lists */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1 p-1 bg-surface-raised rounded-lg border border-border">
          <button
            onClick={() => setDisplayMode('VISUAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              displayMode === 'VISUAL'
                ? 'bg-surface-card text-foreground shadow-xs border border-border'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Shockwave Graph</span>
          </button>

          <button
            onClick={() => setDisplayMode('TABULAR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              displayMode === 'TABULAR'
                ? 'bg-surface-card text-foreground shadow-xs border border-border'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Impact Breakdown & Mitigations</span>
          </button>
        </div>

        {displayMode === 'TABULAR' && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-surface-raised rounded-md border border-border text-xs font-semibold">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-2 py-0.5 rounded transition-colors ${filterTab === 'ALL' ? 'bg-surface-card text-foreground shadow-xs' : 'text-muted'}`}
              >
                All ({rawImpactedTables.length + rawImpactedCode.length})
              </button>
              <button
                onClick={() => setFilterTab('TABLES')}
                className={`px-2 py-0.5 rounded transition-colors ${filterTab === 'TABLES' ? 'bg-surface-card text-foreground shadow-xs' : 'text-muted'}`}
              >
                Tables ({rawImpactedTables.length})
              </button>
              <button
                onClick={() => setFilterTab('CODE')}
                className={`px-2 py-0.5 rounded transition-colors ${filterTab === 'CODE' ? 'bg-surface-card text-foreground shadow-xs' : 'text-muted'}`}
              >
                Code ({rawImpactedCode.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search affected items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-md bg-surface border border-border text-foreground outline-none focus:border-brand placeholder:text-muted/60"
              />
            </div>
          </div>
        )}
      </div>

      {/* MODE 1: Interactive Visual Blast Shockwave Graph */}
      {displayMode === 'VISUAL' && (
        <div className="p-5 sm:p-6 rounded-xl border border-border bg-surface-card shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" />
              <h3 className="text-sm font-bold text-foreground">
                Blast Radius Shockwave Propagation Map
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted flex-wrap">
              <span>Topology: Epicenter</span>
              <ArrowRight className="h-2.5 w-2.5 opacity-60" />
              <span>Database Relations</span>
              <ArrowRight className="h-2.5 w-2.5 opacity-60" />
              <span>API Routes</span>
            </div>
          </div>

          {/* Radial Shockwave Canvas Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
            {/* WAVE 1: Cascading Database Tables */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400 pb-1 border-b border-border">
                <Database className="h-3.5 w-3.5" />
                <span>Wave 1: Database Dependencies ({rawImpactedTables.length})</span>
              </div>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {rawImpactedTables.map((tbl) => (
                  <div
                    key={tbl.name}
                    onClick={() => setSelectedNodeDetails(tbl)}
                    className={`p-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between shadow-xs ${
                      selectedNodeDetails?.name === tbl.name
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'bg-surface border-border hover:border-violet-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="font-mono text-xs font-semibold text-foreground truncate">{tbl.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.2 rounded ${
                      tbl.impactPercentage >= 80 ? 'bg-rose-500/10 text-rose-600' : 'bg-surface-raised text-muted'
                    }`}>
                      {tbl.impactPercentage}%
                    </span>
                  </div>
                ))}
                {rawImpactedTables.length === 0 && (
                  <div className="text-center p-6 text-xs text-muted">No cascading database dependencies</div>
                )}
              </div>
            </div>

            {/* CENTER: Epicenter Shockwave Orb */}
            <div className="flex flex-col items-center justify-center p-4 text-center relative">
              <div className="relative z-10 p-5 rounded-xl bg-surface border border-border shadow-md flex flex-col items-center max-w-xs w-full">
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2.5 border border-rose-500/20">
                  <Zap className="h-5 w-5 fill-current" />
                </div>
                <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">
                  Epicenter Target
                </span>
                <h4 className="text-base font-bold font-mono text-foreground mt-0.5">
                  {selectedTable}
                </h4>
                <span className="text-xs font-mono text-muted mt-0.5">
                  {changeType === 'column_name' ? selectedColumn : changeType === 'key' ? selectedKey : 'table'}
                </span>
                <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/25 font-mono text-[11px] font-semibold">
                  {action.toUpperCase()}
                </div>
              </div>
            </div>

            {/* WAVE 2: Upstream API Routes & Code */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 pb-1 border-b border-border">
                <Code2 className="h-3.5 w-3.5" />
                <span>Wave 2: Code & API Handlers ({rawImpactedCode.length})</span>
              </div>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {rawImpactedCode.map((codeItem, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedNodeDetails(codeItem)}
                    className={`p-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between shadow-xs ${
                      selectedNodeDetails?.name === codeItem.name
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'bg-surface border-border hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-semibold text-foreground block truncate">{codeItem.name}</span>
                        <span className="text-[10px] text-muted font-mono block truncate">{codeItem.module}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.2 rounded shrink-0 ${
                      codeItem.impactPercentage >= 80 ? 'bg-rose-500/10 text-rose-600' : 'bg-surface-raised text-muted'
                    }`}>
                      {codeItem.impactPercentage}%
                    </span>
                  </div>
                ))}
                {rawImpactedCode.length === 0 && (
                  <div className="text-center p-6 text-xs text-muted">No affected code handlers</div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Node Details Drawer */}
          {selectedNodeDetails && (
            <div className="mt-5 p-3.5 rounded-lg bg-surface-raised border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-foreground">{selectedNodeDetails.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-brand/10 text-brand">
                    {selectedNodeDetails.impactPercentage}% Impact
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  {selectedNodeDetails.reason}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                  Mitigation: {selectedNodeDetails.mitigation}
                </p>
              </div>
              <button
                onClick={() => setSelectedNodeDetails(null)}
                className="btn-secondary text-xs py-1 px-2.5"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Dual Grid Tabular View */}
      {displayMode === 'TABULAR' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeIn">
          {/* VIEW 1: Impacted Tables */}
          {(filterTab === 'ALL' || filterTab === 'TABLES') && (
            <div className={`p-4 sm:p-5 rounded-xl border border-border bg-surface-card flex flex-col shadow-card ${filterTab === 'TABLES' ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-bold text-foreground">
                    Impacted Database Tables ({filteredTables.length})
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Ranked by Risk %
                </span>
              </div>

              <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto pr-1">
                {filteredTables.map((tbl) => {
                  const isCritical = tbl.impactPercentage >= 85;
                  const isHigh = tbl.impactPercentage >= 70 && tbl.impactPercentage < 85;
                  const badgeStyle = isCritical
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                    : isHigh
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';

                  return (
                    <div
                      key={tbl.name}
                      className="py-3 px-1 hover:bg-surface-raised/40 transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Database className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                          <span className="font-mono text-xs font-bold text-foreground truncate">{tbl.name}</span>
                          {tbl.name.toLowerCase() === selectedTable.toLowerCase() && (
                            <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-surface-raised text-muted border border-border">
                              Source Target
                            </span>
                          )}
                          <span className="text-[10px] text-muted font-mono">{tbl.databaseType}</span>
                        </div>

                        <span className={`text-xs font-bold px-2 py-0.2 rounded border font-mono shrink-0 ${badgeStyle}`}>
                          {tbl.impactPercentage}% IMPACT
                        </span>
                      </div>

                      <div className="w-full bg-surface-subtle rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${tbl.impactPercentage}%` }}
                        />
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        {tbl.reason}
                      </p>

                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                        {tbl.affectedColumns?.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-muted font-mono text-[10px]">Columns:</span>
                            {tbl.affectedColumns.map((col, cIdx) => (
                              <span key={cIdx} className="px-1.5 py-0.2 rounded bg-surface-raised border border-border font-mono text-[10px] text-foreground">
                                {col}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-muted text-[10px] italic">
                          {tbl.mitigation}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredTables.length === 0 && (
                  <div className="p-8 text-center text-xs text-muted">
                    No tables matched the current filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: Impacted Code */}
          {(filterTab === 'ALL' || filterTab === 'CODE') && (
            <div className={`p-4 sm:p-5 rounded-xl border border-border bg-surface-card flex flex-col shadow-card ${filterTab === 'CODE' ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-sm font-bold text-foreground">
                    Impacted Code, Handlers & APIs ({filteredCode.length})
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Ranked by Risk %
                </span>
              </div>

              <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto pr-1">
                {filteredCode.map((codeItem, idx) => {
                  const isCritical = codeItem.impactPercentage >= 85;
                  const isHigh = codeItem.impactPercentage >= 70 && codeItem.impactPercentage < 85;
                  const badgeStyle = isCritical
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                    : isHigh
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25';

                  return (
                    <div
                      key={idx}
                      className="py-3 px-1 hover:bg-surface-raised/40 transition-colors flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                          <span className="font-mono text-xs font-bold text-foreground truncate">{codeItem.name}</span>
                          <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-surface-raised text-muted border border-border">
                            {codeItem.type}
                          </span>
                        </div>

                        <span className={`text-xs font-bold px-2 py-0.2 rounded border font-mono shrink-0 ${badgeStyle}`}>
                          {codeItem.impactPercentage}% IMPACT
                        </span>
                      </div>

                      <div className="w-full bg-surface-subtle rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${codeItem.impactPercentage}%` }}
                        />
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        {codeItem.reason}
                      </p>

                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] text-muted">
                        <span className="font-mono text-foreground truncate">
                          {codeItem.module}
                        </span>
                        <span className="italic">
                          {codeItem.mitigation}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredCode.length === 0 && (
                  <div className="p-8 text-center text-xs text-muted">
                    No code files or endpoints matched the current filter.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-Persona Blast Radius Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Developer Action Items */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card flex flex-col shadow-card">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-3 text-cyan-600 dark:text-cyan-400">
            <FileCode className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Developer Mitigation Checklist</h3>
          </div>

          <ul className="space-y-2 flex-1 text-xs text-muted">
            {impactData?.personaInsights?.developer?.actionItems?.map((item, i) => (
              <li key={i} className="flex items-start gap-2 bg-surface p-2.5 rounded-md border border-border shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Business & Revenue Impact */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card flex flex-col shadow-card">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-3 text-emerald-600 dark:text-emerald-400">
            <Briefcase className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Business & Customer Impact</h3>
          </div>

          <div className="space-y-2.5 flex-1 text-xs text-muted">
            <div className="bg-surface p-2.5 rounded-md border border-border shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Affected Business Domain</span>
              <p className="font-semibold text-foreground mt-0.5">
                {impactData?.personaInsights?.business?.businessDomain || 'Core Processing'}
              </p>
            </div>

            <div className="bg-surface p-2.5 rounded-md border border-border shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">User-Facing Disruption</span>
              <p className="text-foreground mt-0.5 leading-relaxed">
                {impactData?.personaInsights?.business?.userFacingImpact || 'Standard transaction flow.'}
              </p>
            </div>

            <div className="bg-surface p-2.5 rounded-md border border-border shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Financial / SLA Risk</span>
              <p className="text-foreground mt-0.5">
                {impactData?.personaInsights?.business?.revenueOrOperationRisk || 'Low'}
              </p>
            </div>
          </div>
        </div>

        {/* Engineering Manager Sprint Window */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card flex flex-col shadow-card">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-3 text-violet-600 dark:text-violet-400">
            <Cpu className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Manager Sprint Governance</h3>
          </div>

          <div className="space-y-2.5 flex-1 text-xs">
            <div className="bg-surface p-2.5 rounded-md border border-border shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">
                Estimated Refactor Effort
              </span>
              <div className="text-sm font-bold text-foreground font-mono">
                {impactData?.personaInsights?.manager?.estimatedRefactorEffort || '1-2 Days Testing'}
              </div>
            </div>

            <div className="bg-surface p-2.5 rounded-md border border-border shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-muted block mb-1">
                Affected Engineering Squads
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {(impactData?.personaInsights?.manager?.affectedTeams || ['Core Backend Squad', 'QA Squad']).map((team, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-surface-raised border border-border text-[10px] font-semibold text-foreground font-mono">
                    {team}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-surface p-2.5 rounded-md border border-border shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">
                Breaking Change Alert
              </span>
              <span className={`text-xs font-semibold ${riskScore > 60 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {riskScore > 60 ? 'Active Alert: Schema Migration Barrier' : 'No Critical Breaking Conflicts'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
