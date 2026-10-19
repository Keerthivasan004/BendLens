'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import UpdateIndicator from '@/components/UpdateIndicator';
import DownloadModal from '@/components/DownloadModal';
import ThemeToggle from '@/components/ThemeToggle';
import useIsDesktop from '@/lib/useIsDesktop';
import {
  FolderSearch, Play, Sparkles, Database, FileCode, Cpu, Layers,
  CheckCircle2, ArrowRight, ShieldCheck, HardDrive, Terminal,
  UploadCloud, GitBranch, Globe, Laptop, Lock, AlertTriangle, AlertCircle, Download, Zap, RefreshCw,
  Clock, Timer, X, Cloud, Search, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Code2, Server, Network, Workflow
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Ingestion Mode: 'PATH' | 'UPLOAD' | 'PASTE' | 'GIT'
  const [ingestMode, setIngestMode] = useState('PATH');

  // Mode States
  const [folderPath, setFolderPath] = useState('');
  const [gitUrl, setGitUrl] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [crawlDepthMode, setCrawlDepthMode] = useState('deep'); // 'deep' | 'normal'
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
  const [scanElapsedTime, setScanElapsedTime] = useState(0);
  const [scanFinalDuration, setScanFinalDuration] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [landingEndpointSearch, setLandingEndpointSearch] = useState('');
  const [landingMethodFilter, setLandingMethodFilter] = useState('ALL');
  const [landingEndpointsLimit, setLandingEndpointsLimit] = useState(8);
  const [landingCopiedPath, setLandingCopiedPath] = useState(null);

  const landingEndpointsList = useMemo(() => {
    if (Array.isArray(analysisResult?.code?.endpoints) && analysisResult.code.endpoints.length > 0) {
      return analysisResult.code.endpoints;
    }
    if (Array.isArray(analysisResult?.endpoints) && analysisResult.endpoints.length > 0) {
      return analysisResult.endpoints;
    }
    if (analysisResult?.openApiSpec?.paths) {
      const derived = [];
      Object.entries(analysisResult.openApiSpec.paths).forEach(([routePath, methodsObj]) => {
        if (!methodsObj || typeof methodsObj !== 'object') return;
        ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].forEach((m) => {
          if (methodsObj[m]) {
            const op = methodsObj[m];
            derived.push({
              path: routePath,
              method: m.toUpperCase(),
              summary: op.summary || op.description || '',
              module: op['x-bundle-source'] || '',
              isLazyLoaded: op['x-lazy-loaded'] === true,
              crawlTier: op['x-crawl-tier'] || 'normal'
            });
          }
        });
      });
      return derived;
    }
    return [];
  }, [analysisResult]);
  const landingMethodCounts = useMemo(() => {
    const counts = { ALL: landingEndpointsList.length, GET: 0, POST: 0, PUT: 0, DELETE: 0 };
    landingEndpointsList.forEach((e) => {
      const m = String(e.method || 'GET').toUpperCase();
      if (counts[m] !== undefined) counts[m]++;
    });
    return counts;
  }, [landingEndpointsList]);

  const landingFilteredEndpoints = useMemo(() => {
    return landingEndpointsList.filter((ep) => {
      if (landingMethodFilter !== 'ALL' && ep.method !== landingMethodFilter) return false;
      const q = landingEndpointSearch.trim().toLowerCase();
      if (q && !ep.path?.toLowerCase().includes(q) && !(ep.module || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [landingEndpointsList, landingMethodFilter, landingEndpointSearch]);

  const handleLandingCopyPath = (path) => {
    navigator.clipboard.writeText(path);
    setLandingCopiedPath(path);
    setTimeout(() => setLandingCopiedPath(null), 2000);
  };
  const [localHistory, setLocalHistory] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadModalReason, setDownloadModalReason] = useState('DEFAULT');
  const [isLocalApp, setIsLocalApp] = useState(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname || '';
      return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]' || h.endsWith('.local') || h.startsWith('192.168.') || h.startsWith('10.');
    }
    return true;
  });
  // Downloaded (Electron) users already have the app: hide all
  // "Download Desktop App" buttons for them.
  const isDesktop = useIsDesktop();

  // Hero rotating outcome phrases (display only — no logic impact)
  const HERO_PHRASES = [
    'seen clearly before you change it.',
    'mapped fully before you ship it.',
    'de-risked before you migrate.',
    'understood before it breaks.',
  ];
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % HERO_PHRASES.length), 3200);
    return () => clearInterval(t);
  }, []);

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
      const h = window.location.hostname || '';
      const isLocal = h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '[::1]' || h.endsWith('.local') || h.startsWith('192.168.') || h.startsWith('10.');
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

  const formatTimer = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
  };

  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setScanStep(0);
    setScanProgress(0);
    setErrorMessage('Analysis was cancelled.');
  };

  const executeScanWithStages = async (fetchFn, onComplete) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsScanning(true);
    setErrorMessage('');
    setScanStep(1);
    setScanProgress(25);
    setScanElapsedTime(0);
    setScanFinalDuration('');

    const startTime = performance.now();
    const timerInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      setScanElapsedTime(elapsed);
    }, 50);

    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep <= 4) {
        setScanStep(currentStep);
        setScanProgress(currentStep === 2 ? 50 : currentStep === 3 ? 75 : 95);
      }
    }, 120);

    try {
      const res = typeof fetchFn === 'function' ? await fetchFn(controller.signal) : await fetchFn;
      const result = await res.json();
      clearInterval(interval);
      clearInterval(timerInterval);

      const finalElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setScanElapsedTime(parseFloat(finalElapsed));
      setScanFinalDuration(finalElapsed);

      if (result.success) {
        setScanStep(5);
        setScanProgress(100);
        try {
          if (result.data) {
            sessionStorage.setItem('bendlens-current-data', JSON.stringify(result.data));
            if (result.data.projectPath) {
              localStorage.setItem('bendlens-path', result.data.projectPath);
            }
          }
        } catch {}
        onComplete(result.data);
      } else {
        setErrorMessage(result.error || 'Analysis failed.');
      }
    } catch (err) {
      clearInterval(interval);
      clearInterval(timerInterval);
      if (err.name === 'AbortError') {
        setErrorMessage('Analysis was cancelled by user.');
      } else {
        setErrorMessage(err.message || 'Error executing architecture analysis');
      }
    } finally {
      clearInterval(interval);
      clearInterval(timerInterval);
      abortControllerRef.current = null;
      setIsScanning(false);
      setScanStep(0);
      setScanProgress(0);
    }
  };

  // 1. Analyze by Local Folder Path (with Auto-URL Detection)
  const handleScanPath = async (overridePath) => {
    const target = overridePath || folderPath;

    // Seamless URL Auto-Detection: if the user entered any HTTP/HTTPS URL or domain URL, route to universal URL ingestion
    const trimmedTarget = (target || '').trim();
    const isDomainUrl = /^(?:api\.|github\.com|gitlab\.com|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/|$))/i.test(trimmedTarget);
    if (trimmedTarget && (trimmedTarget.startsWith('http://') || trimmedTarget.startsWith('https://') || isDomainUrl)) {
      const normalizedRepoUrl = (trimmedTarget.startsWith('http://') || trimmedTarget.startsWith('https://')) ? trimmedTarget : 'https://' + trimmedTarget;
      await executeScanWithStages((signal) => fetch('/api/git-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: normalizedRepoUrl,
          token: gitToken.trim(),
          crawlDepth: crawlDepthMode
        }),
        signal
      }), (data) => {
        setAnalysisResult(data);
        fetchLocalHistory();
        const initialTab = (data?.isUrlCrawl || data?.schema?.tables?.length === 0) ? 'sequence' : null;
        handleOpenLens('DEVELOPER', initialTab);
      });
      return;
    }

    if (!isLocalApp && !isDesktop && target && (target.includes(':/') || target.includes(':\\') || target.startsWith('/Users/') || target.startsWith('/home/') || target.startsWith('C:') || target.startsWith('D:') || target.startsWith('E:') || target.startsWith('F:'))) {
      setErrorMessage('Browser Security Notice: Web browsers cannot access host disk paths directly. Download the BendLens Desktop App for direct folder scans, or use ZIP Upload, Paste Schema, or Git Clone.');
      setDownloadModalReason('DEFAULT');
      setIsDownloadModalOpen(true);
      return;
    }

    await executeScanWithStages((signal) => fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: target, crawlDepth: crawlDepthMode }),
      signal
    }), (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
      handleOpenLens('DEVELOPER');
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

    await executeScanWithStages((signal) => fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal
    }), (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
      handleOpenLens('DEVELOPER');
    });
  };

  // 3. Analyze by Pasted Code / Schema
  const handleScanPaste = async () => {
    if (!pastedCode.trim()) {
      setErrorMessage('Please paste SQL DDL, Prisma schema, or ORM models.');
      return;
    }

    await executeScanWithStages((signal) => fetch('/api/paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: pastedCode,
        fileType: pastedCode.includes('model ') ? 'schema.prisma' : 'schema.sql',
        projectName: 'Custom Schema Ingestion'
      }),
      signal
    }), (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
      handleOpenLens('DEVELOPER');
    });
  };

  // 4. Analyze by Git / GitHub Clone or API Endpoint URL
  const handleScanGit = async () => {
    if (!gitUrl.trim()) {
      setErrorMessage('Please enter a valid API URL, Swagger/OpenAPI spec, or Git repository URL.');
      return;
    }

    await executeScanWithStages((signal) => fetch('/api/git-clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        repoUrl: gitUrl.trim(),
        token: gitToken.trim(),
        crawlDepth: crawlDepthMode
      }),
      signal
    }), (data) => {
      setAnalysisResult(data);
      fetchLocalHistory();
      const initialTab = (data?.isUrlCrawl || data?.schema?.tables?.length === 0) ? 'sequence' : null;
      handleOpenLens('DEVELOPER', initialTab);
    });
  };

  // Load Built-in Mock Architecture
  const handleLoadSample = async () => {
    const fetchPromise = fetch('/api/sample');
    await executeScanWithStages(fetchPromise, (data) => {
      setAnalysisResult(data);
      handleOpenLens('DEVELOPER');
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
    <main className="relative min-h-screen bg-background text-foreground flex flex-col transition-colors selection:bg-brand/20 selection:text-foreground">
      {/* Decorative split sprinkle: right on first half, left on second half (landing only, visual only) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="sprinkle-top" />
        <div className="sprinkle-bottom" />
      </div>
      {/* Top Navigation Bar */}
      <nav className="w-full border-b border-border chrome-bar sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-2.5">
            <UpdateIndicator />

            {isLocalApp && (
              <div className="hidden lg:inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Desktop · Local & Private</span>
              </div>
            )}

            {!isDesktop && !isLocalApp && (
              <button
                onClick={() => {
                  setDownloadModalReason('DEFAULT');
                  setIsDownloadModalOpen(true);
                }}
                className="btn-primary text-xs py-2 px-3.5"
                title="Download the BendLens Desktop App (.exe)"
              >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download Desktop App</span>
              <span className="md:hidden">Download</span>
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
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-14 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-10 animate-rise">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
            <div className="inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-surface border border-border text-[11px] font-semibold text-foreground shadow-subtle">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                New
              </span>
              <span>Deterministic AST Graph & Blast-Radius Engine</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Air-Gapped · Offline · Private</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-[-0.03em] text-foreground mb-4 leading-[1.08]">
            Backend architecture,
            <br />
            <span
              key={heroIndex}
              aria-live="polite"
              className="hero-word bg-gradient-to-r from-[#4c71f7] via-[#7c6cf8] to-[#22d3ee] bg-clip-text text-transparent pb-1"
            >
              {HERO_PHRASES[heroIndex]}
            </span>
          </h1>

          <p className="text-sm sm:text-[1.02rem] text-muted max-w-2xl mx-auto leading-relaxed">
            Extract relational schemas, HLD & LLD diagrams, and simulate modification ripple effects — one studio for Developers, Managers, and Business Owners.
          </p>

          {/* Trust strip */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-muted">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-500" /> Zero cloud leakage</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> In-memory parsing</span>
            <span className="inline-flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-brand" /> 6 SQL dialects · 10 ORMs</span>
            <span className="inline-flex items-center gap-1.5"><Laptop className="h-3.5 w-3.5 text-violet-500" /> Web + Windows desktop</span>
          </div>
        </div>

        {/* Multi-Modal Ingestion Shell */}
        <div className="ingestion-shell p-5 sm:p-7 mb-8 animate-rise stagger-1 shadow-card">
          {/* Shell header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="section-label mb-1">Ingest codebase</div>
              <div className="text-sm font-bold text-foreground tracking-tight">Choose how BendLens reads your backend</div>
            </div>
            {/* Segmented Mode Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-raised border border-border-subtle shadow-subtle flex-wrap">
            <button
              onClick={() => setIngestMode('PATH')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'PATH'
                  ? 'bg-surface text-foreground shadow-card border border-border'
                  : 'text-muted hover:text-foreground border border-transparent'
              }`}
            >
              <FolderSearch className="h-3.5 w-3.5" />
              <span>Local Path</span>
            </button>

            <button
              onClick={() => setIngestMode('UPLOAD')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'UPLOAD'
                  ? 'bg-surface text-foreground shadow-card border border-border'
                  : 'text-muted hover:text-foreground border border-transparent'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>ZIP / Files</span>
            </button>

            <button
              onClick={() => setIngestMode('PASTE')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'PASTE'
                  ? 'bg-surface text-foreground shadow-card border border-border'
                  : 'text-muted hover:text-foreground border border-transparent'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Paste Schema</span>
            </button>

            <button
              onClick={() => setIngestMode('GIT')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ingestMode === 'GIT'
                  ? 'bg-surface text-foreground shadow-card border border-border'
                  : 'text-muted hover:text-foreground border border-transparent'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-brand" />
              <span>Web & API Crawler / Git</span>
            </button>
            </div>
          </div>

          {/* MODE 1: Local Folder Path */}
          {ingestMode === 'PATH' && (
            <div>
              {!isLocalApp && !isDesktop && (
                <div className="mb-4 rounded-xl border border-brand/30 bg-gradient-to-b from-brand/[0.07] to-transparent p-4 sm:p-5 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl btn-primary flex items-center justify-center shrink-0 shadow-card">
                      <Download className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-foreground tracking-tight">
                          Desktop App required for local folder scans
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/25 uppercase tracking-wider">
                          Web limitation
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        Browsers cannot read folders on your machine — e.g.{' '}
                        <code className="font-mono text-foreground font-semibold">C:\Users\you\Desktop\my-backend</code>.
                        Download the free BendLens Desktop App to scan any local folder directly. Your code never leaves your computer.
                      </p>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {[
                          { n: '1', t: 'Download the .exe' },
                          { n: '2', t: 'Run it — no install' },
                          { n: '3', t: 'Scan Desktop folders' },
                        ].map((s) => (
                          <div key={s.n} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-surface border border-border-subtle">
                            <span className="h-5 w-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {s.n}
                            </span>
                            <span className="font-semibold text-foreground">{s.t}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => { setDownloadModalReason('DEFAULT'); setIsDownloadModalOpen(true); }}
                          className="btn-primary text-xs py-2 px-4"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download Desktop App (.exe)</span>
                        </button>
                        <button
                          onClick={() => setIngestMode('UPLOAD')}
                          className="btn-secondary text-xs py-2 px-3"
                        >
                          Upload .ZIP instead
                        </button>
                        <button
                          onClick={() => setIngestMode('PASTE')}
                          className="btn-secondary text-xs py-2 px-3"
                        >
                          Paste SQL / Schema
                        </button>
                        <button
                          onClick={() => setIngestMode('GIT')}
                          className="btn-secondary text-xs py-2 px-3 text-brand border-brand/30"
                        >
                          <Globe className="h-3 w-3 mr-1 inline" />
                          Git / OpenAPI URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label className="field-label">
                Codebase Path or Remote URL
              </label>
              <p className="field-hint" style={{ marginTop: '-0.1rem', marginBottom: '0.6rem' }}>
                Local path (Desktop App) or Git / OpenAPI URL (works everywhere: GitHub, GitLab, OpenAPI specs).
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-3">
                <div className="relative flex-1 w-full">
                  {(folderPath || '').startsWith('http') ? (
                    <Globe className="h-4 w-4 absolute left-3 top-2.5 text-brand pointer-events-none" />
                  ) : (
                    <FolderSearch className="h-4 w-4 absolute left-3 top-2.5 text-muted pointer-events-none" />
                  )}
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => {
                      const clean = cleanInputPath(e.target.value);
                      setFolderPath(clean);
                      if (clean.startsWith('http://') || clean.startsWith('https://')) {
                        setGitUrl(clean);
                        setIngestMode('GIT');
                      }
                    }}
                    placeholder="e.g., C:/Projects/repo or https://github.com/owner/repo or https://api.com/openapi.json"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted transition-colors"
                  />
                </div>
                <button
                  onClick={() => handleScanPath()}
                  disabled={isScanning || !folderPath.trim()}
                  title={!folderPath.trim() ? 'Enter a folder path above to enable analysis' : 'Analyze the provided folder path'}
                  className={`w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    analysisResult
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-card ring-1 ring-emerald-500/50'
                      : 'btn-primary shadow-card'
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
                      <span>Analyze Input</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: Drag & Drop ZIP Upload */}
          {ingestMode === 'UPLOAD' && (
            <div>
              <label className="field-label">
                Upload Project .ZIP Archive or Schema Files
              </label>
              <p className="field-hint" style={{ marginTop: '-0.1rem', marginBottom: '0.6rem' }}>
                Parsed in memory on this machine — archives are never uploaded to any cloud.
              </p>
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
                    : 'border-border hover:border-brand bg-surface-subtle'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".zip,.sql,.prisma,.py,.ts,.js,.json"
                  className="hidden"
                />
                <div className={`h-11 w-11 rounded-xl mx-auto mb-3 flex items-center justify-center border transition-colors ${isDragging ? 'bg-brand text-white border-brand shadow-glow' : 'bg-surface-raised text-muted border-border'}`}>
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="text-[13px] font-bold text-foreground tracking-tight">
                  {selectedFile ? selectedFile.name : isDragging ? 'Drop archive file here' : 'Click to browse or drop files here'}
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Repository ZIPs, .sql DDL, Prisma schemas, Python models
                </p>
                <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                  {['.zip', '.sql', '.prisma', '.py', '.ts', '.js', '.json'].map((ext) => (
                    <span key={ext} className="px-1.5 py-0.5 rounded-md bg-surface-raised border border-border text-[10px] font-mono font-medium text-muted">
                      {ext}
                    </span>
                  ))}
                </div>
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
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-border-subtle text-center text-xs my-2 font-mono">
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
                    className="btn-primary w-full py-2.5 px-3 text-xs font-bold rounded-lg justify-center shadow-xs mt-1"
                  >
                    <span>Open Lens Studio Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleScanUpload}
                disabled={isScanning || !selectedFile}
                className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-xs ${
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
                <label className="field-label" style={{ marginBottom: 0 }}>
                  Paste SQL DDL / Prisma Schema / ORM Definition
                </label>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="section-label">Samples</span>
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

              <div className="rounded-xl border border-border overflow-hidden mb-3 bg-surface shadow-subtle transition-all focus-within:border-brand focus-within:shadow-glow">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle bg-surface-subtle">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-foreground">
                    <FileCode className="h-3.5 w-3.5 text-brand" />
                    {pastedCode.includes('model ') ? 'schema.prisma' : 'schema.sql'}
                  </span>
                  <span className="text-[10px] font-mono text-muted tabular-nums">
                    {pastedCode.split('\n').length} lines · {(pastedCode.length / 1024).toFixed(1)} KB
                  </span>
                </div>
                <textarea
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  rows={8}
                  placeholder="Paste CREATE TABLE ... or model User { ... }"
                  spellCheck={false}
                  className="w-full p-3.5 text-xs bg-transparent border-0 rounded-none text-foreground font-mono placeholder:text-muted resize-y focus:ring-0"
                />
              </div>

              <button
                onClick={handleScanPaste}
                disabled={isScanning || !pastedCode.trim()}
                className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-xs ${
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

          {/* MODE 4: Universal Web & API Crawler / Git Repository */}
          {ingestMode === 'GIT' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="field-label mb-0">
                  Universal Web & API Crawler (Any Website URL, Web App, Live API, or Git Repo)
                </label>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Zero-Error Multi-Chunk Crawler
                </span>
              </div>
              <p className="field-hint" style={{ marginTop: '-0.1rem', marginBottom: '0.6rem' }}>
                Enter ANY live web application URL (Vite, React, Next.js, Nuxt), public website, REST API endpoint, Swagger/OpenAPI spec, or Git repository. The high-level crawler reverse-engineers all endpoints and schemas automatically without errors.
              </p>

              {/* Quick Preset Buttons for Instant URL Crawling */}
              <div className="flex items-center gap-1.5 mb-2.5 flex-wrap text-[11px]">
                <span className="text-muted font-medium text-[10px] uppercase tracking-wider">Try Demo:</span>
                <button
                  type="button"
                  onClick={() => setGitUrl('https://fts2trial.bcbuzz.tech')}
                  className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-mono text-foreground cursor-pointer transition-colors"
                >
                  ⚡ SaaS App (Vite/React)
                </button>
                <button
                  type="button"
                  onClick={() => setGitUrl('https://dummyjson.com/products')}
                  className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-mono text-foreground cursor-pointer transition-colors"
                >
                  🌐 REST API
                </button>
                <button
                  type="button"
                  onClick={() => setGitUrl('https://petstore.swagger.io')}
                  className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-mono text-foreground cursor-pointer transition-colors"
                >
                  📑 Swagger UI
                </button>
                <button
                  type="button"
                  onClick={() => setGitUrl('https://stripe.com')}
                  className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-mono text-foreground cursor-pointer transition-colors"
                >
                  🚀 Any Website
                </button>
                <button
                  type="button"
                  onClick={() => setGitUrl('https://github.com/Keerthivasan004/BendLens')}
                  className="px-2 py-0.5 rounded-md bg-surface-raised hover:bg-surface-subtle border border-border text-[11px] font-mono text-foreground cursor-pointer transition-colors"
                >
                  📦 GitHub Repo
                </button>
              </div>

              {/* Crawl Depth Mode Selector: Deep Crawl vs Normal Crawl */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 mb-2.5 rounded-lg bg-surface border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-brand" />
                    <span>Crawl Depth:</span>
                  </span>
                  <span className="text-[10px] text-muted hidden md:inline">
                    {crawlDepthMode === 'deep' 
                      ? 'Exhaustive scan of all 300+ code-split bundles including lazy-loaded Admin & Role modules' 
                      : 'Standard scan of primary public bundles and top-level routes'}
                  </span>
                </div>
                <div className="flex items-center p-0.5 bg-surface-raised rounded-md border border-border text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setCrawlDepthMode('deep')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                      crawlDepthMode === 'deep'
                        ? 'bg-brand text-white shadow-xs font-bold'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Deep Crawl (Recommended)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrawlDepthMode('normal')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                      crawlDepthMode === 'normal'
                        ? 'bg-surface-card text-foreground shadow-xs font-bold border border-border'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <span>Normal Crawl (Fast)</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-2.5">
                <div className="relative flex-1 w-full">
                  <Globe className="h-4 w-4 absolute left-3 top-2.5 text-brand pointer-events-none" />
                  <input
                    type="text"
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="e.g., https://fts2trial.bcbuzz.tech or https://stripe.com or https://dummyjson.com/products"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted transition-colors"
                  />
                </div>
                <button
                  onClick={handleScanGit}
                  disabled={isScanning}
                  className={`w-full sm:w-auto px-5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                    analysisResult
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-500/50'
                      : 'btn-primary'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" />
                      <span>Crawling Architecture & Endpoints...</span>
                    </>
                  ) : analysisResult ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-white" />
                      <span>Crawl Complete (Recrawl)</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current mr-2" />
                      <span>Crawl & Synthesize Architecture</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="GitHub Personal Access Token (Optional - Required for Private Repos)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-surface border border-border focus:border-brand outline-none text-foreground font-mono placeholder:text-muted"
                />
              </div>

              {/* Direct Result Confirmation & Console Launch Banner */}
              {analysisResult && (
                <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-foreground animate-fadeIn mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground">
                        {analysisResult.crawlerTelemetry ? 'Target URL Crawled & Reverse-Engineered!' : 'Repository Cloned & Analyzed!'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                      {analysisResult.projectName}
                    </span>
                  </div>

                  {analysisResult.crawlerTelemetry ? (
                    <div className="space-y-2.5 my-2.5">
                      {/* Dual-Depth Crawl Breakdown Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                        {/* 1. Normal Crawl Card */}
                        <div className="p-2.5 rounded-lg bg-surface border border-cyan-500/30 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Normal Crawl</span>
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                              Standard
                            </span>
                          </div>
                          <div className="text-xl font-bold font-mono text-cyan-400">
                            {analysisResult.crawlerTelemetry.normalCrawlCount ?? analysisResult.code?.endpoints?.filter(e => !e.isLazyLoaded).length ?? 0}
                            <span className="text-xs font-sans font-normal text-muted ml-1">APIs</span>
                          </div>
                          <div className="text-[10px] text-muted font-sans mt-0.5">
                            Entry Bundles ({analysisResult.crawlerTelemetry.normalChunksCount || analysisResult.crawlerTelemetry.crawlDepth?.normal?.chunksCount || 1} chunk)
                          </div>
                        </div>

                        {/* 2. Lazy-Loaded Chunks Card */}
                        <div className="p-2.5 rounded-lg bg-surface border border-purple-500/30 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              <span>Lazy-Loaded</span>
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/20">
                              Code-Split
                            </span>
                          </div>
                          <div className="text-xl font-bold font-mono text-purple-400">
                            +{analysisResult.crawlerTelemetry.lazyLoadedEndpointsCount ?? 0}
                            <span className="text-xs font-sans font-normal text-muted ml-1">APIs</span>
                          </div>
                          <div className="text-[10px] text-muted font-sans mt-0.5">
                            Uncovered via Dynamic Chunks
                          </div>
                        </div>

                        {/* 3. Deep Crawl Total Card */}
                        <div className="p-2.5 rounded-lg bg-surface border border-emerald-500/30 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              <span>Deep Crawl</span>
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              Total
                            </span>
                          </div>
                          <div className="text-xl font-bold font-mono text-emerald-400">
                            {analysisResult.crawlerTelemetry.deepCrawlCount ?? analysisResult.code?.endpoints?.length ?? 0}
                            <span className="text-xs font-sans font-normal text-muted ml-1">APIs</span>
                          </div>
                          <div className="text-[10px] text-muted font-sans mt-0.5">
                            All {analysisResult.crawlerTelemetry.chunksCrawledCount || 1} Chunks & Routes
                          </div>
                        </div>
                      </div>

                      {/* Formula / Composition Bar */}
                      <div className="p-2 rounded-lg bg-surface border border-border text-[11px] font-mono flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-muted">Crawl Composition:</span>
                          <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold">
                            Normal: {analysisResult.crawlerTelemetry.normalCrawlCount ?? 0}
                          </span>
                          <span className="text-muted">+</span>
                          <span className="px-2 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-500/20 font-bold">
                            Lazy: {analysisResult.crawlerTelemetry.lazyLoadedEndpointsCount ?? 0}
                          </span>
                          <span className="text-muted">=</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 font-bold">
                            Deep: {analysisResult.crawlerTelemetry.deepCrawlCount ?? (analysisResult.code?.endpoints?.length || 0)} APIs
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted text-[10px]">
                          <span>Duration: <strong className="text-foreground">{((analysisResult.crawlerTelemetry.crawlDurationMs || 0) / 1000).toFixed(2)}s</strong></span>
                          <span>Chunks: <strong className="text-amber-400">{analysisResult.crawlerTelemetry.chunksCrawledCount || 1}</strong></span>
                        </div>
                      </div>

                      {/* Detailed Application Stack Profile Card */}
                      {(() => {
                        const ts = analysisResult.techStack || analysisResult.crawlerTelemetry?.techStack;
                        const cp = analysisResult.cloudProvider ||
                          analysisResult.techStack?.cloudProvider ||
                          analysisResult.crawlerTelemetry?.cloudProvider ||
                          analysisResult.crawlerTelemetry?.techStack?.cloudProvider;
                        if (!ts && !cp) return null;

                        return (
                          <div className="p-3.5 rounded-xl bg-surface border border-brand/30 space-y-3 text-xs text-left">
                            {/* Executive Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/25 flex items-center gap-1 font-mono">
                                  <Cpu className="h-3 w-3" />
                                  <span>Stack Profile</span>
                                </span>
                                <span className="font-bold text-foreground text-xs font-sans">
                                  {ts?.summary || 'Universal Web Architecture'}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                Air-Gapped Zero-Leakage
                              </span>
                            </div>

                            {/* 4 Architectural Pillars Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              {/* 1. Frontend */}
                              <div className="p-2.5 rounded-lg bg-surface-raised border border-border/80 space-y-1">
                                <span className="text-[9px] font-bold text-cyan-400 font-mono uppercase flex items-center gap-1">
                                  <Code2 className="h-3 w-3" />
                                  <span>Frontend Layer</span>
                                </span>
                                <div className="font-bold text-foreground truncate text-xs">
                                  {ts?.frontend?.framework || 'Modern Web UI'}
                                </div>
                                <div className="text-[10px] text-muted font-mono space-y-0.5 pt-0.5">
                                  <div className="truncate">Bundler: <strong className="text-foreground">{ts?.frontend?.bundler?.split(' ')[0] || 'Vite/ESBuild'}</strong></div>
                                  <div className="truncate">UI: <strong className="text-foreground">{ts?.frontend?.uiLibrary || 'Standard CSS'}</strong></div>
                                  <div className="truncate">Mode: <strong className="text-foreground">{ts?.frontend?.renderingMode?.split(' ')[0] || 'CSR (SPA)'}</strong></div>
                                </div>
                              </div>

                              {/* 2. Backend */}
                              <div className="p-2.5 rounded-lg bg-surface-raised border border-border/80 space-y-1">
                                <span className="text-[9px] font-bold text-purple-400 font-mono uppercase flex items-center gap-1">
                                  <Server className="h-3 w-3" />
                                  <span>Backend Runtime</span>
                                </span>
                                <div className="font-bold text-foreground truncate text-xs">
                                  {ts?.backend?.serverRuntime?.split('(')[0]?.trim() || 'Node.js'}
                                </div>
                                <div className="text-[10px] text-muted font-mono space-y-0.5 pt-0.5">
                                  <div className="truncate">Pattern: <strong className="text-foreground">{ts?.backend?.apiArchitecture?.split('·')[0]?.trim() || 'REST APIs'}</strong></div>
                                  <div className="truncate">Server: <strong className="text-foreground">{ts?.backend?.serverSoftware || 'HTTP Gateway'}</strong></div>
                                  <div className="truncate">Routes: <strong className="text-emerald-400">{landingEndpointsList.length} Endpoints</strong></div>
                                </div>
                              </div>

                              {/* 3. Cloud Provider & Hosting */}
                              <div className="p-2.5 rounded-lg bg-surface-raised border border-border/80 space-y-1">
                                <span className="text-[9px] font-bold text-sky-400 font-mono uppercase flex items-center gap-1">
                                  <Cloud className="h-3 w-3" />
                                  <span>Cloud & Hosting</span>
                                </span>
                                <div className="font-bold text-foreground truncate text-xs">
                                  {cp?.name || ts?.backend?.hostingCdn?.split('·')[0]?.trim() || 'Cloud Edge'}
                                </div>
                                <div className="text-[10px] text-muted font-mono space-y-0.5 pt-0.5">
                                  <div className="truncate">Category: <strong className="text-foreground">{cp?.category?.split('/')[0]?.trim() || 'Edge CDN'}</strong></div>
                                  {cp?.region && (
                                    <div className="truncate">Region: <strong className="text-emerald-400">{cp.region}</strong></div>
                                  )}
                                  <div className="truncate">Services: <strong className="text-foreground">{cp?.services?.[0] || 'DDoS Shield'}</strong></div>
                                </div>
                              </div>

                              {/* 4. Integrations & BaaS */}
                              <div className="p-2.5 rounded-lg bg-surface-raised border border-border/80 space-y-1">
                                <span className="text-[9px] font-bold text-amber-500 font-mono uppercase flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  <span>Integrations</span>
                                </span>
                                <div className="font-bold text-foreground truncate text-xs">
                                  {ts?.integrations?.length > 0 ? ts.integrations[0].name : 'Direct Gateway'}
                                </div>
                                <div className="pt-0.5 flex flex-wrap gap-1">
                                  {ts?.integrations?.length > 0 ? (
                                    ts.integrations.slice(0, 2).map((item, idx) => (
                                      <span key={idx} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-foreground">
                                        {item.name}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-muted font-mono">Self-Contained Backend</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Discovered Microservice Gateways if present */}
                            {ts?.backend?.discoveredGateways?.length > 0 && (
                              <div className="p-2 rounded-lg bg-surface-raised border border-border/60 flex items-center gap-2 flex-wrap text-[11px] font-mono">
                                <span className="text-cyan-400 font-bold flex items-center gap-1">
                                  <Network className="h-3 w-3" />
                                  <span>Gateways:</span>
                                </span>
                                {ts.backend.discoveredGateways.map((domain, gIdx) => (
                                  <span key={gIdx} className="px-1.5 py-0.5 rounded bg-surface border border-border text-foreground font-medium flex items-center gap-1">
                                    <ExternalLink className="h-2.5 w-2.5 text-brand" />
                                    <span>{domain}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Interactive Discovered API Endpoints Inventory Card */}
                      {landingEndpointsList.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-surface border border-border space-y-3 text-left">
                          {/* Header with counts */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 font-mono">
                                <Workflow className="h-3 w-3" />
                                <span>Discovered Endpoints</span>
                              </span>
                              <span className="font-bold text-foreground text-xs font-mono">
                                {landingFilteredEndpoints.length} of {landingEndpointsList.length} Routes
                              </span>
                            </div>

                            {/* Search Bar */}
                            <div className="relative w-full sm:w-48">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Filter routes..."
                                value={landingEndpointSearch}
                                onChange={(e) => setLandingEndpointSearch(e.target.value)}
                                className="w-full pl-7 pr-6 py-1 text-xs rounded-lg border border-border bg-surface-raised text-foreground placeholder:text-muted focus:outline-hidden focus:border-brand font-mono"
                              />
                              {landingEndpointSearch && (
                                <button
                                  onClick={() => setLandingEndpointSearch('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Method Filter Tabs */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => {
                              const count = landingMethodCounts[m] || 0;
                              const isActive = landingMethodFilter === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setLandingMethodFilter(m)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-all border flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                    isActive
                                      ? m === 'GET'
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                        : m === 'POST'
                                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                                        : m === 'PUT'
                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                                        : m === 'DELETE'
                                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                                        : 'bg-brand/15 border-brand/40 text-brand'
                                      : 'bg-surface hover:bg-surface-raised border-border text-muted hover:text-foreground'
                                  }`}
                                >
                                  <span>{m}</span>
                                  <span className="opacity-75">({count})</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Scrollable Endpoints List */}
                          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {landingFilteredEndpoints.slice(0, landingEndpointsLimit).map((ep, idx) => {
                              const methodColor = 
                                ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                                ep.method === 'POST' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                                ep.method === 'PUT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                                ep.method === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                                'bg-cyan-500/10 text-cyan-400 border-cyan-500/25';

                              return (
                                <div
                                  key={`${ep.method}-${ep.path}-${idx}`}
                                  className="p-2 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-border/70 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] border uppercase shrink-0 ${methodColor}`}>
                                      {ep.method}
                                    </span>
                                    <span className="font-mono text-xs font-semibold text-foreground truncate select-all" title={ep.path}>
                                      {ep.path}
                                    </span>
                                    {ep.isLazyLoaded && (
                                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                                        LAZY
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleLandingCopyPath(ep.path)}
                                    className="px-2 py-0.5 rounded bg-surface border border-border hover:bg-surface-raised text-[10px] font-mono text-muted hover:text-foreground shrink-0 flex items-center gap-1 cursor-pointer"
                                    title="Copy route path"
                                  >
                                    {landingCopiedPath === ep.path ? (
                                      <>
                                        <Check className="h-2.5 w-2.5 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-2.5 w-2.5" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}

                            {landingFilteredEndpoints.length === 0 && (
                              <div className="py-6 text-center text-xs text-muted font-mono bg-surface-raised/50 rounded-lg border border-dashed border-border">
                                No endpoints match "{landingEndpointSearch}"
                              </div>
                            )}
                          </div>

                          {/* Pagination & Toggle */}
                          {landingFilteredEndpoints.length > 8 && (
                            <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-muted">
                              <span>Showing {Math.min(landingEndpointsLimit, landingFilteredEndpoints.length)} of {landingFilteredEndpoints.length}</span>
                              {landingEndpointsLimit < landingFilteredEndpoints.length ? (
                                <button
                                  type="button"
                                  onClick={() => setLandingEndpointsLimit(landingFilteredEndpoints.length)}
                                  className="text-brand hover:underline font-bold cursor-pointer"
                                >
                                  View All {landingFilteredEndpoints.length} Endpoints
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setLandingEndpointsLimit(8)}
                                  className="text-muted hover:text-foreground cursor-pointer"
                                >
                                  Collapse to 8
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-border-subtle text-center text-xs my-2 font-mono">
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
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenLens('DEVELOPER')}
                    className="btn-primary w-full py-2.5 px-3 text-xs font-bold rounded-lg justify-center shadow-xs mt-1"
                  >
                    <span>Open Lens Studio Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
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

                {/* Percentage & Live Elapsed Timer Telemetry */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all ${
                      theme === 'dark'
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                    }`}
                    title="Elapsed analysis processing time"
                  >
                    <Clock className="h-3.5 w-3.5 animate-pulse text-emerald-400 dark:text-emerald-300" />
                    <span>{formatTimer(scanElapsedTime)}</span>
                  </span>

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

                  <button
                    type="button"
                    onClick={handleCancelScan}
                    className="text-xs font-mono px-2.5 py-1 rounded-full border border-rose-500/40 bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Cancel scanning process"
                  >
                    <X className="h-3.5 w-3.5 text-rose-400" />
                    <span>Cancel</span>
                  </button>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border-subtle">
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
                          ? 'bg-surface-raised border-border text-slate-400'
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
          <div id="analysis-summary-card" className="glass-panel p-5 sm:p-6 mb-8 animate-rise shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle mb-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-[0.95rem] font-bold text-foreground tracking-tight">
                    Architecture & Blast-Radius Model Ready
                  </h2>
                  <p className="text-xs text-muted font-mono mt-0.5">
                    <strong className="text-foreground">{analysisResult.projectName}</strong> · {analysisResult.projectPath}
                  </p>
                </div>
              </div>

              <div className="chip shrink-0">
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
                  className="btn-primary w-full sm:flex-1 py-3 text-xs font-bold justify-center group shadow-card"
                >
                  <span>Show Lens (Launch Studio Console)</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                </button>

                {!isLocalApp && !isDesktop && (
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
          <div className="mb-8 cv-auto">
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
                  className="py-2.5 px-3 rounded-lg hover:bg-surface-raised transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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

        {/* Why BendLens — open editorial, no cards */}
        <div className="pt-10 border-t border-border">
          <div className="max-w-2xl">
            <div className="section-label mb-2">Why BendLens</div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              One studio, three levels of clarity
            </h2>
            <p className="text-sm text-muted leading-relaxed mt-2">
              From raw DDL to boardroom summary — every view is computed locally from the same architecture model.
            </p>
          </div>

          {/* 01 — Deterministic Schemas & ERD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-14 py-10 mt-6 border-t border-border-subtle items-center cv-auto">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono font-bold text-muted tabular-nums">01</span>
                <span className="h-px w-10 bg-border" />
                <Database className="h-4 w-4 text-blue-500" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground mb-2">
                Deterministic Schemas & ERD
              </h3>
              <p className="text-sm text-muted leading-relaxed max-w-md">
                Tables, keys, and relationships extracted from SQL DDL, Prisma, Django, and ORM models — with zero runtime telemetry required.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] font-mono text-muted">
                <span>6 SQL dialects</span>
                <span>10+ ORMs</span>
                <span>0 telemetry</span>
              </div>
            </div>
            <div className="relative">
              <div aria-hidden className="absolute -inset-6 bg-[radial-gradient(closest-side,rgba(76,113,247,0.10),transparent)] pointer-events-none" />
              <svg viewBox="0 0 540 148" className="relative w-full h-auto" role="img" aria-label="Animated foreign-key topology preview">
                <defs>
                  <marker id="bl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8" fill="none" stroke="#4c71f7" strokeWidth="1.5" />
                  </marker>
                </defs>
                <line x1="152" y1="74" x2="196" y2="74" stroke="#4c71f7" strokeWidth="1.5" className="flow-line" markerEnd="url(#bl-arrow)" />
                <line x1="342" y1="74" x2="386" y2="74" stroke="#4c71f7" strokeWidth="1.5" className="flow-line" markerEnd="url(#bl-arrow)" />
                {[
                  { x: 12, name: 'users', meta: '12 cols · PK id' },
                  { x: 202, name: 'orders', meta: '9 cols · 1 FK' },
                  { x: 392, name: 'order_items', meta: '7 cols · 2 FK' },
                ].map((t) => (
                  <g key={t.name}>
                    <rect x={t.x} y={42} width={136} height={64} rx={10} fill="transparent" className="stroke-border" strokeWidth={1.2} />
                    <circle cx={t.x + 18} cy={62} r={4} fill="#4c71f7" />
                    <text x={t.x + 30} y={66} fontSize={12} fontWeight={700} className="fill-foreground font-mono">{t.name}</text>
                    <text x={t.x + 14} y={88} fontSize={10} className="fill-muted font-mono">{t.meta}</text>
                  </g>
                ))}
                <circle cx={202} cy={74} r={5} fill="#22d3ee" className="node-ping" />
              </svg>
              <p className="relative text-[11px] font-mono text-muted mt-1">
                Foreign-key topology rendered from your DDL — live preview
              </p>
            </div>
          </div>

          {/* 02 — Multi-perspective consoles */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-14 py-10 border-t border-border-subtle items-center cv-auto">
            <div className="lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono font-bold text-muted tabular-nums">02</span>
                <span className="h-px w-10 bg-border" />
                <Terminal className="h-4 w-4 text-violet-500" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground mb-2">
                Multi-Perspective Consoles
              </h3>
              <p className="text-sm text-muted leading-relaxed max-w-md">
                One analysis, three lenses — Developers get AST and call graphs, Managers get coupling and debt, Business gets journeys and risk in plain language.
              </p>
            </div>
            <div className="lg:order-1">
              <div className="divide-y divide-border-subtle border-y border-border-subtle">
                {[
                  { dot: 'bg-blue-500', name: 'Developer', meta: 'AST · ERD · LLD' },
                  { dot: 'bg-violet-500', name: 'Engineering Manager', meta: 'coupling · debt' },
                  { dot: 'bg-emerald-500', name: 'Business Owner', meta: 'journeys · SLA' },
                ].map((r) => (
                  <div key={r.name} className="group flex items-center gap-3 py-4 cursor-default">
                    <span className={`h-2 w-2 rounded-full ${r.dot} shrink-0`} />
                    <span className="text-sm font-bold text-foreground">{r.name}</span>
                    <span className="text-[11px] font-mono text-muted ml-auto">{r.meta}</span>
                    <ArrowRight className="h-4 w-4 text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 03 — Blast radius simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-14 py-10 border-t border-b border-border-subtle items-center cv-auto">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono font-bold text-muted tabular-nums">03</span>
                <span className="h-px w-10 bg-border" />
                <Zap className="h-4 w-4 text-rose-500" />
              </div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground mb-2">
                Blast Radius Simulator
              </h3>
              <p className="text-sm text-muted leading-relaxed max-w-md">
                Simulate column drops, renames, and type changes — downstream impact scored across tables, handlers, and teams before you deploy.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 soft-pulse" />
                  Live scoring
                </span>
                <span className="text-[11px] font-mono text-muted">sample schema</span>
              </div>
              <div className="text-5xl font-extrabold tracking-tight tabular-nums text-foreground">
                62–84<span className="text-2xl text-muted">%</span>
              </div>
              <div className="w-full max-w-sm h-1.5 rounded-full bg-surface-raised overflow-hidden mt-3">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 risk-cycle" />
              </div>
              <p className="text-[11px] font-mono text-muted mt-2">
                typical blast range across tables, APIs & squads
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise footer strip — professional, informative */}
      <footer className="border-t border-border bg-surface-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Brand column */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Logo size="sm" withText={false} />
                <span className="font-bold text-foreground text-sm">BendLens Studio</span>
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-xs">
                Local-first backend architecture intelligence — schema ERD, HLD, LLD diagrams, and blast-radius simulation for Developers, Managers, and Business Owners.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  Air-gapped
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  <Lock className="h-3.5 w-3.5 text-blue-500" />
                  No code leaves this machine
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                  <Cpu className="h-3.5 w-3.5 text-violet-500" />
                  Deterministic AST
                </span>
              </div>
            </div>

            {/* Product links column */}
            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Product</h4>
              <nav className="space-y-2 text-sm">
                <a href="/lens" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-brand group-hover:bg-brand/10 transition-colors">
                    <Layers className="h-3.5 w-3.5" />
                  </span>
                  <span>Architecture Studio</span>
                </a>
                <a href="#simulator" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-rose-500/40 group-hover:bg-rose-500/10 transition-colors">
                    <Zap className="h-3.5 w-3.5 text-rose-500" />
                  </span>
                  <span>Blast Radius Simulator</span>
                </a>
                <a href="#" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-blue-500/40 group-hover:bg-blue-500/10 transition-colors">
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                  </span>
                  <span>Interactive ERD</span>
                </a>
                <a href="#" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/10 transition-colors">
                    <FileCode className="h-3.5 w-3.5 text-emerald-500" />
                  </span>
                  <span>API & Call Graph</span>
                </a>
              </nav>
            </div>

            {/* Resources & platform column */}
            <div className="lg:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Platform</h4>
              <nav className="space-y-2 text-sm">
                <a href="#" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-brand group-hover:bg-brand/10 transition-colors">
                    <Laptop className="h-3.5 w-3.5" />
                  </span>
                  <span>Windows Desktop App (.exe)</span>
                </a>
                <a href="#" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-brand group-hover:bg-brand/10 transition-colors">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  <span>Web Studio (localhost:3000)</span>
                </a>
                <a href="#" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-brand group-hover:bg-brand/10 transition-colors">
                    <GitBranch className="h-3.5 w-3.5" />
                  </span>
                  <span>Git Clone & Analyze</span>
                </a>
                <a href="#" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group">
                  <span className="h-3.5 w-3.5 rounded-lg bg-surface-raised border border-border flex items-center justify-center group-hover:border-brand group-hover:bg-brand/10 transition-colors">
                    <UploadCloud className="h-3.5 w-3.5" />
                  </span>
                  <span>ZIP Upload & Paste Schema</span>
                </a>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-6 lg:mt-8 pt-4 lg:pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted">
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1.5"><Cpu className="h-3 w-3" /> v1.1.47</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Local-first</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" /> Private by default</span>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span>Built for backend engineers who value clarity over noise.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Download Desktop App Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        reason={downloadModalReason}
      />
    </main>
  );
}
