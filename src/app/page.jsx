'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import UpdateIndicator from '@/components/UpdateIndicator';
import DownloadModal from '@/components/DownloadModal';
import FloatingDataBubbles from '@/components/FloatingDataBubbles';
import {
  FolderSearch, Play, Sparkles, Database, FileCode, Cpu, Layers,
  CheckCircle2, ArrowRight, ShieldCheck, HardDrive, Terminal,
  UploadCloud, GitBranch, Globe, Sun, Moon, Laptop, Lock, AlertTriangle, AlertCircle, Download
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  // Ingestion Mode: 'PATH' | 'UPLOAD' | 'PASTE' | 'GIT'
  const [ingestMode, setIngestMode] = useState('PATH');

  // Mode States
  const [folderPath, setFolderPath] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [pastedCode, setPastedCode] = useState(
`-- Paste SQL DDL, Prisma schema, or ORM models here
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING'
);`
  );
  const [selectedFile, setSelectedFile] = useState(null);

  // Shared Execution State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [localHistory, setLocalHistory] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadModalReason, setDownloadModalReason] = useState('DEFAULT');
  const [isLocalApp, setIsLocalApp] = useState(true);

  // Initialize theme, history & local desktop detection
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

    // Detect if running locally (Desktop or localhost) vs Web/Vercel
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.endsWith('.local');
      setIsLocalApp(isLocal);
    }

    fetchLocalHistory();
  }, []);

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

  const fetchLocalHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success && data.data) {
        setLocalHistory(data.data);
      }
    } catch (e) {
      console.warn('Could not fetch local scan history:', e);
    }
  };

  const cleanInputPath = (val) => {
    if (!val) return '';
    return val.toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  };

  const simulateScanSteps = () => {
    setScanStep(1);
    const t1 = setTimeout(() => setScanStep(2), 500);
    const t2 = setTimeout(() => setScanStep(3), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  };

  // 1. Analyze by Local Folder Path
  const handleScanPath = async (overridePath) => {
    const target = overridePath || folderPath;

    // Check if on web version and user entered a personal local hard-drive path
    if (!isLocalApp && target && (target.includes(':/') || target.includes(':\\') || target.startsWith('/Users/') || target.startsWith('/home/') || target.startsWith('C:') || target.startsWith('D:'))) {
      setErrorMessage('Browser Security Notice: The Web Edition cannot access your computer\'s local hard drive directly. Please download the BendLens Desktop App for direct folder scans, or use the "ZIP Upload", "Paste Schema", or "Git Clone" tabs.');
      setDownloadModalReason('DEFAULT');
      setIsDownloadModalOpen(true);
      return;
    }

    setIsScanning(true);
    setErrorMessage('');
    simulateScanSteps();

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: target })
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        fetchLocalHistory();
      } else {
        setErrorMessage(result.error || 'Failed to analyze local path.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to local analysis engine');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  // 2. Analyze by File / ZIP Upload
  const handleScanUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a .zip file or schema file to upload.');
      return;
    }

    setIsScanning(true);
    setErrorMessage('');
    simulateScanSteps();

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        fetchLocalHistory();
      } else {
        setErrorMessage(result.error || 'Upload scan failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error uploading file to local engine');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  // 3. Analyze by Pasted Code / Schema
  const handleScanPaste = async () => {
    if (!pastedCode.trim()) {
      setErrorMessage('Please paste SQL DDL, Prisma schema, or ORM models.');
      return;
    }

    setIsScanning(true);
    setErrorMessage('');
    simulateScanSteps();

    try {
      const res = await fetch('/api/paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: pastedCode,
          fileType: pastedCode.includes('model ') ? 'schema.prisma' : 'schema.sql',
          projectName: 'Custom Schema Ingestion'
        })
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        fetchLocalHistory();
      } else {
        setErrorMessage(result.error || 'Schema parsing failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error parsing schema code');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  // 4. Analyze by Git / GitHub Clone
  const handleScanGit = async () => {
    if (!gitUrl.trim()) {
      setErrorMessage('Please enter a valid Git / GitHub repository URL.');
      return;
    }

    setIsScanning(true);
    setErrorMessage('');
    simulateScanSteps();

    try {
      const res = await fetch('/api/git-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: gitUrl.trim(),
          token: gitToken.trim()
        })
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        fetchLocalHistory();
      } else {
        setErrorMessage(result.error || 'Git clone failed. If this is a private repository, please provide a GitHub Personal Access Token (PAT).');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to git engine');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  // Load Built-in Mock Architecture
  const handleLoadSample = async () => {
    setIsScanning(true);
    setErrorMessage('');
    simulateScanSteps();
    try {
      const res = await fetch('/api/sample');
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
      }
    } catch (err) {
      setErrorMessage('Failed to load sample project');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  // Show Lens navigates directly to the Studio Console
  const handleOpenLens = () => {
    router.push('/lens');
  };

  return (
    <main className="relative min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col transition-colors selection:bg-blue-900/20 selection:text-blue-900 dark:selection:bg-blue-500/30 dark:selection:text-blue-200 overflow-hidden">
      {/* Floating Tiny Data Bubbles Background Canvas */}
      <FloatingDataBubbles theme={theme} />

      {/* Top Navbar */}
      <nav className="relative z-10 w-full px-6 lg:px-12 py-4 border-b border-border flex items-center justify-between max-w-7xl mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <Logo size="md" />

        <div className="flex items-center gap-3">
          {/* Auto-Update Indicator */}
          <UpdateIndicator />

          {/* If running locally, show Desktop Edition badge. If on web, show Download button */}
          {isLocalApp ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" />
              <span>Desktop Edition (100% Local & Private)</span>
            </div>
          ) : (
            <button
              onClick={() => {
                setDownloadModalReason('DEFAULT');
                setIsDownloadModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Desktop App</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-foreground border border-border transition-all cursor-pointer shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-blue-900" />
            )}
          </button>
        </div>
      </nav>

      {/* Main Hero Container */}
      <div className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10 lg:py-12 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-300 text-xs font-bold shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" />
              <span>Deterministic AST Graph & Blast-Radius Engine</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Air-Gapped & Offline Architecture</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-3 text-blue-950 dark:text-blue-300">
            Universal Backend Architecture & Blast Platform
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Extract Database Schemas, High-Level (HLD) & Low-Level (LLD) Design Diagrams, and simulate modification ripple effects across Developers, Managers, and Business Owners.
          </p>
        </div>

        {/* Multi-Modal Ingestion Console Box */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-border shadow-xl mb-8 transition-all">
          {/* Mode Switcher Segmented Pills */}
          <div className="flex items-center justify-center sm:justify-start gap-1 p-1 bg-slate-100 dark:bg-neutral-900 rounded-2xl mb-5 max-w-fit border border-border">
            <button
              onClick={() => setIngestMode('PATH')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ingestMode === 'PATH'
                  ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <FolderSearch className="h-3.5 w-3.5" />
              <span>Local Path</span>
            </button>

            <button
              onClick={() => setIngestMode('UPLOAD')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ingestMode === 'UPLOAD'
                  ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>ZIP / Files</span>
            </button>

            <button
              onClick={() => setIngestMode('PASTE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ingestMode === 'PASTE'
                  ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Paste Schema</span>
            </button>

            <button
              onClick={() => setIngestMode('GIT')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ingestMode === 'GIT'
                  ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Git / GitHub</span>
            </button>
          </div>

          {/* MODE 1: Local Folder Path */}
          {ingestMode === 'PATH' && (
            <div>
              {/* Web Edition Notice */}
              {!isLocalApp && (
                <div className="mb-4 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-blue-950 dark:text-blue-300 block mb-0.5">
                      Web Edition Notice: Direct Local Folder Path Access
                    </span>
                    <p className="text-blue-900/80 dark:text-blue-300/80 font-medium leading-relaxed mb-2.5">
                      Web browsers cannot access files directly from your computer's hard drive (e.g. <code>C:/...</code>, <code>/Users/...</code>) for privacy and security. To scan your local codebase folders directly, please <strong>Download the BendLens Desktop App</strong>.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => { setDownloadModalReason('DEFAULT'); setIsDownloadModalOpen(true); }}
                        className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-[11px] shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download Desktop App (.exe)</span>
                      </button>
                      <button
                        onClick={() => setIngestMode('UPLOAD')}
                        className="px-3 py-1.5 rounded-lg bg-surface-card border border-border text-foreground font-bold text-[11px] hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        Upload .ZIP Archive
                      </button>
                      <button
                        onClick={() => setIngestMode('PASTE')}
                        className="px-3 py-1.5 rounded-lg bg-surface-card border border-border text-foreground font-bold text-[11px] hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                      >
                        Paste SQL / Schema
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <label className="block text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300 mb-2">
                Enter Local Codebase Folder Path
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                <div className="relative flex-1 w-full">
                  <FolderSearch className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(cleanInputPath(e.target.value))}
                    placeholder="e.g., C:/Projects/my-backend or D:/BCBUZZ_Side_Project/data-project/sample_project"
                    className="w-full pl-10 pr-4 py-3 text-xs rounded-xl bg-surface-card border border-border focus:border-blue-900 dark:focus:border-blue-400 outline-none text-foreground font-mono font-medium placeholder-slate-400 transition-all shadow-sm"
                  />
                </div>
                <button
                  onClick={() => handleScanPath()}
                  disabled={isScanning}
                  className="w-full sm:w-auto px-7 py-3 text-xs font-black rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {isScanning ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                  <span>Analyze Folder</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: Drag & Drop ZIP Upload */}
          {ingestMode === 'UPLOAD' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300 mb-2">
                Upload Project .ZIP Archive or Schema Files
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-blue-900 dark:hover:border-blue-400 rounded-2xl p-8 text-center bg-surface-card cursor-pointer transition-all mb-4"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".zip,.sql,.prisma,.py,.ts,.js,.json"
                  className="hidden"
                />
                <UploadCloud className="h-8 w-8 text-blue-900 dark:text-blue-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-foreground">
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'Click or Drag & Drop .ZIP or Schema Files here'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports zip archives of full backend repos, `.sql` DDLs, Prisma schemas, Python models, and JSON definitions.
                </p>
              </div>

              <button
                onClick={handleScanUpload}
                disabled={isScanning || !selectedFile}
                className="w-full py-3 px-6 text-xs font-black rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                <span>Analyze Uploaded Archive</span>
              </button>
            </div>
          )}

          {/* MODE 3: Paste SQL / DDL / Prisma */}
          {ingestMode === 'PASTE' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300 mb-2">
                Paste SQL DDL / Prisma Schema / ORM Definition
              </label>
              <div className="relative mb-4">
                <textarea
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  rows={8}
                  placeholder="Paste CREATE TABLE ... or model User { ... }"
                  className="w-full p-4 text-xs rounded-xl bg-surface-card border border-border focus:border-blue-900 dark:focus:border-blue-400 outline-none text-foreground font-mono font-medium placeholder-slate-400 resize-y shadow-inner"
                />
              </div>

              <button
                onClick={handleScanPaste}
                disabled={isScanning || !pastedCode.trim()}
                className="w-full py-3 px-6 text-xs font-black rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                <span>Generate Architecture & ERD from Schema</span>
              </button>
            </div>
          )}

          {/* MODE 4: Git / GitHub Clone */}
          {ingestMode === 'GIT' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300 mb-2">
                Enter Git / GitHub Repository URL (Public or Private)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                <div className="relative flex-1 w-full">
                  <Globe className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="e.g., https://github.com/Keerthivasan004/BendLens"
                    className="w-full pl-10 pr-4 py-3 text-xs rounded-xl bg-surface-card border border-border focus:border-blue-900 dark:focus:border-blue-400 outline-none text-foreground font-mono font-medium placeholder-slate-400 transition-all shadow-sm"
                  />
                </div>
                <button
                  onClick={handleScanGit}
                  disabled={isScanning}
                  className="w-full sm:w-auto px-7 py-3 text-xs font-black rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {isScanning ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                  <span>Clone & Analyze</span>
                </button>
              </div>

              {/* Optional Token Field for Private Repositories */}
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="GitHub Personal Access Token (Optional - Required for Private Repos)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-card border border-border/70 focus:border-blue-900 dark:focus:border-blue-400 outline-none text-foreground font-mono placeholder-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                For private repositories, generate a Personal Access Token (classic) with <code className="font-mono text-blue-600 dark:text-blue-400">repo</code> scope on GitHub.
              </p>
            </div>
          )}

          {/* Scanning Progress Bar */}
          {isScanning && (
            <div className="my-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-bold text-blue-950 dark:text-blue-300 mb-2">
                <span>Running AST & Graph Pipeline...</span>
                <span>{scanStep === 1 ? '30%' : scanStep === 2 ? '70%' : '95%'}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-900 dark:bg-blue-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${scanStep === 1 ? 30 : scanStep === 2 ? 70 : 95}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-fadeIn font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Sample Action */}
          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Want to see a real-world multi-service architecture demo?
            </span>
            <button
              onClick={handleLoadSample}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-blue-900 dark:text-blue-300 font-bold border border-blue-900/20 dark:border-blue-400/20 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" />
              <span>Load Interactive E-Commerce Architecture</span>
            </button>
          </div>
        </div>

        {/* Live Analysis Summary Card */}
        {analysisResult && (
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-blue-900/30 dark:border-blue-500/30 shadow-2xl mb-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-base font-extrabold text-blue-950 dark:text-blue-300">
                    AST Architecture & Blast Radius Model Ready
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Project: <strong className="text-foreground">{analysisResult.projectName}</strong> ({analysisResult.projectPath})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Deterministic</span>
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-surface-card border border-border text-center">
                <FileCode className="h-4 w-4 text-blue-900 dark:text-blue-400 mx-auto mb-1" />
                <div className="text-lg font-black text-blue-950 dark:text-blue-300 font-mono">
                  {analysisResult.scannedFilesCount || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Scanned Files</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-card border border-border text-center">
                <Database className="h-4 w-4 text-violet-700 dark:text-violet-400 mx-auto mb-1" />
                <div className="text-lg font-black text-violet-900 dark:text-violet-300 font-mono">
                  {analysisResult.schema?.tables?.length || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Database Tables</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-card border border-border text-center">
                <Cpu className="h-4 w-4 text-rose-700 dark:text-rose-400 mx-auto mb-1" />
                <div className="text-lg font-black text-rose-900 dark:text-rose-300 font-mono">
                  {analysisResult.code?.endpoints?.length || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">API Endpoints</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-card border border-border text-center">
                <Layers className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mx-auto mb-1" />
                <div className="text-lg font-black text-emerald-900 dark:text-emerald-300 font-mono">
                  {analysisResult.graph?.stats?.totalNodes || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Graph Connections</span>
              </div>
            </div>

            {/* Prominent High-Impact Launch Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleOpenLens}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
              >
                <span>Show Lens (Open Architecture & Blast Studio)</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              {!isLocalApp && (
                <button
                  onClick={() => {
                    setDownloadModalReason('DEFAULT');
                    setIsDownloadModalOpen(true);
                  }}
                  className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-800 text-foreground font-bold text-xs border border-border shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4 text-blue-900 dark:text-blue-400" />
                  <span>Download .EXE App</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Local Scans History / Saved Projects on User Machine */}
        {localHistory.length > 0 && (
          <div className="glass-panel p-5 rounded-2xl border border-border mb-8">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-blue-900 dark:text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-300">
                  Recent Scans ({isLocalApp ? 'Stored on Your PC' : 'Workspace History'})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {localHistory.length} Projects Saved
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {localHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleScanPath(item.projectPath)}
                  className="p-3.5 rounded-xl bg-surface-card hover:bg-slate-50 dark:hover:bg-neutral-800/80 border border-border hover:border-blue-900/40 dark:hover:border-blue-400/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                >
                  <div className="mb-2">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-foreground truncate group-hover:text-blue-900 dark:group-hover:text-blue-300 transition-colors">
                        {item.projectName || 'Project'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-900 dark:group-hover:text-blue-300 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 truncate" title={item.projectPath}>
                      {item.projectPath}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <Database className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                      <span>{item.tablesCount} tables</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                      <span>{item.endpointsCount} APIs</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 w-fit mb-3 text-blue-900 dark:text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-blue-950 dark:text-blue-300 uppercase tracking-wider mb-1.5">
                Deterministic Schema & ERD
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Extracts tables, primary/foreign keys, and relationships directly from SQL, Prisma, Django, SQLAlchemy, and TypeORM.
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 w-fit mb-3 text-violet-700 dark:text-violet-400">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-violet-950 dark:text-violet-300 uppercase tracking-wider mb-1.5">
                Multi-Perspective Views
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Dedicated role consoles for <strong>Developers</strong> (LLD/Code), <strong>Managers</strong> (HLD/Services), and <strong>Business Owners</strong> (Journeys).
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 w-fit mb-3 text-rose-700 dark:text-rose-400">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-rose-950 dark:text-rose-300 uppercase tracking-wider mb-1.5">
                Blast Radius Simulator
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Simulate column drops, schema changes, and endpoint mutations to calculate dependency impact before deploying.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Desktop App Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        reason={downloadModalReason}
      />
    </main>
  );
}
