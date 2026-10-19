'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Sparkles, X, ArrowRight, Play, CheckCircle2, Clock, Timer } from 'lucide-react';
import UpdateShowcaseModal from '@/components/UpdateShowcaseModal';
import useIsDesktop from '@/lib/useIsDesktop';

export default function UpdateIndicator() {
  // Web users always run the latest deployed build, so the update popup is
  // a downloaded-desktop-app-only surface. Render nothing on the web.
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    currentVersion: '1.1.51',
    latestVersion: '1.1.51',
    hasUpdate: false,
    releaseNotes: []
  });
  const [downloadProgress, setDownloadProgress] = useState({
    percent: 0,
    transferredMb: '0',
    totalMb: '0',
    speedMb: '0'
  });
  const [autoUpdateStatus, setAutoUpdateStatus] = useState('idle'); // 'idle' | 'downloading' | 'ready' | 'applying'
  const [readyInstallerPath, setReadyInstallerPath] = useState(null);
  const [autoApplyCountdown, setAutoApplyCountdown] = useState(null);
  const hasAutoAppliedRef = React.useRef(false);

  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateElapsedTime, setUpdateElapsedTime] = useState(0);
  const [updateFinalDuration, setUpdateFinalDuration] = useState('');
  const [checkError, setCheckError] = useState('');
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);

  const formatTimer = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
  };

  // Dismissal is persisted per released version: dismissing v1.2.0 must not
  // silence v1.3.0. A new latestVersion automatically re-arms the banner.
  const dismissedKey = (version) => `bendlens-update-dismissed-${version || 'unknown'}`;

  // Continuous background progress polling while downloading
  useEffect(() => {
    if (autoUpdateStatus !== 'downloading') return;
    let isCancelled = false;

    const poll = async () => {
      try {
        const ver = updateInfo?.latestVersion;
        if (!ver) return;
        const art = updateInfo?.updateArtifact || `BendLens-Setup-${ver}.exe`;
        const res = await fetch(`/api/updates/download?version=${ver}&artifact=${encodeURIComponent(art)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (isCancelled || !data) return;

        if (data.status === 'ready') {
          setAutoUpdateStatus('ready');
          if (data.installerPath) setReadyInstallerPath(data.installerPath);
          setDownloadProgress({
            percent: 100,
            transferredMb: data.progress?.totalMb || 'Ready',
            totalMb: data.progress?.totalMb || 'Ready',
            speedMb: '0'
          });
        } else if (data.status === 'downloading') {
          if (data.progress) {
            setDownloadProgress(data.progress);
          }
        }
      } catch (err) {
        console.warn('Update polling notice:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 750);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [autoUpdateStatus, updateInfo?.latestVersion, updateInfo?.updateArtifact]);

  // Zero-click Auto-Apply and Auto-Restart when update is ready
  useEffect(() => {
    if (autoUpdateStatus !== 'ready') {
      setAutoApplyCountdown(null);
      return;
    }

    if (hasAutoAppliedRef.current) return;

    let countdown = 3;
    setAutoApplyCountdown(countdown);

    const timer = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(timer);
        setAutoApplyCountdown(0);
        if (!hasAutoAppliedRef.current) {
          hasAutoAppliedRef.current = true;
          handleRestartNow();
        }
      } else {
        setAutoApplyCountdown(countdown);
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUpdateStatus]);

  useEffect(() => {
    setMounted(true);
    checkForUpdates();
    if (!isDesktop) return;

    // Listen to native Electron desktop auto-updater events
    const unsubs = [];
    if (typeof window !== 'undefined' && window.bendlensDesktop) {
      if (typeof window.bendlensDesktop.onUpdateProgress === 'function') {
        const u1 = window.bendlensDesktop.onUpdateProgress((prog) => {
          if (prog) {
            setDownloadProgress(prog);
            setAutoUpdateStatus('downloading');
          }
        });
        if (typeof u1 === 'function') unsubs.push(u1);
      }
      if (typeof window.bendlensDesktop.onUpdateStatusChanged === 'function') {
        const u2 = window.bendlensDesktop.onUpdateStatusChanged((state) => {
          if (state?.status) {
            setAutoUpdateStatus(state.status);
            if (state.installerPath) setReadyInstallerPath(state.installerPath);
            if (state.progress) setDownloadProgress(state.progress);
          }
        });
        if (typeof u2 === 'function') unsubs.push(u2);
      }
      if (typeof window.bendlensDesktop.onUpdateComplete === 'function') {
        const u3 = window.bendlensDesktop.onUpdateComplete((info) => {
          setAutoUpdateStatus('ready');
          if (info?.installerPath) setReadyInstallerPath(info.installerPath);
          setDownloadProgress((prev) => ({ ...prev, percent: 100 }));
        });
        if (typeof u3 === 'function') unsubs.push(u3);
      }
    }

    checkForUpdates();

    let lastCheckAt = 0;
    const pollId = setInterval(() => checkForUpdates(true), 5 * 60 * 1000);
    const onFocus = () => {
      const now = Date.now();
      if (now - lastCheckAt >= 60000) {
        lastCheckAt = now;
        checkForUpdates(true);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastCheckAt >= 60000) {
          lastCheckAt = now;
          checkForUpdates(true);
        }
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsubs.forEach((fn) => {
        try { fn(); } catch {}
      });
      clearInterval(pollId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  const checkForUpdates = async (silent = false) => {
    if (!silent) setIsChecking(true);
    try {
      const res = await fetch('/api/updates/check?source=desktop', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setUpdateInfo(data);
        setCheckError('');

        // 1. Electron Native Desktop Auto-Update Engine
        if (typeof window !== 'undefined' && window.bendlensDesktop?.getUpdateStatus) {
          const statusObj = await window.bendlensDesktop.getUpdateStatus();
          if (statusObj?.status === 'ready') {
            setAutoUpdateStatus('ready');
            if (statusObj.installerPath) setReadyInstallerPath(statusObj.installerPath);
            if (statusObj.progress) setDownloadProgress(statusObj.progress);
          } else if (statusObj?.status === 'downloading') {
            setAutoUpdateStatus('downloading');
            if (statusObj.progress) setDownloadProgress(statusObj.progress);
          } else if (data.hasUpdate && (statusObj?.status === 'idle' || !statusObj)) {
            // Automatically start background streaming download without user interaction
            setAutoUpdateStatus('downloading');
            if (typeof window.bendlensDesktop.startUpdateDownload === 'function') {
              window.bendlensDesktop.startUpdateDownload({
                version: data.latestVersion,
                artifactName: data.updateArtifact,
                downloadUrl: data.downloadUrl
              });
            }
          }
        } else if (data.hasUpdate) {
          // 2. Non-Electron local runtime: background streaming download without disturbing current session
          checkOrStartLocalBackgroundDownload(data);
        }

        try {
          const wasDismissed = localStorage.getItem(dismissedKey(data.latestVersion)) === '1';
          setIsNotificationDismissed(wasDismissed);
        } catch {}
      } else {
        if (!silent) setCheckError(data.error || 'Update check failed.');
      }
    } catch (err) {
      console.warn('Update check failed:', err);
      if (!silent) setCheckError('Could not reach the local update service.');
    } finally {
      if (!silent) setIsChecking(false);
    }
  };

  const checkOrStartLocalBackgroundDownload = async (data) => {
    try {
      const statusRes = await fetch(`/api/updates/download?version=${data.latestVersion}&artifact=${encodeURIComponent(data.updateArtifact || '')}`, { cache: 'no-store' });
      const statusData = await statusRes.json().catch(() => null);

      if (statusData?.status === 'ready') {
        setAutoUpdateStatus('ready');
        if (statusData.installerPath) setReadyInstallerPath(statusData.installerPath);
        setDownloadProgress({
          percent: 100,
          transferredMb: statusData.progress?.totalMb || 'Ready',
          totalMb: statusData.progress?.totalMb || 'Ready',
          speedMb: '0'
        });
        return;
      }

      setAutoUpdateStatus('downloading');
      if (statusData?.progress) setDownloadProgress(statusData.progress);

      // Initiate background download into pending-update/ silently if not already downloading
      if (statusData?.status !== 'downloading') {
        fetch('/api/updates/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: data.latestVersion,
            artifactName: data.updateArtifact,
            downloadUrl: data.downloadUrl
          })
        }).then(r => r.json()).then(dlData => {
          if (dlData?.status === 'ready') {
            setAutoUpdateStatus('ready');
            if (dlData.installerPath) setReadyInstallerPath(dlData.installerPath);
            setDownloadProgress({
              percent: 100,
              transferredMb: dlData.progress?.totalMb || 'Ready',
              totalMb: dlData.progress?.totalMb || 'Ready',
              speedMb: '0'
            });
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Background update check notice:', err);
    }
  };

  const dismissNotification = () => {
    setIsNotificationDismissed(true);
    try {
      localStorage.setItem(dismissedKey(updateInfo.latestVersion), '1');
    } catch {}
  };

  const handleCloseUpdateModal = () => {
    setUpdateModalOpen(false);
    if (updateSuccess) {
      setUpdateSuccess(false);
      setUpdateStep('');
      setUpdateElapsedTime(0);
      setUpdateFinalDuration('');
      checkForUpdates();
    }
  };

  const handleRestartNow = () => {
    hasAutoAppliedRef.current = true;
    setAutoUpdateStatus('applying');
    setIsUpdating(true);
    setUpdateStep('Closing BendLens & applying updates automatically...');
    if (typeof window !== 'undefined' && window.bendlensDesktop?.applyUpdateAndRestart) {
      try {
        window.bendlensDesktop.applyUpdateAndRestart(readyInstallerPath);
      } catch (err) {
        console.warn('Desktop apply update error:', err);
      }
    }
    handleApplyUpdate();
  };

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    setUpdateStep('Checking installer package & preparing update...');
    setUpdateElapsedTime(0);
    setUpdateFinalDuration('');

    const targetVer = updateInfo?.latestVersion || '1.1.48';
    const targetArtifact = updateInfo?.updateArtifact || `BendLens-Setup-${targetVer}.exe`;
    const directDownloadUrl = updateInfo?.downloadUrl || `https://github.com/Keerthivasan004/BendLens/releases/download/v${targetVer}/${targetArtifact}`;

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setUpdateElapsedTime((Date.now() - startTime) / 1000);
    }, 50);

    try {
      const res = await fetch('/api/updates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion: updateInfo?.latestVersion })
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      clearInterval(timerInterval);
      const finalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      setUpdateElapsedTime(parseFloat(finalDuration));
      setUpdateFinalDuration(finalDuration);

        if (res.ok && data?.success) {
        setIsUpdating(false);
        setUpdateSuccess(true);
        const appliedVersion = data.newVersion || targetVer;
        setUpdateInfo((prev) => ({
          ...prev,
          currentVersion: appliedVersion,
          latestVersion: appliedVersion,
          hasUpdate: false
        }));
        setAutoUpdateStatus('idle');
        if (data.installerLaunched) {
          setUpdateStep(`Installer launched: ${data.installerName || targetArtifact}. BendLens Studio will restart automatically in 2 seconds.`);
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.bendlensDesktop?.quitApp) {
              window.bendlensDesktop.quitApp();
            }
          }, 2000);
        } else if (data.downloadTriggered) {
          setUpdateStep(`Downloading ${data.installerName || targetArtifact}. Running installer automatically once download finishes!`);
        } else {
          setUpdateStep(data.message || `BendLens automatically updated to v${appliedVersion}!`);
          setTimeout(() => {
            setIsNotificationDismissed(true);
            checkForUpdates(true);
          }, 2500);
        }
      } else {
        setIsUpdating(false);
        const fallbackUrl = data?.downloadUrl || directDownloadUrl;
        try {
          const a = document.createElement('a');
          a.href = fallbackUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch {
          window.open(fallbackUrl, '_blank');
        }

        setUpdateSuccess(true);
        setUpdateStep(`Downloading ${data?.installerName || targetArtifact}. Run the downloaded installer to complete installation.`);
      }
    } catch (err) {
      clearInterval(timerInterval);
      setIsUpdating(false);
      console.warn('Update apply network fallback:', err);
      try {
        const a = document.createElement('a');
        a.href = directDownloadUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        window.open(directDownloadUrl, '_blank');
      }
      setUpdateSuccess(true);
      setUpdateStep(`Downloading ${targetArtifact}. Run the downloaded installer to complete installation.`);
    }
  };

  // Web visitors always run the latest deployed build, so render the clean version badge
  // without the native desktop auto-update download / restart prompt.
  // Before component is mounted on client, render the SSR-matching version to guarantee 0 hydration mismatch.
  if (!mounted || !isDesktop) {
    return (
      <>
        <button
          onClick={() => {
            checkForUpdates();
            setUpdateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-surface-raised border border-border text-foreground hover:bg-surface-subtle transition-all cursor-pointer shadow-sm"
          title="BendLens Architecture Platform · Click to view latest feature showcase"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono">v{updateInfo.currentVersion}</span>
        </button>

        {mounted && typeof document !== 'undefined' && updateModalOpen && createPortal(
          <UpdateShowcaseModal
            isOpen={updateModalOpen}
            onClose={handleCloseUpdateModal}
            onApplyUpdate={handleApplyUpdate}
            onRestartNow={handleRestartNow}
            autoUpdateStatus={autoUpdateStatus}
            autoApplyCountdown={autoApplyCountdown}
            downloadProgress={downloadProgress}
            isUpdating={isUpdating}
            updateStep={updateStep}
            updateSuccess={updateSuccess}
            updateInfo={updateInfo}
            updateElapsedTime={updateElapsedTime}
            updateFinalDuration={updateFinalDuration}
          />,
          document.body
        )}
      </>
    );
  }

  const floatingNotification = (mounted && updateInfo.hasUpdate && !isNotificationDismissed && !updateModalOpen) ? (
    <div className="fixed bottom-5 right-5 z-[9990] max-w-sm w-[calc(100vw-2.5rem)] sm:w-[390px] p-4 rounded-2xl bg-white/95 dark:bg-[#070b16]/95 border border-blue-200 dark:border-blue-500/40 shadow-modal dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.8),0_0_25px_rgba(56,189,248,0.25)] backdrop-blur-xl animate-rise text-foreground select-none">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {autoUpdateStatus === 'ready' ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          ) : autoUpdateStatus === 'applying' ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
            </span>
          ) : (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          )}
          <span className={`text-[11px] font-mono font-extrabold uppercase tracking-wider ${autoUpdateStatus === 'ready' ? 'text-emerald-600 dark:text-emerald-400' : autoUpdateStatus === 'applying' ? 'text-sky-600 dark:text-sky-400' : 'text-blue-700 dark:text-sky-400'}`}>
            {autoUpdateStatus === 'ready' ? `v${updateInfo.latestVersion} Ready • Auto-Restarting (${autoApplyCountdown !== null ? autoApplyCountdown : 0}s)` : autoUpdateStatus === 'applying' ? `v${updateInfo.latestVersion} Applying Update...` : autoUpdateStatus === 'downloading' ? `v${updateInfo.latestVersion} Downloading...` : `v${updateInfo.latestVersion} Available`}
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
      {autoUpdateStatus === 'applying' ? (
        <div className="space-y-1.5 mb-3.5">
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
            <h4 className="text-xs font-extrabold">Applying Update Automatically</h4>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            {updateStep || `Applying v${updateInfo.latestVersion} update silently and restarting BendLens Studio...`}
          </p>
        </div>
      ) : autoUpdateStatus === 'ready' ? (
        <div className="space-y-2 mb-3.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <h4 className="text-xs font-extrabold">Update Downloaded &amp; Verified</h4>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            BendLens v{updateInfo.latestVersion} is downloaded. Applying update and restarting automatically in <strong className="text-emerald-500 font-mono">{autoApplyCountdown !== null ? autoApplyCountdown : 0}s</strong>...
          </p>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 rounded-full"
              style={{ width: `${Math.max(10, ((autoApplyCountdown ?? 3) / 3) * 100)}%` }}
            />
          </div>
        </div>
      ) : autoUpdateStatus === 'downloading' ? (
        <div className="space-y-2 mb-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
              <span>Downloading in background...</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-sky-400">{downloadProgress.percent}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(4, downloadProgress.percent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-muted">
            <span>{downloadProgress.transferredMb}MB / {downloadProgress.totalMb}MB</span>
            <span>{downloadProgress.speedMb} MB/s</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1 mb-3.5">
          <h4 className="text-xs font-bold text-foreground">
            New BendLens Architectural Engine Ready
          </h4>
          <p className="text-[11px] text-muted leading-relaxed">
            Universal polyglot DB parsing, blast ripple simulation, and multi-tier C4 flowchart diagrams.
          </p>
          {updateInfo.updateArtifact && (
            <p className="text-[10px] font-mono text-muted/80 truncate" title={updateInfo.updateArtifact}>
              Package: {updateInfo.updateArtifact}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-border dark:border-white/10">
        {autoUpdateStatus === 'applying' ? (
          <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
            <span>Restarting BendLens Studio...</span>
          </div>
        ) : autoUpdateStatus === 'ready' ? (
          <>
            <button
              onClick={() => setUpdateModalOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-surface-raised hover:bg-surface-raised/80 text-foreground border border-border dark:border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>What's New</span>
            </button>
            <button
              onClick={handleRestartNow}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-[0_2px_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Auto-Restarting ({autoApplyCountdown !== null ? autoApplyCountdown : 0}s)</span>
            </button>
          </>
        ) : autoUpdateStatus === 'downloading' ? (
          <>
            <button
              onClick={() => setUpdateModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-blue-600/10 hover:bg-blue-600/15 text-blue-700 border border-blue-500/30 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-sky-300 dark:border-blue-500/40 transition-all cursor-pointer shadow-sm"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Watch What's New ({downloadProgress.percent}%)</span>
            </button>
          </>
        ) : (
          <>
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
              <Sparkles className="h-3 w-3" />
              <span>Update Now</span>
            </button>
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Navbar Trigger Button */}
      {updateInfo.hasUpdate ? (
        <button
          onClick={() => setUpdateModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer ${
            autoUpdateStatus === 'ready'
              ? 'bg-emerald-600/15 text-emerald-600 border border-emerald-500/40 hover:bg-emerald-600/25 dark:text-emerald-300 dark:border-emerald-500/50 dark:shadow-[0_2px_12px_rgba(16,185,129,0.3)] animate-pulse'
              : autoUpdateStatus === 'applying'
              ? 'bg-sky-600/15 text-sky-600 border border-sky-500/40 hover:bg-sky-600/25 dark:text-sky-300 dark:border-sky-500/50 dark:shadow-[0_2px_12px_rgba(56,189,248,0.3)] animate-pulse'
              : autoUpdateStatus === 'downloading'
              ? 'bg-sky-600/15 text-sky-600 border border-sky-500/40 hover:bg-sky-600/25 dark:text-sky-300 dark:border-sky-500/50 dark:shadow-[0_2px_12px_rgba(56,189,248,0.3)]'
              : 'bg-blue-600/10 text-blue-700 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-600/[0.14] dark:from-blue-500/20 dark:to-sky-500/20 dark:bg-gradient-to-r dark:text-sky-300 dark:border-blue-500/40 dark:hover:border-blue-400 dark:shadow-[0_2px_10px_rgba(56,189,248,0.25)] animate-pulse'
          }`}
          title="Click to view update details & feature showcase"
        >
          {autoUpdateStatus === 'applying' ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
              <span>v{updateInfo.currentVersion} • Applying Update...</span>
            </>
          ) : autoUpdateStatus === 'ready' ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
              <span>v{updateInfo.currentVersion} • Auto-Restarting ({autoApplyCountdown !== null ? autoApplyCountdown : 0}s)</span>
            </>
          ) : autoUpdateStatus === 'downloading' ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-400" />
              <span>v{updateInfo.currentVersion} • Updating ({downloadProgress.percent}%)</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span>v{updateInfo.currentVersion} • Update Ready (v{updateInfo.latestVersion})</span>
            </>
          )}
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
          onClose={handleCloseUpdateModal}
          onApplyUpdate={handleApplyUpdate}
          onRestartNow={handleRestartNow}
          autoUpdateStatus={autoUpdateStatus}
          autoApplyCountdown={autoApplyCountdown}
          downloadProgress={downloadProgress}
          isUpdating={isUpdating}
          updateStep={updateStep}
          updateSuccess={updateSuccess}
          updateInfo={updateInfo}
          updateElapsedTime={updateElapsedTime}
          updateFinalDuration={updateFinalDuration}
        />,
        document.body
      )}
    </>
  );
}
