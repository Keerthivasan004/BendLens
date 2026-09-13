'use client';

import React from 'react';
import { Terminal, Users, Briefcase, Zap } from 'lucide-react';

export default function PersonaSwitcher({ currentRole, setRole, data }) {
  const tablesCount = data?.schema?.tables?.length || 0;
  const apisCount = data?.code?.endpoints?.length || 0;
  const debtCount = data?.personas?.manager?.techDebtHotspots?.length || 0;
  const riskScore = data?.sampleImpact?.blastRadius?.riskScore || 65;
  const domainsCount = data?.personas?.business?.capabilities?.length || 0;

  const roles = [
    {
      id: 'DEVELOPER',
      label: 'Developer',
      icon: Terminal,
      badge: `${tablesCount} tables · ${apisCount} APIs`,
      tag: 'AST · ERD · LLD',
      accent: 'text-blue-500',
    },
    {
      id: 'MANAGER',
      label: 'Engineering Manager',
      icon: Users,
      badge: `${debtCount} debt items · risk`,
      tag: 'Coupling · Sprint',
      accent: 'text-violet-500',
    },
    {
      id: 'BUSINESS',
      label: 'Business Owner',
      icon: Briefcase,
      badge: `${domainsCount} domains`,
      tag: 'Journeys · SLA',
      accent: 'text-emerald-500',
    },
    {
      id: 'SIMULATOR',
      label: 'What-If Simulator',
      icon: Zap,
      badge: `${riskScore}% blast`,
      tag: 'Live ripple engine',
      accent: 'text-rose-500',
    }
  ];

  return (
    <div className="w-full my-4 sm:my-5 animate-fadeIn" aria-label="Perspective Switcher">
      <div className="section-label mb-2 px-0.5">Studio perspective</div>
      <div className="p-1.5 rounded-2xl bg-surface border border-border flex flex-wrap lg:flex-nowrap items-stretch gap-1.5 w-full shadow-card">
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = currentRole === role.id;

          return (
            <button
              key={role.id}
              onClick={() => setRole(role.id)}
              aria-pressed={isActive}
              className={`flex-1 min-w-[200px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-left border ${
                isActive
                  ? 'bg-surface-raised text-foreground shadow-card border-border ring-1 ring-brand/25'
                  : 'text-muted hover:text-foreground hover:bg-surface-subtle border-transparent hover:border-border'
              }`}
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all border ${
                  isActive
                    ? 'bg-surface text-foreground border-border shadow-subtle'
                    : 'bg-transparent text-muted border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? role.accent : ''}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`text-[13px] font-bold tracking-tight truncate ${isActive ? 'text-foreground' : 'text-muted'}`}>
                    {role.label}
                  </span>
                  {role.id === 'SIMULATOR' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/25 shrink-0 uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-muted truncate mt-0.5">
                  {role.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
