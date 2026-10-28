'use client';

import React, { useState } from 'react';
import Logo from '@/components/Logo';
import UpdateIndicator from '@/components/UpdateIndicator';
import ThemeToggle from '@/components/ThemeToggle';
import useIsDesktop from '@/lib/useIsDesktop';
import {
  FolderSearch, Play, Download, Sparkles, Database,
  FileCode, Cpu, CheckCircle2, RefreshCw,
  Activity, ChevronRight, Globe, Printer, Cloud, Layers, Code2, Workflow, Scale, ShieldCheck
} from 'lucide-react';
import { openAndPrintApiReport } from '@/lib/generators/apiPdfReportGenerator';
import { getApiServicesCount } from '@/lib/apiCountHelper';
import ApiBreakdownModal from '@/components/ApiBreakdownModal';
import LegalDocumentsModal from '@/components/LegalDocumentsModal';
import CrawlerAccuracyProofModal from '@/components/CrawlerAccuracyProofModal';

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
  onDownloadApp,
  onOpenApiFlow
}) {
  const hasAnalysis = !!analysisData;
  const [showApiBreakdown, setShowApiBreakdown] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('privacy');
  const [showCrawlerProof, setShowCrawlerProof] = useState(false);
  const [crawlerProofTab, setCrawlerProofTab] = useState('matrix');
  // Downloaded (Electron) users already have the app: never offer it again.
  const isDesktop = useIsDesktop();
  const isLocal = isLocalApp || (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.endsWith('.local') ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.')
  ));
  const isUrl = (currentPath || '').startsWith('http://') || (currentPath || '').startsWith('https://') || /^(?:api\.|github\.com|gitlab\.com|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/|$))/i.test(currentPath || '');

  return (
    <header className="relative border-b border-border chrome-bar px-4 sm:px-6 py-3 transition-colors">
      <div className="w-full max-w-[1720px] mx-auto">
        {/* Primary row: brand, path input, and system controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Brand cluster */}
          <div className="flex items-center gap-3 shrink-0">
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

          {/* Path input + scan actions */}
          <div className="w-full lg:flex-1 flex items-center gap-2 max-w-2xl min-w-0">
            {/* Input Box - Guaranteed ample width so it never collapses */}
            <div className="relative flex-1 min-w-[200px]">
              {isUrl ? (
                <Globe className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand pointer-events-none" />
              ) : (
                <FolderSearch className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              )}
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
                placeholder="Path to backend codebase or Git / OpenAPI URL (https://…)…"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-subtle border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted transition-all shadow-subtle"
              />
            </div>

            {/* Scan Buttons Cluster */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onAnalyze(currentPath)}
                disabled={isLoading}
                className="btn-primary text-xs py-2 px-3.5 whitespace-nowrap flex items-center gap-1.5"
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
            </div>
          </div>

          {/* System controls */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            {onDownloadApp && !isDesktop && !isLocal && (
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

        {/* Secondary Row: Telemetry Stats & Analysis Action Suite */}
        {hasAnalysis && (
          <div className="mt-2.5 pt-2.5 border-t border-border-subtle flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-3 text-[11px]">
            {/* Left: Discovered Telemetry Stats */}
            <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
              <span className="chip !py-1 shrink-0 max-w-xs sm:max-w-md lg:max-w-xl truncate" title={analysisData.projectName}>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="font-mono font-semibold truncate whitespace-nowrap">{analysisData.projectName}</span>
              </span>
              <span className="flex items-center gap-1.5 px-1 text-muted whitespace-nowrap shrink-0">
                <FileCode className="h-3.5 w-3.5 text-brand shrink-0" />
                <span><strong className="text-foreground font-mono">{analysisData.scannedFilesCount}</strong> files</span>
              </span>
              <span className="h-3 w-px bg-border hidden sm:block shrink-0" />
              <span className="flex items-center gap-1.5 px-1 text-muted whitespace-nowrap shrink-0">
                <Database className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                <span><strong className="text-foreground font-mono">{analysisData.schema?.tables?.length || 0}</strong> tables</span>
              </span>
              <span className="h-3 w-px bg-border hidden sm:block shrink-0" />
              {(() => {
                const apisCount = getApiServicesCount(analysisData);
                return (
                  <>
                    <button
                      onClick={() => setShowApiBreakdown(true)}
                      className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/[0.08] hover:bg-violet-500/[0.16] border border-violet-500/20 hover:border-violet-500/40 text-violet-700 dark:text-violet-300 transition-all cursor-pointer group whitespace-nowrap shrink-0"
                      title={`${apisCount} Discovered Backend APIs — Click to inspect which API has how many endpoints and all endpoint names`}
                    >
                      <Cpu className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span><strong className="text-violet-700 dark:text-violet-400 font-mono">{apisCount}</strong> {apisCount === 1 ? 'API' : 'APIs'}</span>
                      <ChevronRight className="h-2.5 w-2.5 text-violet-400/60 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                    <span className="h-3 w-px bg-border hidden sm:block shrink-0" />
                  </>
                );
              })()}
              {analysisData.crawlerTelemetry ? (
                <>
                  <span className="flex items-center gap-1.5 px-1 text-muted whitespace-nowrap shrink-0" title="Normal Crawl: Baseline API endpoints discovered in entry bundles">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                    <span>Normal: <strong className="text-cyan-700 dark:text-cyan-400 font-mono">{analysisData.crawlerTelemetry.normalCrawlCount ?? analysisData.code?.endpoints?.filter(e => !e.isLazyLoaded).length ?? 0}</strong></span>
                  </span>
                  <span className="h-3 w-px bg-border hidden sm:block shrink-0" />
                  <span className="flex items-center gap-1.5 px-1 text-muted whitespace-nowrap shrink-0" title="Deep Crawl: Total API endpoints discovered across all code-split chunks">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Deep: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{analysisData.crawlerTelemetry.deepCrawlCount ?? analysisData.code?.endpoints?.length ?? 0}</strong> endpoints</span>
                  </span>
                  {(analysisData.techStack?.frontend?.framework || analysisData.crawlerTelemetry?.techStack?.frontend?.framework) && (
                    <>
                      <span className="h-3 w-px bg-border hidden sm:block shrink-0" />
                      <span className="flex items-center gap-1.5 px-1 text-muted whitespace-nowrap shrink-0" title={(analysisData.techStack || analysisData.crawlerTelemetry?.techStack)?.summary}>
                        <Cpu className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="text-foreground font-semibold font-mono text-[11px]">
                          {(analysisData.techStack || analysisData.crawlerTelemetry?.techStack)?.frontend?.framework}
                        </span>
                      </span>
                    </>
                  )}
                  {(() => {
                    const ts = analysisData.techStack || analysisData.crawlerTelemetry?.techStack;
                    const cp = analysisData.cloudProvider ||
                      ts?.cloudProvider ||
                      analysisData.crawlerTelemetry?.cloudProvider ||
                      analysisData.crawlerTelemetry?.techStack?.cloudProvider;
                    if (!cp || cp.code === 'unknown') return null;

                    const feCp = ts?.frontend?.cloudProvider || cp.frontend || cp;
                    const beCp = ts?.backend?.cloudProvider || cp.backend;
                    const isMulti = beCp && beCp.name && feCp.name && beCp.name !== feCp.name && beCp.code !== 'co_hosted';

                    return (
                      <>
                        <span className="h-3 w-px bg-border hidden sm:block shrink-0" />
                        <span
                          className="flex items-center gap-1.5 px-1 text-muted cursor-help whitespace-nowrap shrink-0"
                          title={`Frontend: ${feCp?.name || 'Cloud Edge'} (${feCp?.category || 'Edge CDN'}) • Backend: ${beCp?.name || 'Compute'} (${beCp?.category || 'API Server'}) • Evidence: ${beCp?.evidence?.[0] || feCp?.evidence?.[0] || 'Verified'}`}
                        >
                          <Cloud className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                          <span className="text-foreground font-semibold font-mono text-[11px]">
                            {isMulti ? `${feCp.name.split('(')[0].trim()} / ${beCp.name.split('(')[0].trim()}` : feCp.name.split('(')[0].trim()}
                          </span>
                        </span>
                      </>
                    );
                  })()}
                </>
              ) : (
                <span className="flex items-center gap-1.5 px-1 text-muted whitespace-nowrap shrink-0">
                  <Code2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span><strong className="text-foreground font-mono">{analysisData.code?.endpoints?.length || 0}</strong> endpoints</span>
                </span>
              )}
              <span className="h-3 w-px bg-border hidden sm:block shrink-0" />
              <span className="flex items-center gap-1.5 px-1 text-muted whitespace-nowrap shrink-0">
                <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span><strong className="text-foreground font-mono">{analysisData.graph?.stats?.totalNodes || 0}</strong> nodes</span>
              </span>
            </div>

            {/* Right: Analysis Action Suite (PDF, Breakdown, Interactive Graph, Export) */}
            <div className="flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar w-full 2xl:w-auto justify-start 2xl:justify-end py-0.5">
              {(isUrl || analysisData?.isUrlCrawl || analysisData?.crawlerTelemetry) && (
                <button
                  onClick={() => openAndPrintApiReport(analysisData)}
                  className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
                  title="Download / Print Discovered Endpoints Assessment PDF Report"
                >
                  <Printer className="h-3 w-3" />
                  <span>API PDF</span>
                </button>
              )}

              <button
                onClick={() => setShowApiBreakdown(true)}
                className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 border-violet-500/30 hover:border-violet-500/50 hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium"
                title="View which API has how many endpoints and all endpoint names"
              >
                <Layers className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" />
                <span>API Breakdown</span>
              </button>

              <button
                onClick={() => {
                  setCrawlerProofTab('signals');
                  setShowCrawlerProof(true);
                }}
                className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium cursor-pointer"
                title="Inspect in-memory AST detection signatures and HTTP header evidence"
              >
                <Activity className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>Inspect Signals</span>
              </button>

              <button
                onClick={() => {
                  setCrawlerProofTab('matrix');
                  setShowCrawlerProof(true);
                }}
                className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium cursor-pointer"
                title="Inspect why conventional crawlers show different values and ground-truth parity proof"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Accuracy Proof</span>
              </button>

              {(() => {
                const legalDocs = analysisData?.legalDocuments || analysisData?.crawlerTelemetry?.legalDocuments;
                const hasAny = !!(legalDocs?.privacyPolicy || legalDocs?.termsOfService);
                return (
                  <button
                    onClick={() => {
                      setLegalModalTab('privacy');
                      setShowLegalModal(true);
                    }}
                    className={`btn-secondary text-xs py-1.5 px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 font-medium cursor-pointer ${hasAny
                        ? "border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border hover:border-border-strong hover:bg-surface-raised text-muted hover:text-foreground"
                      }`}
                    title={hasAny ? "View Privacy Policy and Terms of Use / Service documents in fullscreen" : "Audit Legal Documents: No Privacy Policy or Terms detected on origin"}
                  >
                    <Scale className={`h-3.5 w-3.5 ${hasAny ? "text-emerald-500 dark:text-emerald-400" : "text-muted"}`} />
                    <span>Privacy & Terms</span>
                    {!hasAny && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono">None</span>
                    )}
                  </button>
                );
              })()}

              {onOpenApiFlow && (
                <button
                  onClick={onOpenApiFlow}
                  className="btn-secondary text-xs py-1.5 px-3.5 whitespace-nowrap shrink-0 flex items-center gap-1.5 border-cyan-500/40 hover:border-cyan-500/70 hover:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold shadow-sm"
                  title="View Interactive Visual API Communication Graph in Fullscreen"
                >
                  <Workflow className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400 animate-pulse" />
                  <span>View Interactive Graph</span>
                </button>
              )}

              <button
                onClick={onExport}
                disabled={!hasAnalysis}
                className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-40"
                title="Export Architecture & Blast Radius PDF / Markdown Report"
              >
                <Download className="h-3.5 w-3.5 text-muted" />
                <span>Export</span>
              </button>

              <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-muted pl-2 border-l border-border-subtle whitespace-nowrap shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Synced {new Date(analysisData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasAnalysis && (
        <ApiBreakdownModal
          isOpen={showApiBreakdown}
          onClose={() => setShowApiBreakdown(false)}
          analysisData={analysisData}
          onOpenApiFlow={onOpenApiFlow}
        />
      )}

      {/* Local-First Authentic Legal Documents (Privacy Policy & Terms of Service) Modal */}
      <LegalDocumentsModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        legalDocuments={analysisData?.legalDocuments || analysisData?.crawlerTelemetry?.legalDocuments}
        targetUrl={currentPath || analysisData?.projectPath}
        initialTab={legalModalTab}
      />

      {/* Crawler Accuracy & Trustworthiness Proof Modal */}
      <CrawlerAccuracyProofModal
        isOpen={showCrawlerProof}
        onClose={() => setShowCrawlerProof(false)}
        analysisData={analysisData}
        initialTab={crawlerProofTab}
      />
    </header>
  );
}