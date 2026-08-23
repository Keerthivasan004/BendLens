'use client';

import React from 'react';
import { Briefcase, Activity, CheckCircle, Shield, Award, HelpCircle, FileText, ArrowRight } from 'lucide-react';

export default function BusinessView({ data }) {
  const metrics = data?.metrics || {
    activeBusinessCapabilities: 4,
    keyCustomerJourneys: 3,
    complianceReadiness: '95% (GDPR/PII Ready)',
    operationalUptimeTarget: '99.95%'
  };

  const capabilities = data?.capabilities || [];
  const customerJourneys = data?.customerJourneys || [];
  const plainSummary = data?.plainEnglishSummary || '';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-border dark:border-emerald-500/40 dark:bg-[#101815]">
          <span className="text-[11px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Core Business Engines</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{metrics.activeBusinessCapabilities} Domains</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Auth, Orders, Payments, Catalog</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-border dark:border-cyan-500/40 dark:bg-[#0f171e]">
          <span className="text-[11px] uppercase font-semibold text-cyan-600 dark:text-cyan-400">Active Customer Journeys</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{metrics.keyCustomerJourneys} Workflows</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">End-to-End Buyer Operations</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-border dark:border-violet-500/40 dark:bg-[#141224]">
          <span className="text-[11px] uppercase font-semibold text-violet-600 dark:text-violet-400">Compliance Readiness</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{metrics.complianceReadiness}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">PII & Financial Audit Ready</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-border dark:border-amber-500/40 dark:bg-[#1a1710]">
          <span className="text-[11px] uppercase font-semibold text-amber-600 dark:text-amber-400">Target SLA Availability</span>
          <div className="text-2xl font-extrabold text-foreground mt-1">{metrics.operationalUptimeTarget}</div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Zero-downtime database migrations</span>
        </div>
      </div>

      {/* Plain-English Executive Summary */}
      <div className="glass-panel p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-[#0c1813] dark:border-emerald-500/50">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">Executive Architecture & Business Capability Brief</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {plainSummary ||
            'The system is built on a clean relational architecture where customer accounts, orders, and payment records are decoupled with strict referential integrity. Any feature development in the checkout pipeline is automatically guarded by cascading validation rules.'}
        </p>
      </div>

      {/* Business Capabilities Grid */}
      <div className="glass-panel p-5 rounded-2xl border border-border dark:border-slate-700">
        <div className="flex items-center gap-2 pb-3 border-b border-border dark:border-slate-700 mb-4">
          <Briefcase className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-foreground">Business Capability Portfolio</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capabilities.map((cap, idx) => (
            <div key={idx} className="bg-surface-card dark:bg-[#121624] p-4 rounded-xl border border-border dark:border-slate-700 hover:border-emerald-500/50 transition-all shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-foreground">{cap.name}</h4>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    cap.criticality.includes('Tier 1')
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}
                >
                  {cap.criticality}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">{cap.businessValue}</p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-border/50 dark:border-slate-700/60 flex items-center justify-between font-mono">
                <span>Components:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-medium">{cap.technicalComponents}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Journey Health */}
      <div className="glass-panel p-5 rounded-2xl border border-border dark:border-slate-700">
        <div className="flex items-center gap-2 pb-3 border-b border-border dark:border-slate-700 mb-4">
          <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-bold text-foreground">End-to-End Customer User Journeys</h3>
        </div>

        <div className="space-y-4">
          {customerJourneys.map((journey, idx) => (
            <div key={idx} className="bg-surface-card dark:bg-[#121624] p-4 rounded-xl border border-border dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-foreground">{journey.journeyName}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {journey.health}
                </span>
              </div>

              {/* Steps Flow */}
              <div className="flex flex-wrap items-center gap-2 my-3">
                {journey.steps.map((step, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <div className="px-3 py-1 text-xs rounded-lg bg-surface-raised border border-border text-foreground font-medium shadow-sm">
                      {step}
                    </div>
                    {sIdx < journey.steps.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-border/40">
                <span>Impact Assessment: </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{journey.impactSummary}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
