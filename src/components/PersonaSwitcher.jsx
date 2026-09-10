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
      label: 'Developer View',
      icon: Terminal,
      badge: `${tablesCount} Tables · ${apisCount} APIs`,
      tag: 'AST, ERD & LLD Handlers'
    },
    {
      id: 'MANAGER',
      label: 'Engineering Manager',
      icon: Users,
      badge: `${debtCount} Debt Items · Risk Score`,
      tag: 'Coupling & Sprint Governance'
    },
    {
      id: 'BUSINESS',
      label: 'Business Owner',
      icon: Briefcase,
      badge: `${domainsCount} Business Domains`,
      tag: 'Customer Journeys & SLA'
    },
    {
      id: 'SIMULATOR',
      label: 'What-If Impact Simulator',
      icon: Zap,
      badge: `${riskScore}% Calculated Blast`,
      tag: 'Live "What-If" Ripple Engine'
    }
  ];

  return (
    <div className="w-full flex items-center justify-center my-4 sm:my-5" aria-label="Perspective Switcher">
      <div className="p-1 rounded-xl bg-surface-raised border border-border flex flex-wrap lg:flex-nowrap items-stretch gap-1 max-w-5xl w-full shadow-xs">
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = currentRole === role.id;

          return (
            <button
              key={role.id}
              onClick={() => setRole(role.id)}
              className={`flex-1 min-w-[200px] flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer text-left ${
                isActive
                  ? 'bg-surface-card text-foreground shadow-sm border border-border ring-1 ring-black/5 dark:ring-white/5'
                  : 'text-muted hover:text-foreground hover:bg-surface-subtle border border-transparent'
              }`}
            >
              <div
                className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-surface-raised text-brand border border-border'
                    : 'bg-transparent text-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold truncate ${isActive ? 'text-foreground' : 'text-muted'}`}>
                    {role.label}
                  </span>
                  {role.id === 'SIMULATOR' && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0 uppercase tracking-wide">
                      Live
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono text-muted/80 truncate">
                    {role.badge}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
