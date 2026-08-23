'use client';

import React, { useState } from 'react';
import { Zap, AlertTriangle, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, Cpu, Database, Briefcase, FileCode } from 'lucide-react';

export default function BlastRadiusSimulator({ 
  schemaData, 
  codeData, 
  currentPath, 
  initialImpact, 
  onRunImpact 
}) {
  const tables = schemaData?.tables || [];
  const endpoints = codeData?.endpoints || [];
  
  const [selectedTarget, setSelectedTarget] = useState(initialImpact?.target?.name || (tables[0]?.name || 'orders'));
  const [targetType, setTargetType] = useState('table');
  const [impactData, setImpactData] = useState(initialImpact);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleSimulate = async (name = selectedTarget, type = targetType) => {
    setIsCalculating(true);
    try {
      const res = await fetch('/api/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          targetName: name,
          targetType: type
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

  const riskScore = impactData?.blastRadius?.riskScore || 65;
  const riskLevel = impactData?.blastRadius?.riskLevel || 'MEDIUM';

  const riskColor = riskLevel === 'HIGH' 
    ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' 
    : riskLevel === 'MEDIUM' 
    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' 
    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

  const glowClass = riskLevel === 'HIGH' ? 'glow-rose' : 'glow-cyan';

  return (
    <div className="space-y-6">
      {/* Target Selector & Simulator Control Bar */}
      <div className={`glass-panel p-5 rounded-2xl border border-rose-500/30 ${glowClass} transition-all`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center">
                <Zap className="h-4 w-4 fill-current animate-pulse" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                Live "What-If" Modification Blast-Radius Simulator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select any database table, column, or API endpoint to compute upstream/downstream ripple effects before code deployment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg bg-surface-card dark:bg-[#151928] border border-border dark:border-slate-700 text-foreground outline-none focus:border-rose-500 cursor-pointer shadow-sm font-bold"
            >
              <option value="table">Table</option>
              <option value="endpoint">API Route</option>
            </select>

            <select
              value={selectedTarget}
              onChange={(e) => {
                setSelectedTarget(e.target.value);
                handleSimulate(e.target.value, targetType);
              }}
              className="px-3 py-2 text-xs rounded-lg bg-surface-card dark:bg-[#151928] border border-border dark:border-slate-700 text-foreground outline-none focus:border-rose-500 cursor-pointer min-w-[180px] shadow-sm font-bold"
            >
              {targetType === 'table' ? (
                tables.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.columns?.length || 0} cols)
                  </option>
                ))
              ) : (
                endpoints.map((ep, i) => (
                  <option key={i} value={ep.path}>
                    {ep.method} {ep.path}
                  </option>
                ))
              )}
            </select>

            <button
              onClick={() => handleSimulate()}
              disabled={isCalculating}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white shadow-lg shadow-rose-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              {isCalculating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 fill-current" />
              )}
              Recalculate Blast
            </button>
          </div>
        </div>
      </div>

      {/* Risk Gauge & High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk Level Card */}
        <div className="glass-card p-5 rounded-xl border border-border dark:border-slate-700 dark:bg-[#121624] flex flex-col justify-between shadow-sm">
          <span className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">Target Modification Node</span>
          <div className="my-2">
            <div className="text-xl font-extrabold font-mono text-foreground flex items-center gap-2">
              <Database className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              <span>{impactData?.target?.name || selectedTarget}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Type: {impactData?.target?.type || targetType}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Total Ripple Nodes: <strong className="text-foreground">{impactData?.blastRadius?.totalAffectedComponents || 0}</strong>
          </div>
        </div>

        {/* Calculated Risk Meter */}
        <div className="glass-card p-5 rounded-xl border border-border dark:border-slate-700 dark:bg-[#121624] flex flex-col justify-between shadow-sm">
          <span className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">Computed Blast Severity</span>
          <div className="flex items-center justify-between my-2">
            <div className="text-3xl font-black text-foreground">{riskScore}%</div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${riskColor}`}>
              {riskLevel} RISK
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-surface-raised dark:bg-neutral-800 rounded-full h-2 overflow-hidden border border-border dark:border-slate-700">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                riskScore > 70 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
              }`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </div>

        {/* Refactor Effort Estimate */}
        <div className="glass-card p-5 rounded-xl border border-border dark:border-slate-700 dark:bg-[#121624] flex flex-col justify-between shadow-sm">
          <span className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">Estimated Refactor Effort</span>
          <div className="my-2">
            <div className="text-lg font-bold text-cyan-600 dark:text-cyan-300">
              {impactData?.personaInsights?.manager?.estimatedRefactorEffort || '1-2 Days Testing'}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Regression risk window</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Breaking Alert: <strong className="text-rose-500 dark:text-rose-400">{riskScore > 60 ? 'Active Alert' : 'None Detected'}</strong>
          </div>
        </div>
      </div>

      {/* Multi-Persona Blast Radius Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Developer Action Items */}
        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-3 text-cyan-600 dark:text-cyan-400">
            <FileCode className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Developer Mitigation Checklist</h3>
          </div>

          <ul className="space-y-2.5 flex-1 text-xs text-slate-700 dark:text-slate-300">
            {impactData?.personaInsights?.developer?.actionItems?.map((item, i) => (
              <li key={i} className="flex items-start gap-2 bg-surface-card p-2.5 rounded-lg border border-border shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-cyan-500 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Business & Revenue Impact */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-3 text-emerald-600 dark:text-emerald-400">
            <Briefcase className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Business & Customer Journey Impact</h3>
          </div>

          <div className="space-y-3 flex-1 text-xs text-slate-700 dark:text-slate-300">
            <div className="bg-surface-card p-3 rounded-lg border border-border shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Affected Business Domain</span>
              <p className="font-bold text-foreground mt-0.5">
                {impactData?.personaInsights?.business?.businessDomain || 'Core Processing'}
              </p>
            </div>

            <div className="bg-surface-card p-3 rounded-lg border border-border shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">User-Facing Disruption</span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                {impactData?.personaInsights?.business?.userFacingImpact || 'Standard transaction flow.'}
              </p>
            </div>

            <div className="bg-surface-card p-3 rounded-lg border border-border shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-rose-600 dark:text-rose-400">Financial / SLA Risk</span>
              <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                {impactData?.personaInsights?.business?.revenueOrOperationRisk || 'Low'}
              </p>
            </div>
          </div>
        </div>

        {/* Cascading Database & API Links */}
        <div className="glass-panel p-5 rounded-2xl border border-violet-500/20 flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-3 text-violet-600 dark:text-violet-400">
            <Cpu className="h-4 w-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Directly Impacted APIs & FKs</h3>
          </div>

          <div className="space-y-3 flex-1 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                Connected API Endpoints ({impactData?.blastRadius?.affectedAPIs?.length || 0})
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {(impactData?.blastRadius?.affectedAPIs || []).map((ep, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded bg-surface-card border border-border font-mono text-[11px] text-cyan-600 dark:text-cyan-300 shadow-sm">
                    <span className="text-slate-400 text-[10px]">{ep.method}</span>
                    <span className="truncate">{ep.path}</span>
                  </div>
                ))}
                {(!impactData?.blastRadius?.affectedAPIs || impactData?.blastRadius?.affectedAPIs.length === 0) && (
                  <span className="text-slate-400 text-[11px]">No direct API routes exposed.</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                Foreign Key Cascading Tables ({impactData?.blastRadius?.directRelations?.length || 0})
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {(impactData?.blastRadius?.directRelations || []).map((rel, idx) => (
                  <div key={idx} className="py-1 px-2 rounded bg-surface-card border border-border font-mono text-[11px] text-violet-600 dark:text-violet-300 shadow-sm">
                    {rel.label || `${rel.sourceTable} -> ${rel.targetTable}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
