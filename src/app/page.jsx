'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import DownloadModal from '@/components/DownloadModal';
import UpdateIndicator from '@/components/UpdateIndicator';
import FloatingDataBubbles from '@/components/FloatingDataBubbles';
import { 
  Layers, FolderSearch, Play, Sparkles, CheckCircle2, 
  ArrowRight, Database, FileCode, Cpu, AlertCircle, 
  Sun, Moon, ShieldAlert, Zap, Box, Code2, Network, 
  GitPullRequest, ArrowUpRight, UploadCloud, FileSpreadsheet, 
  Globe, FileText, Download, History, Clock, HardDrive, Laptop
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  
  // Ingestion Mode: 'PATH' | 'UPLOAD' | 'PASTE' | 'GIT'
  const [ingestMode, setIngestMode] = useState('PATH');
  
  // Mode States
  const [folderPath, setFolderPath] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [pastedCode, setPastedCode] = useState(
`-- Paste SQL DDL, Prisma schema, or ORM models here
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);`
  );
  const [pastedFileType, setPastedFileType] = useState('schema.sql');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // General State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState('dark');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadModalReason, setDownloadModalReason] = useState('DEFAULT');
  const [localHistory, setLocalHistory] = useState([]);

  // Initialize theme & load local history
  useEffect(() => {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('bendlens-theme') || 'dark';
      const savedPath = localStorage.getItem('bendlens-path');
      if (savedPath) setFolderPath(savedPath);
    } catch {}

    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    fetchLocalHistory();
  }, []);

  const fetchLocalHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocalHistory(json.data);
      }
    } catch {}
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

  const simulateScanSteps = () => {
    setScanStep(1);
    const t1 = setTimeout(() => setScanStep(2), 350);
    const t2 = setTimeout(() => setScanStep(3), 750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  };

  // 1. Analyze by Local Path
  const handleScanPath = async (targetPath = folderPath) => {
    const sanitized = cleanInputPath(targetPath);
    setIsScanning(true);
    setErrorMessage('');
    simulateScanSteps();

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: sanitized })
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        setFolderPath(result.data.projectPath);
        fetchLocalHistory();
        try {
          localStorage.setItem('bendlens-path', result.data.projectPath);
        } catch {}
      } else {
        setErrorMessage(result.error || 'Failed to analyze project folder');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to local engine');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  // 2. Analyze by File / ZIP Upload
  const handleScanUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a .zip archive or schema file first.');
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
        setErrorMessage(result.error || 'Upload scan failed');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error uploading file to local engine');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  // 3. Analyze by Pasted Code / DDL
  const handleScanPaste = async () => {
    if (!pastedCode.trim()) {
      setErrorMessage('Please enter SQL DDL, Prisma, or ORM models.');
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
          fileType: pastedFileType,
          projectName: 'Custom Ingested Schema'
        })
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        fetchLocalHistory();
      } else {
        setErrorMessage(result.error || 'Failed to analyze pasted schema');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error processing pasted schema');
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
        body: JSON.stringify({ repoUrl: gitUrl.trim() })
      });
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        fetchLocalHistory();
      } else {
        setErrorMessage(result.error || 'Git clone failed. Ensure git is installed and repo is public.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to git engine');
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  const handleSampleProject = async () => {
    setIsScanning(true);
    setErrorMessage('');
    simulateScanSteps();

    try {
      const res = await fetch('/api/sample');
      const result = await res.json();
      if (result.success) {
        setAnalysisResult(result.data);
        setFolderPath(result.data.projectPath);
        fetchLocalHistory();
        try {
          localStorage.setItem('bendlens-path', result.data.projectPath);
        } catch {}
      } else {
        setErrorMessage(result.error || 'Failed to load sample project');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to backend engine');
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

          {/* Download Desktop App Button */}
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/80 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer shadow-sm"
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>Download Desktop App</span>
          </button>

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
              <Zap className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" />
              <span>Deterministic AST Graph & Blast-Radius Engine</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 text-xs font-bold shadow-sm">
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>100% Local & Air-Gapped: Zero Code Leaves Your Machine</span>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-blue-950 dark:text-blue-400 mb-3 max-w-3xl mx-auto leading-tight">
            Universal Backend Architecture & Blast Lens
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
                  Supports .zip codebase archives, .sql DDLs, schema.prisma, and Python ORMs
                </p>
              </div>
              <button
                onClick={handleScanUpload}
                disabled={isScanning || !selectedFile}
                className="w-full py-2.5 text-xs font-black rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                <span>Extract & Analyze Upload</span>
              </button>
            </div>
          )}

          {/* MODE 3: Paste Schema / DDL Code */}
          {ingestMode === 'PASTE' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300">
                  Paste Raw SQL DDL, Prisma, or ORM Models
                </label>
                <select
                  value={pastedFileType}
                  onChange={(e) => setPastedFileType(e.target.value)}
                  className="px-2 py-1 text-[11px] font-mono font-bold rounded bg-surface-card border border-border text-foreground outline-none"
                >
                  <option value="schema.sql">SQL DDL (.sql)</option>
                  <option value="schema.prisma">Prisma (.prisma)</option>
                  <option value="models.py">Python ORM (.py)</option>
                </select>
              </div>

              <textarea
                rows={6}
                value={pastedCode}
                onChange={(e) => setPastedCode(e.target.value)}
                className="w-full p-3 text-xs font-mono rounded-xl bg-surface-card border border-border focus:border-blue-900 dark:focus:border-blue-400 outline-none text-foreground mb-3"
              />

              <button
                onClick={handleScanPaste}
                disabled={isScanning}
                className="w-full py-2.5 text-xs font-black rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
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
                Enter Public Git / GitHub Repository URL
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                <div className="relative flex-1 w-full">
                  <Globe className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="e.g., https://github.com/fastapi/fastapi or https://github.com/expressjs/express"
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
                  className="bg-blue-900 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: scanStep === 1 ? '30%' : scanStep === 2 ? '70%' : '95%' }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-border text-xs">
            <span className="text-slate-500 font-medium">Or test with ready-to-run architecture:</span>
            <button
              onClick={handleSampleProject}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-900 text-blue-900 dark:text-blue-300 border border-blue-900/30 dark:border-blue-400/30 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-900 dark:text-blue-400" />
              Load Sample E-Commerce Backend
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-bold mb-8 shadow-sm animate-fadeIn">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scan Results Card & "Show Lens" Launch Trigger */}
        {analysisResult && (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-blue-900/40 dark:border-blue-500/40 shadow-2xl mb-12 animate-fadeIn bg-gradient-to-b from-blue-50/20 to-transparent dark:from-blue-950/10">
            <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-blue-950 dark:text-blue-300">
                    Analysis Completed Successfully
                  </h2>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Target: <strong className="font-mono text-foreground">{analysisResult.projectName}</strong>
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {new Date(analysisResult.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-surface-card border border-border">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Scanned Files</span>
                <div className="text-2xl font-black text-foreground mt-1">
                  {analysisResult.scannedFilesCount}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Source modules</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border">
                <span className="text-[10px] uppercase font-bold text-blue-900 dark:text-blue-400 block">Database Tables</span>
                <div className="text-2xl font-black text-foreground mt-1">
                  {analysisResult.schema?.tables?.length || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Entities & Schemas</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border">
                <span className="text-[10px] uppercase font-bold text-violet-700 dark:text-violet-400 block">API Endpoints</span>
                <div className="text-2xl font-black text-foreground mt-1">
                  {analysisResult.code?.endpoints?.length || 0}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">REST & Route Sites</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-card border border-border">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Knowledge Nodes</span>
                <div className="text-2xl font-black text-foreground mt-1">
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
                  Recent Local Scans (Stored on Your PC)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {localHistory.length} Projects Saved Locally
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {localHistory.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.projectPath) handleScanPath(item.projectPath);
                  }}
                  className="bg-surface-card hover:bg-slate-50 dark:hover:bg-neutral-900 p-3.5 rounded-xl border border-border transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.projectName}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{item.tablesCount} Tables</span>
                    <span>•</span>
                    <span>{item.endpointsCount} APIs</span>
                    <span>•</span>
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card p-5 rounded-2xl border border-border">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-900 dark:text-blue-400 mb-3">
              <Database className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-extrabold text-blue-950 dark:text-blue-300 mb-1.5">
              Cross-Dialect Database ERD
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed font-medium">
              Extracts schemas from Postgres, MySQL, SQLite, SQL Server, MongoDB, Prisma, and ORM models with live data value previews.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border">
            <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center text-violet-700 dark:text-violet-400 mb-3">
              <Network className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-extrabold text-blue-950 dark:text-blue-300 mb-1.5">
              High & Low-Level Diagrams
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed font-medium">
              Auto-generates C4 Container views, component call graphs, and interactive execution sequence flows with infinite zoom & pan.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border">
            <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-700 dark:text-rose-400 mb-3">
              <GitPullRequest className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-extrabold text-blue-950 dark:text-blue-300 mb-1.5">
              Blast Radius Simulator
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed font-medium">
              Simulate modifications to tables or methods and calculate upstream/downstream breaking changes before merging pull requests.
            </p>
          </div>
        </div>
      </div>

      {/* Download Desktop Studio Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        reason={downloadModalReason}
      />
    </main>
  );
}
