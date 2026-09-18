'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PersonaSwitcher from '@/components/PersonaSwitcher';
import DiagramCanvas from '@/components/DiagramCanvas';
import DeveloperView from '@/components/views/DeveloperView';
import ManagerView from '@/components/views/ManagerView';
import BusinessView from '@/components/views/BusinessView';
import BlastRadiusSimulator from '@/components/BlastRadiusSimulator';
import ExportModal from '@/components/ExportModal';
import { ArrowLeft, RefreshCw, AlertCircle, Layers, FolderSearch } from 'lucide-react';

export default function LensDashboard() {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRole, setRole] = useState('DEVELOPER');
  const [activeDiagramTab, setActiveDiagramTab] = useState('erd');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState('dark');
  const [isLocalApp, setIsLocalApp] = useState(true);

  // Load theme and fetch analysis from server memory cache
  useEffect(() => {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('bendlens-theme') || 'dark';
    } catch {}
    
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.endsWith('.local');
      setIsLocalApp(isLocal);
    }

    try {
      const initialRole = localStorage.getItem('bendlens-initial-role');
      if (initialRole) {
        setRole(initialRole);
        localStorage.removeItem('bendlens-initial-role');
      }
      const initialTab = localStorage.getItem('bendlens-initial-tab');
      if (initialTab) {
        setActiveDiagramTab(initialTab);
        localStorage.removeItem('bendlens-initial-tab');
      } else if (initialRole === 'MANAGER') {
        setActiveDiagramTab('hld');
      }
    } catch {}

    // Restore last scanned project from localStorage and re-analyze
    // (no server cache - always fresh analysis for privacy & correctness)
    const savedPath = localStorage.getItem('bendlens-path');
    if (savedPath) {
      handleAnalyze(savedPath);
    }
  }, []);

  const toggleTheme = (explicitTheme) => {
    const newTheme = (typeof explicitTheme === 'string' && (explicitTheme === 'dark' || explicitTheme === 'light'))
      ? explicitTheme
      : (theme === 'dark' ? 'light' : 'dark');
    setTheme(newTheme);
    try {
      localStorage.setItem('bendlens-theme', newTheme);
    } catch {}
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleDownloadApp = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/download-app';
    }
  };

  const cleanInputPath = (val) => {
    return (val || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  };

  const handleAnalyze = async (folderPath) => {
    const sanitized = cleanInputPath(folderPath);
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: sanitized })
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisData(result.data);
        setCurrentPath(result.data.projectPath);
        try {
          localStorage.setItem('bendlens-path', result.data.projectPath);
        } catch {}
      } else {
        setErrorMessage(result.error || 'Analysis failed');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error analyzing project');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleProject = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/sample');
      const result = await res.json();
      if (result.success) {
        setAnalysisData(result.data);
        setCurrentPath(result.data.projectPath);
        try {
          localStorage.setItem('bendlens-path', result.data.projectPath);
        } catch {}
      } else {
        setErrorMessage(result.error || 'Failed to load sample project');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to backend');
    } finally {
      setIsLoading(false);
    }
  };

  const [selectedSimulatorTarget, setSelectedSimulatorTarget] = useState(null);

  const handleSelectForImpact = (targetName, targetType = 'table', changeType = 'table_name', columnName = null, keyName = null) => {
    setSelectedSimulatorTarget({
      targetName,
      targetType,
      changeType,
      columnName,
      keyName
    });
    setRole('SIMULATOR');
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'MANAGER' && activeDiagramTab === 'erd') {
      setActiveDiagramTab('hld');
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col pb-16 transition-colors selection:bg-brand/20 selection:text-foreground">
      {/* Top Header */}
      <Header
        onAnalyze={handleAnalyze}
        onLoadSample={loadSampleProject}
        onExport={() => setIsExportOpen(true)}
        isLoading={isLoading}
        analysisData={analysisData}
        currentPath={currentPath}
        setCurrentPath={setCurrentPath}
        theme={theme}
        onToggleTheme={toggleTheme}
        isLocalApp={isLocalApp}
        onDownloadApp={handleDownloadApp}
      />

      {/* Breadcrumb & Navigation Strip */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = '/';
            else router.push('/');
          }}
          className="btn-secondary text-xs py-2 px-3.5 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Ingestion Portal · New Scan</span>
        </button>

        {analysisData && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <span className="section-label !text-[10px]">Repository</span>
            <span className="chip !font-mono">
              {analysisData.projectName}
            </span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-3.5">
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Main Studio Body */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex-1 flex flex-col">
        {/* Active In-Studio Rescan Banner with Theme-Differentiated Animation */}
        {isLoading && (
          <div
            className={`mb-4 p-3.5 rounded-xl border transition-all animate-fadeIn ${
              theme === 'dark'
                ? 'analysis-scanner-dark border-emerald-500/40 text-slate-100'
                : 'analysis-scanner-light border-blue-500/40 text-slate-900 shadow-card'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="h-4 w-4 animate-spin text-brand" />
                <div>
                  <div className="text-xs font-bold">
                    {theme === 'dark' ? 'AST Pipeline Rescan in Progress' : 'Re-analyzing Architecture AST...'}
                  </div>
                  <div className="text-[11px] text-muted font-mono">
                    Resolving relational models, call graph & blast radius
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  theme === 'dark'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}
              >
                Live Scanning
              </span>
            </div>
            <div
              className={`mt-2 w-full h-1.5 rounded-full overflow-hidden relative ${
                theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            >
              <div
                className={`h-full w-2/3 rounded-full relative overflow-hidden ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    : 'bg-gradient-to-r from-blue-600 to-sky-500'
                }`}
              >
                {theme === 'dark' ? (
                  <div className="absolute inset-0 w-full h-full laser-beam-dark" />
                ) : (
                  <div className="absolute inset-0 w-full h-full shimmer-wave-light" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Persona Switcher Tabs */}
        <PersonaSwitcher
          currentRole={currentRole}
          setRole={handleRoleChange}
          data={analysisData}
        />

        {/* Diagram Canvas Section - Available across Developer, Manager, and Business Views */}
        {analysisData && currentRole !== 'SIMULATOR' && (
          <div className="mb-8">
            <DiagramCanvas 
              diagrams={analysisData.diagrams} 
              schemaData={analysisData.schema} 
              theme={theme} 
              onSelectForImpact={handleSelectForImpact}
              activeTab={activeDiagramTab}
              onTabChange={setActiveDiagramTab}
            />
          </div>
        )}

        {/* Role-Specific View Switcher */}
        {analysisData ? (
          <div className="flex-1 cv-auto">
            {currentRole === 'DEVELOPER' && (
              <DeveloperView
                data={analysisData.personas?.developer}
                onSelectForImpact={handleSelectForImpact}
              />
            )}

            {currentRole === 'MANAGER' && (
              <ManagerView
                data={analysisData.personas?.manager}
              />
            )}

            {currentRole === 'BUSINESS' && (
              <BusinessView
                data={analysisData.personas?.business}
              />
            )}

            {currentRole === 'SIMULATOR' && (
              <BlastRadiusSimulator
                schemaData={analysisData.schema}
                codeData={analysisData.code}
                currentPath={currentPath}
                initialImpact={analysisData.sampleImpact}
                initialSelection={selectedSimulatorTarget}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <div className="h-11 w-11 rounded-2xl bg-surface border border-border shadow-card flex items-center justify-center mb-4">
              <div className="h-5 w-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-sm font-bold text-foreground tracking-tight">Loading BendLens Studio…</p>
            <p className="text-xs text-muted mt-1">Restoring architecture model from local engine</p>
          </div>
        )}
      </div>

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={analysisData}
      />
    </main>
  );
}
