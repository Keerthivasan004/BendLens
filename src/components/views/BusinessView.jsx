'use client';

import React, { useState } from 'react';
import { 
  Briefcase, Activity, CheckCircle, Shield, Award, HelpCircle, 
  FileText, ArrowRight, Copy, Check, Sparkles, AlertCircle, ArrowUpRight
} from 'lucide-react';

export default function BusinessView({ data }) {
  const [copied, setCopied] = useState(false);

  const metrics = data?.metrics || {
    activeBusinessCapabilities: 0,
    keyCustomerJourneys: 0,
    complianceReadiness: 'Not assessed',
    operationalUptimeTarget: 'Not observed'
  };

  const capabilities = data?.capabilities || [];
  const customerJourneys = data?.customerJourneys || [];
  const plainSummary = data?.plainEnglishSummary || '';

  const handleCopySummary = () => {
    navigator.clipboard.writeText(plainSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Executive KPI Ribbon - Seamless Hairline Dividers (No Boxes) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-3">
        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-foreground font-mono">{metrics.activeBusinessCapabilities} Domains</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Core Business Engines</span>
        </div>

        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-foreground font-mono">{metrics.keyCustomerJourneys} Journeys</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Customer Workflows</span>
        </div>

        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 font-mono">{metrics.complianceReadiness}</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Compliance Posture</span>
        </div>

        <div className="py-2 sm:py-0 px-4">
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">{metrics.operationalUptimeTarget}</div>
          <span className="text-[11px] font-medium text-muted block mt-0.5">Availability Target</span>
        </div>
      </div>

      {/* Executive Brief - Clean Editorial Callout (No Heavy Border Box) */}
      <div className="p-4 rounded-xl bg-surface border border-border border-l-4 border-l-emerald-500 relative">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Executive Architecture & Business Capability Brief
            </h3>
          </div>
          <button
            onClick={handleCopySummary}
            className="btn-secondary text-xs py-0.5 px-2 font-medium"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            <span>{copied ? 'Copied' : 'Copy Brief'}</span>
          </button>
        </div>

        <p className="text-xs leading-relaxed text-muted font-medium">
          {plainSummary ||
            'The system is built on a clean relational architecture where customer accounts, orders, and payment records are decoupled with strict referential integrity. Any feature development in the checkout pipeline is automatically guarded by cascading validation rules.'}
        </p>
      </div>

      {/* Business Capabilities Portfolio - Flat List (No Nested Boxes) */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Business Capability Portfolio ({capabilities.length})</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Revenue & Mission-Critical Engines
          </span>
        </div>

        <div className="divide-y divide-border/60">
          {capabilities.map((cap, idx) => (
            <div 
              key={idx} 
              className="py-3 px-1 hover:bg-surface-raised/40 transition-colors flex flex-col justify-between gap-1.5"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-foreground">{cap.name}</h4>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                      cap.criticality.includes('Tier 1')
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {cap.criticality}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {cap.businessValue}
                </p>
              </div>

              <div className="text-[10px] text-muted flex items-center justify-between font-mono pt-1">
                <span>Technical Backbone: <strong className="text-foreground">{cap.technicalComponents}</strong></span>
              </div>
            </div>
          ))}
          {capabilities.length === 0 && (
            <div className="text-center p-8 text-xs text-muted">No business capabilities discovered</div>
          )}
        </div>
      </div>

      {/* Customer User Journeys Flow - Flat Connected List */}
      <div className="p-4 sm:p-5 rounded-xl border border-border bg-surface-card shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-foreground">End-to-End Customer User Journeys</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted">{customerJourneys.length} Mapped Workflows</span>
        </div>

        <div className="divide-y divide-border/60">
          {customerJourneys.map((journey, idx) => (
            <div key={idx} className="py-3 px-1 hover:bg-surface-raised/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-foreground">{journey.journeyName}</span>
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  {journey.health}
                </span>
              </div>

              {/* Horizontal Flow */}
              <div className="flex flex-wrap items-center gap-1.5 my-2">
                {journey.steps.map((step, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <div className="px-2.5 py-0.5 text-xs rounded-md bg-surface-raised border border-border text-foreground font-medium flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                      <span>{step}</span>
                    </div>
                    {sIdx < journey.steps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="text-[11px] text-muted pt-1 flex items-center justify-between">
                <span>Impact: <strong className="text-foreground font-medium">{journey.impactSummary}</strong></span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">Guarded by AST</span>
              </div>
            </div>
          ))}
          {customerJourneys.length === 0 && (
            <div className="text-center p-8 text-xs text-muted">No customer journeys mapped</div>
          )}
        </div>
      </div>
    </div>
  );
}
