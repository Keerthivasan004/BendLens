'use client';

import React from 'react';
import { Terminal, Users, Briefcase, Zap } from 'lucide-react';

export default function PersonaSwitcher({ currentRole, setRole }) {
  const roles = [
    {
      id: 'DEVELOPER',
      label: 'Developer View',
      icon: Terminal,
      activeColor: 'bg-blue-900 text-white dark:bg-blue-600',
      tag: 'AST & Call Graphs'
    },
    {
      id: 'MANAGER',
      label: 'Engineering Manager',
      icon: Users,
      activeColor: 'bg-violet-900 text-white dark:bg-violet-600',
      tag: 'Sprint Risk & Coupling'
    },
    {
      id: 'BUSINESS',
      label: 'Business Owner',
      icon: Briefcase,
      activeColor: 'bg-emerald-900 text-white dark:bg-emerald-600',
      tag: 'Customer Journeys'
    },
    {
      id: 'SIMULATOR',
      label: 'What-If Impact Simulator',
      icon: Zap,
      activeColor: 'bg-rose-900 text-white dark:bg-rose-600',
      tag: 'Live Blast Radius'
    }
  ];

  return (
    <div className="w-full flex items-center justify-center my-5">
      <div className="bg-slate-100/80 dark:bg-neutral-900/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 max-w-5xl w-full border border-border transition-colors shadow-inner">
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = currentRole === role.id;

          return (
            <button
              key={role.id}
              onClick={() => setRole(role.id)}
              className={`flex-1 min-w-[200px] flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
                isActive
                  ? `${role.activeColor} shadow-md`
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/60 dark:hover:bg-neutral-800/60'
              }`}
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white dark:bg-neutral-800 text-slate-500 shadow-sm'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <span className={`text-xs font-black block truncate ${isActive ? 'text-white' : 'text-foreground'}`}>
                  {role.label}
                </span>
                <span className={`text-[10px] font-medium block truncate ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {role.tag}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
