'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, ArrowUpCircle, Sparkles, X, ShieldCheck, Image, Laptop, Check } from 'lucide-react';

export default function UpdateIndicator() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isLocalApp, setIsLocalApp] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.endsWith('.local');
      setIsLocalApp(isLocal);
    }
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/updates/check');
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
    setUpdateStep('Pulling latest updates & architecture engines...');
    
    try {
      setTimeout(() => setUpdateStep('Refreshing desktop brand icon & shortcuts...'), 1200);

      const res = await fetch('/api/updates/apply', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setUpdateStep('Finalizing and reloading Studio...');
        setUpdateSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1800);
      } else {
        alert(data.error || 'Update failed');
        setIsUpdating(false);
        setUpdateStep('');
      }
    } catch (err) {
      alert('Error connecting to update engine');
      setIsUpdating(false);
      setUpdateStep('');
    }
  };

  if (!updateInfo) return null;

  return (
    <>
      {/* 1. Update Available Button (High-Visibility Glow for Downloaded/Desktop Users) */}
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-medium text-slate-500 hover:text-foreground bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 border border-border transition-all cursor-pointer shadow-sm"
          title="Click to check updates & desktop settings"
        >
          {isChecking ? (
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>v{updateInfo.currentVersion}</span>
        </button>
      )}

      {/* 2. Interactive Auto-Update Modal */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-900 dark:text-blue-400" />
                <div>
                  <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">
                    BendLens Desktop Auto-Updater
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Automated In-App Updates & Desktop Asset Refresh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpdateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 bg-white dark:bg-black text-xs">
              {/* Version Comparison Card */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Current Version</span>
                  <span className="font-mono font-extrabold text-foreground text-sm">v{updateInfo.currentVersion}</span>
                </div>

                <div className="h-8 w-px bg-border" />

                <div className="text-right">
                  <span className="text-[10px] text-blue-900 dark:text-blue-400 uppercase font-bold block mb-0.5">
                    {updateInfo.hasUpdate ? 'New Version Available' : 'Status'}
                  </span>
                  <span className="font-mono font-extrabold text-blue-900 dark:text-blue-400 text-sm">
                    {updateInfo.hasUpdate ? `v${updateInfo.latestVersion}` : 'Up to Date ✓'}
                  </span>
                </div>
              </div>

              {/* Automatic Asset & Brand Icon Refresh Guarantee */}
              <div className="p-3.5 rounded-xl bg-surface-card border border-border space-y-2">
                <span className="font-bold text-foreground block text-[11px]">
                  What happens when you click Update:
                </span>
                <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Applies newest parsers, blast simulation models, and diagrams.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Image className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400 shrink-0" />
                    <span><strong>Auto-refreshes Desktop Shortcut Icon & downloaded brand images.</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Preserves all your local scan history and project data safely.</span>
                  </div>
                </div>
              </div>

              {/* Release Notes */}
              {updateInfo.releaseNotes?.length > 0 && (
                <div>
                  <span className="font-bold text-foreground block mb-2 text-[11px]">Latest Release Highlights:</span>
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

              {/* Progress / Action Trigger */}
              {updateSuccess ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-center border border-emerald-300 dark:border-emerald-700 animate-fadeIn">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <span>Update & Brand Icon Refresh Complete! Reloading Studio...</span>
                </div>
              ) : isUpdating ? (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-300 font-bold text-center border border-blue-200 dark:border-blue-800 space-y-2">
                  <RefreshCw className="h-5 w-5 mx-auto animate-spin text-blue-900 dark:text-blue-400" />
                  <p className="text-xs font-mono">{updateStep}</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                  <button
                    onClick={handleApplyUpdate}
                    className="w-full py-3.5 px-5 rounded-2xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    <span>{updateInfo.hasUpdate ? '1-Click Install Latest Version' : 'Force Refresh & Update Assets'}</span>
                  </button>

                  <button
                    onClick={checkForUpdates}
                    disabled={isChecking}
                    className="w-full sm:w-auto py-3.5 px-4 rounded-2xl bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-foreground font-bold text-xs border border-border transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>Check Now</span>
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
