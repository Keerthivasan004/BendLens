'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import UpdateIndicator from '@/components/UpdateIndicator';
import DownloadModal from '@/components/DownloadModal';
import ThemeToggle from '@/components/ThemeToggle';
import {
  FolderSearch, Play, Sparkles, Database, FileCode, Cpu, Layers,
  CheckCircle2, ArrowRight, ShieldCheck, HardDrive, Terminal,
  UploadCloud, GitBranch, Globe, Laptop, Lock, AlertTriangle, AlertCircle, Download, Zap, RefreshCw
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
  const [isDragging, setIsDragging] = useState(false);

  // Shared Execution State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
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

    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.endsWith('.local');
      setIsLocalApp(isLocal);
    }

    fetchLocalHistory();
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

  const executeScanWithStages = async (fetchPromise, onComplete) => {
    setIsScanning(true);
    setErrorMessage('');
    setScanStep(1);
    setScanProgress(25);

    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep <= 4) {
        setScanStep(currentStep);
        setScanProgress(currentStep === 2 ? 50 : currentStep === 3 ? 75 : 95);
      }
    }, 180);

    try {
      const res = await fetchPromise;
      const result = await res.json();
      clearInterval(interval);

      if (result.success) {
        setScanStep(5);
        setScanProgress(100);
        await new Promise((r) => setTimeout(r, 120));
        onComplete(result.data);
      } else {
        setErrorMessage(result.error || 'Analysis failed.');
      }
    } catch (err) {
      clearInterval(interval);
      setErrorMessage(err.message || 'Error executing architecture analysis');
    } finally {
      clearInterval(interval);
      setIsScanning(false);
      setScanStep(0);
      setScanProgress(0);
    }
  };

  // 1. Analyze by Local Folder Path
  const handleScanPath = async (overridePath) => {
    const target = overridePath || folderPath;

    if (!isLocalApp && target && (target.includes(':/') || target.includes(':\\') || target.startsWith('/Users/') || target.startsWith('/home/') || target.startsWith('C:') || target.startsWith('D:'))) {
      setErrorMessage('Browser Security Notice: Web browsers cannot access host disk paths directly. Download the BendLens Desktop App for direct folder scans, or use ZIP Upload, Paste Schema, or Git Clone.');
      setDownloadModalReason('DEFAULT');
      setIsDownloadModalOpen(true);
      return;
    }

    const fetchPromise = fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: target })
    });

    await executeScanWithStages(fetchPromise, (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
    });
  };

  // 2. Analyze by File / ZIP Upload
  const handleScanUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a .zip archive or schema file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    const fetchPromise = fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    await executeScanWithStages(fetchPromise, (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
      setTimeout(() => {
        const resultElem = document.getElementById('analysis-summary-card');
        if (resultElem) {
          resultElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 250);
    });
  };

  // 3. Analyze by Pasted Code / Schema
  const handleScanPaste = async () => {
    if (!pastedCode.trim()) {
      setErrorMessage('Please paste SQL DDL, Prisma schema, or ORM models.');
      return;
    }

    const fetchPromise = fetch('/api/paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: pastedCode,
        fileType: pastedCode.includes('model ') ? 'schema.prisma' : 'schema.sql',
        projectName: 'Custom Schema Ingestion'
      })
    });

    await executeScanWithStages(fetchPromise, (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
    });
  };

  // 4. Analyze by Git / GitHub Clone
  const handleScanGit = async () => {
    if (!gitUrl.trim()) {
      setErrorMessage('Please enter a valid Git repository URL.');
      return;
    }

    const fetchPromise = fetch('/api/git-clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        repoUrl: gitUrl.trim(),
        token: gitToken.trim()
      })
    });

    await executeScanWithStages(fetchPromise, (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
    });
  };

  // Load Built-in Mock Architecture
  const handleLoadSample = async () => {
    const fetchPromise = fetch('/api/sample');
    await executeScanWithStages(fetchPromise, (data) => {
      setAnalysisResult(data);
    });
  };

  // Navigate to Studio Console
  const handleOpenLens = (role = 'DEVELOPER', tab = null) => {
    try {
      localStorage.setItem('bendlens-initial-role', role);
      if (tab) {
        localStorage.setItem('bendlens-initial-tab', tab);
      } else {
        localStorage.removeItem('bendlens-initial-tab');
      }
    } catch {}
    router.push('/lens');
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col transition-colors selection:bg-brand/20 selection:text-foreground">
      {/* Top Navigation Bar */}
      <nav className="w-full border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-2.5">
            <UpdateIndicator />

            {isLocalApp ? (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-raised text-muted border border-border">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Desktop Edition · Local & Private</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDownloadModalReason('DEFAULT');
                  setIsDownloadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-surface-raised hover:bg-surface-subtle text-foreground border border-border transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Desktop App</span>
              </button>
            )}

            <ThemeToggle
              theme={theme}
              onToggle={toggleTheme}
              onChange={toggleTheme}
            />
          </div>
        </div>
      </nav>

      {/* Hero & Ingestion Container */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-border text-xs font-medium text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              <span>Deterministic AST Graph & Blast-Radius Engine</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised border border-border text-xs font-medium text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Air-Gapped & Offline Architecture</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-3">
            Universal Backend Architecture & Blast Platform
          </h1>
          
          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Extract relational schemas, high-level (HLD) & low-level (LLD) architectural diagrams, and simulate modification ripple effects across Developers, Managers, and Business Owners.
          </p>
        </div>

        {/* Multi-Modal Ingestion Shell */}
        <div className="p-5 sm:p-7 rounded-xl border border-border bg-surface-card shadow-card mb-8 transition-all">
          {/* Segmented Mode Selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-subtle border border-border-subtle mb-5 max-w-fit flex-wrap">
            <button
              onClick={() => setIngestMode('PATH')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'PATH'
                  ? 'bg-surface-raised text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FolderSearch className="h-3.5 w-3.5" />
              <span>Local Path</span>
            </button>

            <button
              onClick={() => setIngestMode('UPLOAD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'UPLOAD'
                  ? 'bg-surface-raised text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>ZIP / Files</span>
            </button>

            <button
              onClick={() => setIngestMode('PASTE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'PASTE'
                  ? 'bg-surface-raised text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Paste Schema</span>
            </button>

            <button
              onClick={() => setIngestMode('GIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'GIT'
                  ? 'bg-surface-raised text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Git / GitHub</span>
            </button>
          </div>

          {/* MODE 1: Local Folder Path */}
          {ingestMode === 'PATH' && (
            <div>
              {!isLocalApp && (
                <div className="mb-4 p-3.5 rounded-lg bg-surface-subtle border border-border flex items-start gap-3 text-xs">
                  <AlertCircle className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground block mb-0.5">
                      Direct Hard-Drive Path Notice
                    </span>
                    <p className="text-muted leading-relaxed mb-2.5">
                      Web browsers cannot access local disk paths directly due to browser sandboxing. For direct folder scans, download the BendLens Desktop App, or use ZIP Upload or Paste Schema.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => { setDownloadModalReason('DEFAULT'); setIsDownloadModalOpen(true); }}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        <Download className="h-3 w-3 mr-1.5" />
                        <span>Download Desktop App (.exe)</span>
                      </button>
                      <button
                        onClick={() => setIngestMode('UPLOAD')}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Upload .ZIP Archive
                      </button>
                      <button
                        onClick={() => setIngestMode('PASTE')}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Paste SQL / Schema
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Local Codebase Directory Path
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-3">
                <div className="relative flex-1 w-full">
                  <FolderSearch className="h-4 w-4 absolute left-3 top-2.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => setFolderPath(cleanInputPath(e.target.value))}
                    placeholder="e.g., C:/Projects/my-backend or D:/BCBUZZ_Side_Project/data-project/sample_project"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted/60 transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleScanPath()}
                  disabled={isScanning}
                  className={`w-full sm:w-auto px-5 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                    analysisResult
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-500/50'
                      : 'btn-primary'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                      <span>Analyzing Codebase AST...</span>
                    </>
                  ) : analysisResult ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-white" />
                      <span>Analysis Complete (Rescan)</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current mr-2" />
                      <span>Analyze Folder</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: Drag & Drop ZIP Upload */}
          {ingestMode === 'UPLOAD' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Upload Project .ZIP Archive or Schema Files
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const droppedFile = e.dataTransfer?.files?.[0];
                  if (droppedFile) {
                    setSelectedFile(droppedFile);
                  }
                }}
                className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-3 ${
                  isDragging
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/30 scale-[1.01]'
                    : 'border-border hover:border-brand bg-surface-subtle/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".zip,.sql,.prisma,.py,.ts,.js,.json"
                  className="hidden"
                />
                <UploadCloud className={`h-7 w-7 mx-auto mb-2 transition-colors ${isDragging ? 'text-brand' : 'text-muted'}`} />
                <div className="text-xs font-semibold text-foreground">
                  {selectedFile ? `Selected: ${selectedFile.name}` : isDragging ? 'Drop archive file here' : 'Click or drop .ZIP or schema files here'}
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Supports backend repository ZIPs, .sql DDL scripts, Prisma schemas, and Python model definitions.
                </p>
              </div>

              {/* Direct Result Confirmation & Console Launch Banner */}
              {analysisResult && (
                <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-foreground animate-fadeIn mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground">Archive Extracted & Analyzed!</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                      {analysisResult.projectName}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/40 text-center text-xs my-2 font-mono">
                    <div>
                      <div className="font-bold text-foreground">{analysisResult.scannedFilesCount || 0}</div>
                      <div className="text-[10px] text-muted font-sans">Files</div>
                    </div>
                    <div>
                      <div className="font-bold text-violet-400">{analysisResult.schema?.tables?.length || 0}</div>
                      <div className="text-[10px] text-muted font-sans">Tables</div>
                    </div>
                    <div>
                      <div className="font-bold text-rose-400">{analysisResult.code?.endpoints?.length || 0}</div>
                      <div className="text-[10px] text-muted font-sans">Endpoints</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenLens('DEVELOPER')}
                    className="w-full py-2 px-3 text-xs font-bold rounded-md bg-brand hover:bg-brand-hover text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm mt-1"
                  >
                    <span>Open Lens Studio Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleScanUpload}
                disabled={isScanning || !selectedFile}
                className={`w-full py-2.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                  analysisResult
                    ? 'bg-surface-raised hover:bg-surface-subtle text-foreground border border-border'
                    : 'btn-primary'
                }`}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                    <span>Unpacking & Analyzing Archive...</span>
                  </>
                ) : analysisResult ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 text-muted" />
                    <span>Upload & Analyze Another Archive</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current mr-2" />
                    <span>Analyze Uploaded Archive</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* MODE 3: Paste SQL / DDL / Prisma */}
          {ingestMode === 'PASTE' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-semibold text-foreground">
                  Paste SQL DDL / Prisma Schema / ORM Definition
                </label>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[11px] text-muted">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setPastedCode(`-- E-Commerce Architecture (PostgreSQL / Relational)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'CUSTOMER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);`)}
                    className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-medium text-foreground cursor-pointer transition-colors"
                  >
                    E-Commerce
                  </button>
                  <button
                    type="button"
                    onClick={() => setPastedCode(`-- SaaS Multi-Tenant Billing (PostgreSQL)
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier VARCHAR(50) DEFAULT 'FREE'
);

CREATE TABLE team_members (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'MEMBER'
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    stripe_sub_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL,
    renews_at TIMESTAMP NOT NULL
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    amount_due NUMERIC(12, 2) NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`)}
                    className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-medium text-foreground cursor-pointer transition-colors"
                  >
                    SaaS Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setPastedCode(`-- Fintech Double-Entry Ledger (PostgreSQL)
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(30) DEFAULT 'ACTIVE'
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    entry_type VARCHAR(20) NOT NULL,
    amount NUMERIC(18, 4) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`)}
                    className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-medium text-foreground cursor-pointer transition-colors"
                  >
                    Fintech Ledger
                  </button>
                </div>
              </div>

              <div className="relative mb-3">
                <textarea
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  rows={8}
                  placeholder="Paste CREATE TABLE ... or model User { ... }"
                  className="w-full p-3.5 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted/60 resize-y"
                />
              </div>

              <button
                onClick={handleScanPaste}
                disabled={isScanning || !pastedCode.trim()}
                className={`w-full py-2.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                  analysisResult
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-500/50'
                    : 'btn-primary'
                }`}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                    <span>Synthesizing Architecture & ERD...</span>
                  </>
                ) : analysisResult ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-white" />
                    <span>Architecture Ready (Re-generate)</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current mr-2" />
                    <span>Generate Architecture & ERD from Schema</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* MODE 4: Git / GitHub Clone */}
          {ingestMode === 'GIT' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Git / GitHub Repository URL (Public or Private)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-2.5">
                <div className="relative flex-1 w-full">
                  <Globe className="h-4 w-4 absolute left-3 top-2.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="e.g., https://github.com/Keerthivasan004/BendLens"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted/60 transition-colors"
                  />
                </div>
                <button
                  onClick={handleScanGit}
                  disabled={isScanning}
                  className={`w-full sm:w-auto px-5 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                    analysisResult
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-500/50'
                      : 'btn-primary'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                      <span>Cloning Repo & Analyzing AST...</span>
                    </>
                  ) : analysisResult ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-white" />
                      <span>Clone & Analysis Complete</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current mr-2" />
                      <span>Clone & Analyze</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="GitHub Personal Access Token (Optional - Required for Private Repos)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted/60"
                />
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                For private repositories, use a classic Personal Access Token with <code className="font-mono text-foreground font-semibold">repo</code> scope.
              </p>
            </div>
          )}

          {/* Scanning Animation & Progress HUD - Distinct Dark and Light Theme Experiences */}
          {isScanning && (
            <div
              className={`my-4 p-4 sm:p-5 rounded-xl border transition-all animate-fadeIn ${
                theme === 'dark'
                  ? 'analysis-scanner-dark border-emerald-500/40 text-slate-100'
                  : 'analysis-scanner-light border-blue-500/40 text-slate-900 shadow-card'
              }`}
            >
              {/* Active Stage Header & Telemetry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      theme === 'dark'
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                        : 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
                    }`}
                  >
                    {scanStep === 1 && <FileCode className="h-4 w-4 step-radar-pulse" />}
                    {scanStep === 2 && <Database className="h-4 w-4 step-radar-pulse" />}
                    {scanStep === 3 && <Layers className="h-4 w-4 step-radar-pulse" />}
                    {scanStep === 4 && <Zap className="h-4 w-4 step-radar-pulse" />}
                    {scanStep === 5 && <CheckCircle2 className="h-4 w-4 text-emerald-500 animate-bounce" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          theme === 'dark' ? 'text-emerald-400' : 'text-blue-600'
                        }`}
                      >
                        {scanStep === 5 ? 'Analysis Finalized' : `Stage ${scanStep || 1} of 4`}
                      </span>
                      <span className={`text-[10px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {theme === 'dark' ? '• Cybernetic Laser Scanline' : '• Fluid Shimmer Beam'}
                      </span>
                    </div>

                    <h4
                      className={`text-sm sm:text-base font-bold transition-colors ${
                        theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      {scanStep === 1 && 'AST Ingestion & Syntax Tokenization'}
                      {scanStep === 2 && 'Relational Schema & Key Extraction'}
                      {scanStep === 3 && 'Full-Stack Call Graph & Route Mapping'}
                      {scanStep === 4 && 'Blast Radius & Persona Modeling'}
                      {scanStep === 5 && 'Architecture Model Ready!'}
                    </h4>
                  </div>
                </div>

                {/* Percentage Pill */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                      theme === 'dark'
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        theme === 'dark' ? 'bg-emerald-400' : 'bg-blue-600'
                      } animate-ping`}
                    />
                    <span>{scanProgress || 25}%</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar Track with Theme-Specific Animation */}
              <div
                className={`relative w-full h-2 rounded-full overflow-hidden mb-3.5 ${
                  theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-slate-200 border border-slate-300/60'
                }`}
              >
                {/* Background Fill */}
                <div
                  className={`h-full transition-all duration-300 rounded-full relative overflow-hidden ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.6)]'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                  }`}
                  style={{ width: `${scanProgress || 25}%` }}
                >
                  {/* Theme-Differentiated Overlays */}
                  {theme === 'dark' ? (
                    <div className="absolute inset-0 w-full h-full laser-beam-dark" />
                  ) : (
                    <div className="absolute inset-0 w-full h-full shimmer-wave-light" />
                  )}
                </div>
              </div>

              {/* Step Progression Badges - All 4 Stages with Crisp Contrast */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50">
                {[
                  { stepNum: 1, label: 'AST Syntax Tokens' },
                  { stepNum: 2, label: 'Schema & Keys' },
                  { stepNum: 3, label: 'Topology Graph' },
                  { stepNum: 4, label: 'Blast Radius' },
                ].map((st) => {
                  const isDone = (scanStep || 1) > st.stepNum || scanStep === 5;
                  const isActive = (scanStep || 1) === st.stepNum && scanStep !== 5;

                  return (
                    <div
                      key={st.stepNum}
                      className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                        isDone
                          ? theme === 'dark'
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-semibold'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                          : isActive
                          ? theme === 'dark'
                            ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-200 font-bold shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                            : 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-xs'
                          : theme === 'dark'
                          ? 'bg-surface-raised/40 border-border/40 text-slate-400'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : isActive ? (
                        <RefreshCw className="h-3 w-3 animate-spin shrink-0 text-brand" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-border shrink-0 ml-1 mr-0.5" />
                      )}
                      <span className="truncate">{st.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Real-time Telemetry Terminal Strip */}
              <div
                className={`mt-3 px-3 py-2 rounded-md font-mono text-[11px] flex items-center justify-between border ${
                  theme === 'dark'
                    ? 'bg-[#080d18] border-emerald-500/20 text-emerald-400'
                    : 'bg-[#f8fafc] border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={theme === 'dark' ? 'text-cyan-400 font-bold' : 'text-blue-700 font-bold'}>
                    [AST-ENGINE]
                  </span>
                  <span className="truncate">
                    {scanStep === 1 && '> Scanning source files & generating AST token stream...'}
                    {scanStep === 2 && '> Parsing SQL DDL tables, foreign keys & constraints...'}
                    {scanStep === 3 && '> Linking controllers, endpoints & execution call hierarchy...'}
                    {scanStep === 4 && '> Computing bidirectional ripple matrix & severity scores...'}
                    {scanStep === 5 && '> Pipeline execution complete. AST model synthesized.'}
                  </span>
                </div>
                <span className="console-cursor text-brand font-bold shrink-0 ml-2">_</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-3.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-fadeIn font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Sample Action */}
          <div className="mt-4 pt-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted">
              Want to explore a pre-scanned multi-service architecture demo?
            </span>
            <button
              onClick={handleLoadSample}
              disabled={isScanning}
              className={`text-xs py-1.5 px-3.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                analysisResult
                  ? 'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'btn-secondary'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand mr-1" />
                  <span>Compiling Sample Architecture...</span>
                </>
              ) : analysisResult ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Load Interactive E-Commerce Architecture (Ready)</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  <span>Load Interactive E-Commerce Architecture</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Analysis Summary Card */}
        {analysisResult && (
          <div id="analysis-summary-card" className="p-5 sm:p-6 rounded-xl border border-border bg-surface-card shadow-card mb-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    AST Architecture & Blast Radius Model Ready
                  </h2>
                </div>
                <p className="text-xs text-muted font-mono">
                  Project: <strong className="text-foreground">{analysisResult.projectName}</strong> ({analysisResult.projectPath})
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised border border-border text-xs font-semibold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Deterministic Model</span>
              </div>
            </div>

            {/* Metrics KPI Strip - Seamless Hairline Dividers (No Boxes) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border py-3 mb-5">
              <div className="py-2 sm:py-0 px-4 text-center">
                <div className="text-2xl font-bold text-foreground font-mono">
                  {analysisResult.scannedFilesCount || 0}
                </div>
                <div className="text-[11px] font-medium text-muted mt-0.5 flex items-center justify-center gap-1">
                  <FileCode className="h-3 w-3 text-brand" />
                  <span>Scanned Files</span>
                </div>
              </div>

              <div className="py-2 sm:py-0 px-4 text-center">
                <div className="text-2xl font-bold text-foreground font-mono">
                  {analysisResult.schema?.tables?.length || 0}
                </div>
                <div className="text-[11px] font-medium text-muted mt-0.5 flex items-center justify-center gap-1">
                  <Database className="h-3 w-3 text-violet-500" />
                  <span>Database Tables</span>
                </div>
              </div>

              <div className="py-2 sm:py-0 px-4 text-center">
                <div className="text-2xl font-bold text-foreground font-mono">
                  {analysisResult.code?.endpoints?.length || 0}
                </div>
                <div className="text-[11px] font-medium text-muted mt-0.5 flex items-center justify-center gap-1">
                  <Cpu className="h-3 w-3 text-rose-500" />
                  <span>API Endpoints</span>
                </div>
              </div>

              <div className="py-2 sm:py-0 px-4 text-center">
                <div className="text-2xl font-bold text-foreground font-mono">
                  {analysisResult.graph?.stats?.totalNodes || 0}
                </div>
                <div className="text-[11px] font-medium text-muted mt-0.5 flex items-center justify-center gap-1">
                  <Layers className="h-3 w-3 text-emerald-500" />
                  <span>Graph Connections</span>
                </div>
              </div>
            </div>

            {/* Launch Console CTA Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={() => handleOpenLens('DEVELOPER')}
                  className="btn-primary w-full sm:flex-1 py-3 text-xs font-bold justify-center group shadow-md bg-brand hover:bg-brand-hover text-white transition-all cursor-pointer ring-2 ring-brand/20"
                >
                  <span>Show Lens (Launch Studio Console)</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                </button>

                {!isLocalApp && (
                  <button
                    onClick={() => {
                      setDownloadModalReason('DEFAULT');
                      setIsDownloadModalOpen(true);
                    }}
                    className="btn-secondary w-full sm:w-auto py-3 text-xs justify-center font-semibold"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    <span>Download .EXE App</span>
                  </button>
                )}
              </div>

              {/* Direct Deep-Link Shortcuts */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <span className="text-[11px] font-semibold text-muted">Jump to:</span>
                <button
                  onClick={() => handleOpenLens('SIMULATOR')}
                  className="px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-xs font-medium text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="h-3 w-3 text-rose-500" />
                  <span>Blast Radius Simulator</span>
                </button>
                <button
                  onClick={() => handleOpenLens('DEVELOPER', 'erd')}
                  className="px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-xs font-medium text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Database className="h-3 w-3 text-blue-500" />
                  <span>Interactive ERD & Schemas</span>
                </button>
                <button
                  onClick={() => handleOpenLens('MANAGER', 'hld')}
                  className="px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-xs font-medium text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Layers className="h-3 w-3 text-violet-500" />
                  <span>Engineering Manager HLD</span>
                </button>
                <button
                  onClick={() => handleOpenLens('DEVELOPER', 'lld')}
                  className="px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-xs font-medium text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Cpu className="h-3 w-3 text-emerald-500" />
                  <span>Developer Call Graph (LLD)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Local Scans History - Frameless Clean List Table */}
        {localHistory.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Recent Scans ({isLocalApp ? 'Stored Locally' : 'Workspace History'})
                </h3>
              </div>
              <span className="text-[11px] text-muted font-mono">
                {localHistory.length} saved
              </span>
            </div>

            <div className="divide-y divide-border border-b border-border">
              {localHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleScanPath(item.projectPath)}
                  className="py-2.5 px-3 hover:bg-surface-raised/60 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">
                        {item.projectName || 'Project'}
                      </span>
                      <span className="text-[10px] font-mono text-muted truncate max-w-xs sm:max-w-md">
                        {item.projectPath}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-[11px] text-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <Database className="h-3 w-3 text-violet-500" />
                      <span>{item.tablesCount} tables</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Cpu className="h-3 w-3 text-rose-500" />
                      <span>{item.endpointsCount} APIs</span>
                    </span>
                    <span className="text-brand font-medium text-xs group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                      Open <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Highlights - Open Editorial Layout (No Box Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 border-t border-border">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-brand">
              <Database className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Deterministic Schemas & ERD
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Extracts tables, primary/foreign keys, and relationships directly from SQL DDL, Prisma, Django, and ORM declarations with zero runtime telemetry required.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-violet-500">
              <Layers className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Multi-Perspective Role Consoles
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Tailored lenses for Developers (AST & LLD), Engineering Managers (coupling & debt), and Business Owners (capabilities & customer journeys).
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-rose-500">
              <Cpu className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Blast Radius Simulator
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Simulate column drops, schema alterations, and route mutations to calculate dependency impact and downstream risks before deploying changes.
            </p>
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
