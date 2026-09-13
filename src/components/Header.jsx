'use client';

import React from 'react';
import Logo from '@/components/Logo';
import UpdateIndicator from '@/components/UpdateIndicator';
import ThemeToggle from '@/components/ThemeToggle';
import useIsDesktop from '@/lib/useIsDesktop';
import {
  FolderSearch, Play, Download, Sparkles, Database,
  FileCode, Cpu, CheckCircle2, RefreshCw,
  Activity, ChevronRight
} from 'lucide-react';

export default function Header({
  onAnalyze,
  onLoadSample,
  onExport,
  isLoading,
  analysisData,
  currentPath,
  setCurrentPath,
  theme,
  onToggleTheme,
  isLocalApp = true,
  onDownloadApp
}) {
  const hasAnalysis = !!analysisData;
  // Downloaded (Electron) users already have the app: never offer it again.
  const isDesktop = useIsDesktop();

  return (
    <header className="sticky top-0 z-50 border-b border-border chrome-bar px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Primary row: brand, path, actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
          {/* Brand cluster */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Logo size="sm" />
            {hasAnalysis && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span>AST Engine · Local</span>
              </div>
            )}
          </div>

          {/* Path input + primary actions */}
          <div className="w-full sm:flex-1 flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1 min-w-0">
              <FolderSearch className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={currentPath}
                onChange={(e) => {
                  const clean = (e.target.value || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
                  setCurrentPath(clean);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAnalyze(currentPath);
                }}
                placeholder="Path to backend codebase (e.g., C:/Projects/repo)…"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-subtle border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted transition-all shadow-subtle"
              />
            </div>

            <button
              onClick={() => onAnalyze(currentPath)}
              disabled={isLoading}
              className="btn-primary text-xs py-2 px-3.5 whitespace-nowrap hidden sm:flex"
              title="Trigger AST Rescan"
            >
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3 fill-current" />
              )}
              <span>Rescan</span>
            </button>

            <button
              onClick={onLoadSample}
              disabled={isLoading}
              className="btn-secondary text-xs py-2 px-3 whitespace-nowrap"
              title="Load built-in multi-service e-commerce architecture demo"
            >
              <Sparkles className="h-3 w-3 text-brand" />
              <span className="hidden sm:inline">Sample</span>
            </button>

            <button
              onClick={onExport}
              disabled={!hasAnalysis}
              className="btn-secondary text-xs py-2 px-3 whitespace-nowrap disabled:opacity-40"
              title="Export Architecture & Blast Radius PDF / Markdown Report"
            >
              <Download className="h-3 w-3 text-muted" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* System controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onDownloadApp && !isDesktop && (
              <button
                onClick={onDownloadApp}
                className="btn-primary text-xs py-2 px-3 whitespace-nowrap hidden sm:flex"
                title="Download Desktop App for direct folder scanning"
              >
                <Download className="h-3 w-3" />
                <span>Download App</span>
              </button>
            )}
            <UpdateIndicator />
            <ThemeToggle
              theme={theme}
              onToggle={onToggleTheme}
              onChange={(newTheme) => {
                if (onToggleTheme) onToggleTheme(newTheme);
              }}
            />
          </div>
        </div>

        {/* Mini stats bar — only when analysis exists */}
        {hasAnalysis && (
          <div className="pt-2 border-t border-border-subtle">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="chip !py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-mono font-semibold">{analysisData.projectName}</span>
                </span>
                <span className="flex items-center gap-1.5 px-1 text-muted">
                  <FileCode className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span><strong className="text-foreground font-mono">{analysisData.scannedFilesCount}</strong> files</span>
                </span>
                <span className="h-3 w-px bg-border hidden md:block" />
                <span className="flex items-center gap-1.5 px-1 text-muted">
                  <Database className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span><strong className="text-foreground font-mono">{analysisData.schema?.tables?.length || 0}</strong> tables</span>
                </span>
                <span className="h-3 w-px bg-border hidden md:block" />
                <span className="flex items-center gap-1.5 px-1 text-muted">
                  <Cpu className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span><strong className="text-foreground font-mono">{analysisData.code?.endpoints?.length || 0}</strong> APIs</span>
                </span>
                <span className="h-3 w-px bg-border hidden md:block" />
                <span className="flex items-center gap-1.5 px-1 text-muted">
                  <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span><strong className="text-foreground font-mono">{analysisData.graph?.stats?.totalNodes || 0}</strong> nodes</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted tabular-nums">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>Synced · {new Date(analysisData.timestamp).toLocaleTimeString()}</span>
                {analysisData.projectPath && (
                  <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-raised border border-border">
                    <ChevronRight className="h-3 w-3 text-muted" />
                    <span className="truncate max-w-[200px] font-mono text-[10px]">{analysisData.projectPath}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}