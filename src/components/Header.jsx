'use client';

import React from 'react';
import Logo from '@/components/Logo';
import UpdateIndicator from '@/components/UpdateIndicator';
import { 
  Layers, FolderSearch, Play, Download, Sparkles, Database, 
  FileCode, Cpu, CheckCircle2, Sun, Moon, ArrowLeft, RefreshCw 
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
  onToggleTheme
}) {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-black border-b border-border px-6 lg:px-10 py-3 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo & Active Breadcrumb */}
        <Logo size="sm" />

        {/* Action Controls & Path Bar */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-1 max-w-2xl justify-end">
          <div className="relative flex-1">
            <FolderSearch className="h-4 w-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={currentPath}
              onChange={(e) => {
                const clean = (e.target.value || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
                setCurrentPath(clean);
              }}
              placeholder="Path to codebase..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface-card border border-border focus:border-blue-900 dark:focus:border-blue-400 outline-none text-foreground font-mono font-medium placeholder-slate-400 transition-all shadow-sm"
            />
          </div>

          <button
            onClick={() => onAnalyze(currentPath)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Rescan</span>
          </button>

          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-blue-900 dark:text-blue-300 border border-blue-900/30 dark:border-blue-400/30 transition-all cursor-pointer whitespace-nowrap shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" />
            <span>Sample</span>
          </button>

          <button
            onClick={onExport}
            disabled={!analysisData}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-foreground border border-border disabled:opacity-40 transition-all cursor-pointer whitespace-nowrap shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>

          {/* Auto-Update Indicator */}
          <UpdateIndicator />

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-foreground border border-border transition-all cursor-pointer shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-blue-900" />
            )}
          </button>
        </div>
      </div>

      {/* Mini Stats Bar */}
      {analysisData && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2 font-medium">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-foreground font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Project: <strong className="font-mono text-blue-900 dark:text-blue-300">{analysisData.projectName}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <FileCode className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" />
              <span>Files: <strong className="text-foreground">{analysisData.scannedFilesCount}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400" />
              <span>Tables: <strong className="text-foreground">{analysisData.schema?.tables?.length || 0}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400" />
              <span>APIs: <strong className="text-foreground">{analysisData.code?.endpoints?.length || 0}</strong></span>
            </span>
          </div>
          <span>
            Scanned: {new Date(analysisData.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </header>
  );
}
