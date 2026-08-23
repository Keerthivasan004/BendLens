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
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState('dark');

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

    // Fetch active analysis directly from server cache (No browser 5MB limit!)
    fetchCurrentAnalysis();
  }, []);

  const fetchCurrentAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/current');
      const result = await res.json();
      if (result.success && result.data) {
        setAnalysisData(result.data);
        setCurrentPath(result.data.projectPath || '');
      } else {
        loadSampleProject();
      }
    } catch (err) {
      loadSampleProject();
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
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

  const handleSelectForImpact = () => {
    setRole('SIMULATOR');
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col pb-16 transition-colors selection:bg-blue-900/20 selection:text-blue-900 dark:selection:bg-blue-500/30 dark:selection:text-blue-200">
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
      />

        {/* Breadcrumb & Navigation Strip */}
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-10 pt-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-blue-900 dark:text-blue-400 border border-border shadow-sm transition-all cursor-pointer group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Ingestion Portal / New Scan</span>
          </button>

          {analysisData && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Repository:</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-300 font-mono font-bold">
                {analysisData.projectName}
              </span>
            </div>
          )}
        </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-10 mt-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-bold shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Main Studio Body */}
      <div className="max-w-7xl mx-auto w-full px-6 lg:px-10 flex-1 flex flex-col">
        {/* Persona Switcher Tabs */}
        <PersonaSwitcher
          currentRole={currentRole}
          setRole={setRole}
        />

        {/* Diagram Canvas Section */}
        {analysisData && (
          <div className="mb-8">
            <DiagramCanvas diagrams={analysisData.diagrams} theme={theme} />
          </div>
        )}

        {/* Role-Specific View Switcher */}
        {analysisData ? (
          <div className="flex-1">
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
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center text-slate-500">
            <div className="h-10 w-10 border-2 border-blue-900 dark:border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-blue-950 dark:text-blue-300">Loading BendLens Studio...</p>
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
