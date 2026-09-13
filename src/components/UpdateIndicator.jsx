'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Sparkles, X, ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import UpdateShowcaseModal from '@/components/UpdateShowcaseModal';
import useIsDesktop from '@/lib/useIsDesktop';

export default function UpdateIndicator() {
  // Web users always run the latest deployed build, so the update popup is
  // a downloaded-desktop-app-only surface. Render nothing on the web.
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    currentVersion: '1.0.0',
    latestVersion: '1.1.0',
    hasUpdate: false,
    releaseNotes: []
  });
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);

  // Dismissal is persisted per released version: dismissing v1.2.0 must not
  // silence v1.3.0. A new latestVersion automatically re-arms the banner.
  const dismissedKey = (version) => `bendlens-update-dismissed-${version || 'unknown'}`;

  useEffect(() => {
    setMounted(true);
    if (!isDesktop) return;
    checkForUpdates();
    // Re-check while the app stays open: interval + refetch when the user
    // returns to the tab. Previously the check ran once on mount, so any
    // release published during the session was never announced.
    const pollId = setInterval(() => checkForUpdates(true), 5 * 60 * 1000);
    const onFocus = () => checkForUpdates(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdates(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(pollId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  const checkForUpdates = async (silent = false) => {
    if (!silent) setIsChecking(true);
    try {
      // Desktop-only component: ask for remote release discovery too, since a
      // packaged install has no dist/ folder to compare against locally.
      const res = await fetch('/api/updates/check?source=desktop', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setUpdateInfo(data);
        setCheckError('');
        // Re-arm the banner whenever a NEWER release appears, even if an
        // older one was dismissed.
        try {
          const wasDismissed = localStorage.getItem(dismissedKey(data.latestVersion)) === '1';
          setIsNotificationDismissed(wasDismissed);
        } catch {}
      } else {
        if (!silent) setCheckError(data.error || 'Update check failed.');
      }
    } catch (err) {
      // Never fake success here: keep the previous state so a failed check
      // cannot clear a pending update banner or spoof the version label.
      console.warn('Update check failed:', err);
      if (!silent) setCheckError('Could not reach the local update service.');
    } finally {
      if (!silent) setIsChecking(false);
    }
  };

  const dismissNotification = () => {
    setIsNotificationDismissed(true);
    try {
      localStorage.setItem(dismissedKey(updateInfo.latestVersion), '1');
    } catch {}
  };

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    setUpdateStep('1/3: Synchronizing latest engine & schema visualizers...');
    
    try {
      setTimeout(() => setUpdateStep('2/3: Refreshing brand icons & desktop shortcut...'), 800);
      setTimeout(() => setUpdateStep('3/3: Finalizing Studio update...'), 1600);

      const res = await fetch('/api/updates/apply', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        const newVersion = data.newVersion || updateInfo.latestVersion;
        setUpdateSuccess(true);
        dismissNotification();
        setUpdateInfo((prev) => ({
          ...prev,
          currentVersion: newVersion,
          hasUpdate: false
        }));

        // Keep success confirmation visible for 1.4s so the user sees completion, then close the modal popup
        setTimeout(() => {
          setUpdateModalOpen(false);
          setIsUpdating(false);
          setUpdateSuccess(false);
          setUpdateStep('');
          checkForUpdates();
        }, 1400);
      } else {
        alert(data.error || 'Update process could not be completed.');
        setIsUpdating(false);
        setUpdateStep('');
      }
    } catch (err) {
      console.warn('Update apply failed:', err);
      alert('Update could not be applied. Please check your connection to the local engine and try again.');
      setIsUpdating(false);
      setUpdateStep('');
    }
  };

  // Desktop-only surface: web users auto-update with each deploy, so they
  // never see the popup, the navbar version button, or any update polling.
  if (!isDesktop) return null;

  const floatingNotification = (mounted && updateInfo.hasUpdate && !isNotificationDismissed && !updateModalOpen) ? (
    <div className="fixed bottom-5 right-5 z-[9990] max-w-sm w-[calc(100vw-2.5rem)] sm:w-[380px] p-4 rounded-2xl bg-white/95 dark:bg-[#070b16]/95 border border-blue-200 dark:border-blue-500/40 shadow-modal dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.25)] backdrop-blur-xl animate-rise text-foreground select-none">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-blue-700 dark:text-sky-400">
            v{updateInfo.latestVersion} Available
          </span>
        </div>

        <button
          onClick={dismissNotification}
          className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-raised dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss notification"
          aria-label="Dismiss update notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Notification Body */}
      <div className="space-y-1 mb-3.5">
        <h4 className="text-xs font-bold text-foreground">
          New BendLens Architectural Engine Ready
        </h4>
        <p className="text-[11px] text-muted leading-relaxed">
          Universal polyglot DB parsing, blast ripple simulation, and multi-tier C4 flowchart diagrams.
        </p>
        {updateInfo.updateArtifact && (
          <p className="text-[10px] font-mono text-muted/80 truncate" title={updateInfo.updateArtifact}>
            Installer ready: {updateInfo.updateArtifact}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-border dark:border-white/10">
        <button
          onClick={() => setUpdateModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-blue-600/10 hover:bg-blue-600/15 text-blue-700 border border-blue-500/30 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-sky-300 dark:border-blue-500/40 transition-all cursor-pointer shadow-sm"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Watch What's New</span>
        </button>

        <button
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-[0_2px_12px_rgba(56,189,248,0.35)] transition-all cursor-pointer disabled:opacity-50"
        >
          {isUpdating ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          <span>Update Now</span>
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Navbar Trigger Button */}
      {updateInfo.hasUpdate ? (
        <button
          onClick={() => setUpdateModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600/10 text-blue-700 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-600/[0.14] dark:from-blue-500/20 dark:to-sky-500/20 dark:bg-gradient-to-r dark:text-sky-300 dark:border-blue-500/40 dark:hover:border-blue-400 shadow-sm dark:shadow-[0_2px_10px_rgba(56,189,248,0.25)] transition-all cursor-pointer animate-pulse"
          title="Click to view animated video showcase of new features"
        >
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          <span>Update Ready (v{updateInfo.latestVersion})</span>
        </button>
      ) : (
        <button
          onClick={() => {
            checkForUpdates();
            setUpdateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-sky-300 dark:border-blue-800/80 dark:hover:bg-blue-900/80 transition-all cursor-pointer shadow-sm"
          title={checkError || 'Click to check for updates & watch feature showcase'}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
          <span>v{updateInfo.currentVersion} • {isChecking ? 'Checking…' : checkError ? 'Check failed — retry' : 'Up to Date'}</span>
        </button>
      )}

      {/* Floating Notification Portal (Appears when an update is available) */}
      {mounted && typeof document !== 'undefined' && floatingNotification && createPortal(floatingNotification, document.body)}

      {/* Interactive Video-Animated Feature Showcase Modal */}
      {mounted && typeof document !== 'undefined' && updateModalOpen && createPortal(
        <UpdateShowcaseModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          onApplyUpdate={handleApplyUpdate}
          isUpdating={isUpdating}
          updateStep={updateStep}
          updateSuccess={updateSuccess}
          updateInfo={updateInfo}
        />,
        document.body
      )}
    </>
  );
}
