'use client';

import React from 'react';
import Logo from '@/components/Logo';
import UpdateIndicator from '@/components/UpdateIndicator';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  FolderSearch, Play, Download, Sparkles, Database, 
  FileCode, Cpu, CheckCircle2, RefreshCw, 
  ShieldCheck, Activity
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
    <header className="sticky top-0 z-50 border-b border-border bg-surface/85 backdrop-blur-md px-4 sm:px-6 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Logo & Engine Health Badge */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <Logo size="sm" />
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-border text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AST Engine Active</span>
          </div>
        </div>

        {/* Action Controls & Path Bar */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-2xl justify-end">
          <div className="relative flex-1">
            <FolderSearch className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted pointer-events-none" />
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
              placeholder="Path to backend codebase (e.g., C:/Projects/repo)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted/60 transition-colors"
            />
          </div>

          <button
            onClick={() => onAnalyze(currentPath)}
            disabled={isLoading}
            className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
            title="Trigger AST Rescan"
          >
            {isLoading ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <Play className="h-3 w-3 fill-current mr-1.5" />
            )}
            <span>Rescan</span>
          </button>

          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap"
            title="Load built-in multi-service e-commerce architecture demo"
          >
            <Sparkles className="h-3 w-3 text-brand mr-1.5" />
            <span>Sample</span>
          </button>

          <button
            onClick={onExport}
            disabled={!analysisData}
            className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap disabled:opacity-40"
            title="Export Architecture & Blast Radius PDF / Markdown Report"
          >
            <Download className="h-3 w-3 text-muted mr-1.5" />
            <span>Export</span>
          </button>

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

      {/* Mini Stats Bar */}
      {analysisData && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-border flex flex-wrap items-center justify-between text-[11px] text-muted gap-2">
          <div className="flex items-center gap-3.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-foreground font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Project: <strong className="font-mono text-foreground">{analysisData.projectName}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <FileCode className="h-3.5 w-3.5 text-brand shrink-0" />
              <span>Files: <strong className="text-foreground font-mono">{analysisData.scannedFilesCount}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-violet-500 shrink-0" />
              <span>Tables: <strong className="text-foreground font-mono">{analysisData.schema?.tables?.length || 0}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>APIs: <strong className="text-foreground font-mono">{analysisData.code?.endpoints?.length || 0}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Graph Nodes: <strong className="text-foreground font-mono">{analysisData.graph?.stats?.totalNodes || 0}</strong></span>
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted/70">
            Synced: {new Date(analysisData.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </header>
  );
}
