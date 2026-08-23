'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, ArrowUpCircle, Sparkles, X, ShieldCheck } from 'lucide-react';

export default function UpdateIndicator() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
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
    try {
      const res = await fetch('/api/updates/apply', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUpdateSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        alert(data.error || 'Update failed');
      }
    } catch (err) {
      alert('Error connecting to update engine');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!updateInfo) return null;

  return (
    <>
      {/* Pill Badge in Nav / Header */}
      {updateInfo.hasUpdate ? (
        <button
          onClick={() => setUpdateModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer animate-pulse"
        >
          <ArrowUpCircle className="h-3.5 w-3.5 text-amber-500" />
          <span>Update Available ({updateInfo.latestVersion})</span>
        </button>
      ) : (
        <button
          onClick={checkForUpdates}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium text-slate-500 hover:text-foreground bg-surface-card border border-border transition-all cursor-pointer"
          title="Click to check for latest updates"
        >
          {isChecking ? (
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>v{updateInfo.currentVersion}</span>
        </button>
      )}

      {/* Auto-Update Modal */}
      {updateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-900 dark:text-blue-400" />
                <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">
                  BendLens Auto-Updater
                </h3>
              </div>
              <button
                onClick={() => setUpdateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white dark:bg-black text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Version</span>
                  <span className="font-mono font-extrabold text-foreground text-sm">v{updateInfo.currentVersion}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-900 dark:text-blue-400 uppercase font-bold block">New Version Available</span>
                  <span className="font-mono font-extrabold text-blue-900 dark:text-blue-400 text-sm">v{updateInfo.latestVersion}</span>
                </div>
              </div>

              {/* Release Notes */}
              {updateInfo.releaseNotes?.length > 0 && (
                <div>
                  <span className="font-bold text-foreground block mb-2">What's New in this update:</span>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                    {updateInfo.releaseNotes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Privacy Notice */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-border">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>All local scanned projects and settings are safely preserved during updates.</span>
              </div>

              {updateSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-center border border-emerald-500/30">
                  Update Applied Successfully! Reloading Studio...
                </div>
              ) : (
                <button
                  onClick={handleApplyUpdate}
                  disabled={isUpdating}
                  className="w-full py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4" />
                  )}
                  <span>{isUpdating ? 'Applying Update...' : '1-Click Update Now'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
