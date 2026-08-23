'use client';

import React from 'react';
import { ShieldCheck, AlertOctagon, TrendingUp, Users, Cpu, GitPullRequest, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function ManagerView({ data }) {
  const metrics = data?.metrics || {
    architectureRiskScore: 72,
    moduleCouplingIndex: '2.4 edges/node',
    criticalPathCount: 4,
    sprintDeliveryConfidence: '85% High'
  };

  const hotspots = data?.techDebtHotspots || [];
  const riskMatrix = data?.sprintRiskMatrix || [];
  const squads = data?.teamOwnership || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-border dark:border-violet-500/40 dark:bg-[#141224]">
          <span className="text-[11px] uppercase font-semibold text-violet-600 dark:text-violet-400">Architecture Risk Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-foreground">{metrics.architectureRiskScore}/100</span>
            <span className="text-xs font-semibold text-amber-500">Moderate</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Coupling & blast exposure</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-border dark:border-blue-500/40 dark:bg-[#111624]">
          <span className="text-[11px] uppercase font-semibold text-blue-600 dark:text-blue-400">Module Coupling Index</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{metrics.moduleCouplingIndex}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Average dependencies per component</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-border dark:border-amber-500/40 dark:bg-[#1c1810]">
          <span className="text-[11px] uppercase font-semibold text-amber-600 dark:text-amber-400">Critical Core Paths</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{metrics.criticalPathCount} Subsystems</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Auth, Orders, Payments, Invoices</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-border dark:border-emerald-500/40 dark:bg-[#101815]">
          <span className="text-[11px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Sprint Delivery Confidence</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{metrics.sprintDeliveryConfidence}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Regression risk under control</span>
        </div>
      </div>

      {/* Tech Debt Hotspots & Sprint Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical Debt & Coupling Hotspots */}
        <div className="glass-panel p-5 rounded-2xl border border-border dark:border-slate-700 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-bold text-foreground">Technical Debt & Fragility Hotspots</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{hotspots.length} Flagged Modules</span>
          </div>

          <div className="space-y-3">
            {hotspots.map((item, idx) => (
              <div key={idx} className="bg-surface-card dark:bg-[#121624] p-4 rounded-xl border border-border dark:border-slate-700 hover:border-rose-500/50 transition-all shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-foreground">{item.module}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {item.coupling}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{item.refactorAdvice}</p>
                <div className="flex items-center gap-2 text-[10px] text-amber-500 font-medium">
                  <TrendingUp className="h-3 w-3" />
                  <span>Recommendation: Schedule refactor spike in next sprint.</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sprint & PR Impact Matrix */}
        <div className="glass-panel p-5 rounded-2xl border border-border dark:border-slate-700 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-bold text-foreground">Sprint & Feature Blast Risk Matrix</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Active Change Trajectories</span>
          </div>

          <div className="space-y-3">
            {riskMatrix.map((item, idx) => (
              <div key={idx} className="bg-surface-card dark:bg-[#121624] p-4 rounded-xl border border-border dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">{item.feature}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      item.riskRating === 'High'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {item.riskRating} Blast Risk
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-border/50">
                  <span>Impacted Files: <strong className="text-foreground">{item.impactedFiles}</strong></span>
                  <div className="flex items-center gap-1">
                    <span>Squads:</span>
                    <span className="text-cyan-600 dark:text-cyan-300 font-medium">{item.affectedSquads.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Ownership & Cross-Squad Matrix */}
      <div className="glass-panel p-5 rounded-2xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-foreground">Engineering Squad Ownership & Boundary Mapping</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {squads.map((squad, idx) => (
            <div key={idx} className="bg-surface-card p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-bold text-foreground">{squad.squad}</h4>
              </div>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {squad.modules.map((m, mIdx) => (
                  <li key={mIdx} className="flex items-center gap-1.5 font-mono text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-cyan-500 dark:text-cyan-400 shrink-0" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
