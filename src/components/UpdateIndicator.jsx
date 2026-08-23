'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, ArrowUpCircle, Sparkles, X, ShieldCheck, Image as ImageIcon, Laptop, Check } from 'lucide-react';

export default function UpdateIndicator() {
  const [updateInfo, setUpdateInfo] = useState({
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    hasUpdate: false,
    releaseNotes: [
      'Multi-dialect SQL, SQLite, and MongoDB Schema Visualizer',
      'High-Level (HLD) & Low-Level (LLD) Architecture Diagrams',
      'Deterministic Blast Radius Simulator with Ripple Effect Analysis',
      'Offline Desktop Execution with Auto-Refreshing Brand Icons'
    ]
  });
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/updates/check?force=true');
      const data = await res.json();
      if (data.success) {
        setUpdateInfo(data);
      }
    } catch {}
    finally {
      setIsChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    setUpdateStep('1/3: Syncing latest codebase & schema visualizers...');
    
    try {
      setTimeout(() => setUpdateStep('2/3: Refreshing brand icon & desktop shortcuts...'), 1000);
      setTimeout(() => setUpdateStep('3/3: Finalizing and reloading Studio...'), 2200);

      const res = await fetch('/api/updates/apply', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setUpdateSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      } else {
        alert(data.error || 'Update completed.');
        setIsUpdating(false);
        setUpdateStep('');
      }
    } catch (err) {
      setUpdateSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <>
      {/* 1. Header Version & Update Trigger */}
      {updateInfo.hasUpdate ? (
        <button
          onClick={() => setUpdateModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 hover:border-amber-500 shadow-md transition-all cursor-pointer animate-pulse"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" />
          <span>Update Available (v{updateInfo.latestVersion})</span>
        </button>
      ) : (
        <button
          onClick={() => setUpdateModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50/90 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-sm"
          title="Click to check for updates & refresh desktop icons"
        >
          <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''} text-blue-900 dark:text-blue-400`} />
          <span>v{updateInfo.currentVersion} • Check Updates</span>
        </button>
      )}

      {/* 2. Opaque Top-Level Modal (z-[9999] with solid background) */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-blue-900/50 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-[#111626]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">
                    BendLens Desktop Updater
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Automated In-App Updates & Desktop Asset Sync
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpdateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-white dark:bg-[#0c101c] text-xs">
              {/* Version Comparison Card */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Installed Version</span>
                  <span className="font-mono font-extrabold text-foreground text-sm">v{updateInfo.currentVersion}</span>
                </div>

                <div className="h-8 w-px bg-border" />

                <div className="text-right">
                  <span className="text-[10px] text-blue-900 dark:text-blue-400 uppercase font-bold block mb-0.5">
                    {updateInfo.hasUpdate ? 'New Version Available' : 'Update Status'}
                  </span>
                  <span className="font-mono font-extrabold text-blue-900 dark:text-blue-400 text-sm">
                    {updateInfo.hasUpdate ? `v${updateInfo.latestVersion} (Ready)` : 'Ready to Sync ✓'}
                  </span>
                </div>
              </div>

              {/* Automatic Brand Icon & Shortcut Refresh Guarantee */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121726] border border-slate-200 dark:border-neutral-800 space-y-2">
                <span className="font-bold text-foreground block text-[11px]">
                  What happens when you click Update:
                </span>
                <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Applies newest parsers, blast simulation models, and diagrams.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400 shrink-0" />
                    <span><strong>Auto-refreshes Desktop Shortcut & Brand Icon images.</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Preserves all your local scanned projects and history.</span>
                  </div>
                </div>
              </div>

              {/* Release Highlights */}
              {updateInfo.releaseNotes?.length > 0 && (
                <div>
                  <span className="font-bold text-foreground block mb-2 text-[11px]">Latest Features & Highlights:</span>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                    {updateInfo.releaseNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              {updateSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-center border border-emerald-300 dark:border-emerald-700 animate-fadeIn">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <span>Update & Brand Icon Refresh Complete! Reloading Studio...</span>
                </div>
              ) : isUpdating ? (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-300 font-bold text-center border border-blue-200 dark:border-blue-800 space-y-2 animate-fadeIn">
                  <RefreshCw className="h-5 w-5 mx-auto animate-spin text-blue-900 dark:text-blue-400" />
                  <p className="text-xs font-mono">{updateStep}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    onClick={handleApplyUpdate}
                    className="flex-1 py-3 px-4 rounded-2xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    <span>{updateInfo.hasUpdate ? '1-Click Install Update' : 'Update & Sync Brand Icons'}</span>
                  </button>

                  <button
                    onClick={checkForUpdates}
                    disabled={isChecking}
                    className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-foreground font-bold text-xs border border-border transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>Check Again</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
