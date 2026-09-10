'use client';

import React from 'react';
import { 
  ShieldCheck, AlertOctagon, TrendingUp, Users, Cpu, GitPullRequest, 
  ArrowUpRight, CheckCircle2, Clock, Calendar, BarChart3, AlertTriangle 
} from 'lucide-react';

export default function ManagerView({ data }) {
  const metrics = data?.metrics || {
    architectureRiskScore: 0,
    moduleCouplingIndex: '0.0 edges/table',
    criticalPathCount: 0,
    sprintDeliveryConfidence: 'Not assessed'
  };

  const hotspots = data?.techDebtHotspots || [];
  const exposureLabel = metrics.architectureRiskScore >= 75
    ? 'High Risk' : metrics.architectureRiskScore >= 45 ? 'Moderate Exposure' : 'Low Risk';
  const riskMatrix = data?.sprintRiskMatrix || [];
  const squads = data?.teamOwnership || [];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Executive KPI Ribbon - Seamless Hairline Dividers (No Boxes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-3">
        {/* Exposure Score */}
        <div className="py-2 sm:py-0 px-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-foreground font-mono">{metrics.architectureRiskScore}</span>
            <span className="text-xs text-muted font-mono">/100</span>
            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ml-1 ${
              metrics.architectureRiskScore >= 75 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {exposureLabel}
            </span>
          </div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Static Exposure Score</span>
        </div>

        {/* Coupling Index */}
        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-foreground font-mono">{metrics.moduleCouplingIndex}</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Module Coupling Index</span>
        </div>

        {/* Connected Models */}
        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-foreground font-mono">{metrics.criticalPathCount} Subsystems</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Connected Subsystems</span>
        </div>

        {/* Delivery Confidence */}
        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{metrics.sprintDeliveryConfidence}</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Delivery Confidence</span>
        </div>
      </div>

      {/* Tech Debt Hotspots & Sprint Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Technical Debt Hotspots - Flat List with Accent Bars (No Nested Boxes) */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card flex flex-col shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-bold text-foreground">Technical Debt & Fragility Hotspots</h3>
            </div>
            <span className="text-xs font-semibold text-muted">{hotspots.length} Flagged</span>
          </div>

          <div className="divide-y divide-border/60 flex-1 overflow-y-auto pr-0.5">
            {hotspots.map((item, idx) => (
              <div 
                key={idx} 
                className="py-3 px-1 border-l-2 border-rose-500/80 pl-3 hover:bg-surface-raised/40 transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground">{item.module}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">
                    {item.coupling}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">{item.refactorAdvice}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-muted">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>Estimated Spike: 1-2 Days</span>
                  </div>
                  <span className="font-mono font-medium text-amber-600 dark:text-amber-400">P1 Priority</span>
                </div>
              </div>
            ))}
            {hotspots.length === 0 && (
              <div className="text-center p-8 text-xs text-muted">No critical tech debt hotspots identified</div>
            )}
          </div>
        </div>

        {/* Sprint & PR Blast Risk Matrix - Flat Table/List */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card flex flex-col shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-bold text-foreground">Sprint Risk Matrix & Feature Blast</h3>
            </div>
            <span className="text-xs font-semibold text-muted">Active Trajectories</span>
          </div>

          <div className="divide-y divide-border/60 flex-1 overflow-y-auto pr-0.5">
            {riskMatrix.map((item, idx) => (
              <div key={idx} className="py-3 px-1 hover:bg-surface-raised/40 transition-colors flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{item.feature}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                      item.riskRating === 'High'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {item.riskRating} Risk
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                  <span>Impacted Files: <strong className="font-mono text-foreground">{item.impactedFiles}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <span>Squads:</span>
                    <span className="text-foreground font-semibold font-mono">{item.affectedSquads.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
            {riskMatrix.length === 0 && (
              <div className="text-center p-8 text-xs text-muted">No active sprint feature risks mapped</div>
            )}
          </div>
        </div>
      </div>

      {/* Team Ownership & Cross-Squad Matrix - Clean Frameless Columns */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Engineering Squad Ownership & Boundary Mapping</h3>
          </div>
          <span className="text-xs font-semibold text-muted">{squads.length} Squads</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
          {squads.map((squad, idx) => (
            <div key={idx} className="pt-3 md:pt-0 md:px-4 first:pl-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h4 className="text-xs font-bold text-foreground">{squad.squad}</h4>
                </div>
                <ul className="space-y-1 text-xs text-muted divide-y divide-border/40">
                  {squad.modules.map((m, mIdx) => (
                    <li key={mIdx} className="py-1.5 flex items-center gap-1.5 font-mono text-[11px]">
                      <CheckCircle2 className="h-3 w-3 text-brand shrink-0" />
                      <span className="truncate text-foreground">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 pt-2 border-t border-border text-[10px] text-muted flex items-center justify-between">
                <span>Assigned:</span>
                <span className="font-mono font-bold text-foreground">{squad.modules.length} modules</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
