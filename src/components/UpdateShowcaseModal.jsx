'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RefreshCw, X, Sparkles, CheckCircle2, 
  Database, Zap, Layers, ShieldCheck, ArrowRight, 
  Terminal, Activity, Laptop, FileCode, Check
} from 'lucide-react';
import Logo from '@/components/Logo';

export default function UpdateShowcaseModal({
  isOpen,
  onClose,
  onApplyUpdate,
  isUpdating,
  updateStep,
  updateSuccess,
  updateInfo
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const SLIDE_DURATION = 6500; // 6.5s per scene

  const slides = updateInfo?.featureShowcase || [
    {
      id: 'db-parser',
      title: 'Universal Polyglot DB Parser & Spreadsheet Inspector',
      tag: 'Schema Ingestion',
      badge: 'New in v1.1.0',
      summary: 'Instant deterministic extraction across PostgreSQL, MySQL, SQLite, MongoDB, and Prisma with live spreadsheet row values inspection.',
      highlights: [
        'Full DDL AST parsing for relational, document, and ORM schemas',
        'Zero-truncation interactive spreadsheet data values grid',
        'Automated primary, foreign key, and index constraint mapping'
      ],
      stats: '6 Databases · Zero Latency'
    },
    {
      id: 'blast-radius',
      title: 'Deterministic Blast Radius & Ripple Simulator',
      tag: 'Risk Governance',
      badge: 'Core Engine',
      summary: 'Simulate structural schema mutations and trace cascading shockwaves across foreign key relations and downstream API contracts.',
      highlights: [
        'Real-time calculated blast impact percentage and risk scores',
        'Cascading relation shockwave propagation mapping',
        'Auto-generated developer breaking change mitigation checklists'
      ],
      stats: 'Multi-Hop Traversal · Real-Time Risk'
    },
    {
      id: 'c4-diagrams',
      title: 'Multi-Tier C4 HLD & LLD Architecture Flowcharts',
      tag: 'Visual Canvas',
      badge: 'Interactive Flow',
      summary: 'Pan and zoom through high-level container topologies and low-level AST symbol call graphs with vector SVG precision.',
      highlights: [
        'Dynamic switching across ERD, HLD, LLD, and Sequence diagrams',
        'Live animated request packets traversing service boundaries',
        'Instant 1-click Markdown and PDF architectural report exports'
      ],
      stats: 'Mermaid.js Engine · Infinite Canvas'
    },
    {
      id: 'desktop-studio',
      title: 'Air-Gapped Desktop Studio & Local Privacy Engine',
      tag: 'Privacy & Security',
      badge: '100% Offline',
      summary: 'Native Windows desktop packaging with zero cloud telemetry, instant launch, and automated official brand asset synchronization.',
      highlights: [
        '100% in-memory processing with zero external data leakage',
        'Automatic desktop shortcut and official brand icon sync',
        'Ultra-fast native launcher with background daemon management'
      ],
      stats: 'Air-Gapped · Localhost Only'
    }
  ];

  // Auto-advance slideshow timer
  useEffect(() => {
    if (!isOpen || !isPlaying || isUpdating) return;

    const interval = 50;
    const stepIncrement = (interval / SLIDE_DURATION) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveSlide((curr) => (curr + 1) % slides.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [isOpen, isPlaying, isUpdating, activeSlide, slides.length]);

  const selectSlide = (index) => {
    setActiveSlide(index);
    setProgress(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-[#090d16] border border-blue-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Modal Top Bar */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#0e1422] shrink-0">
          <div className="flex items-center gap-3">
            <Logo size="sm" withText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                  BendLens Studio Update
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-400 border border-blue-500/30 text-[10px] font-mono font-bold">
                  v{updateInfo?.latestVersion || '1.1.0'} Release
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Interactive Video Showcase & Architectural Release Notes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUpdating && !updateSuccess}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30"
            title="Close showcase"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {/* 16:9 Video-Like Simulation Canvas Frame */}
          <div className="relative rounded-2xl bg-[#050811] border border-blue-500/25 overflow-hidden shadow-2xl group">
            {/* Top Video Player Bar */}
            <div className="px-4 py-2.5 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-20 relative">
              {/* Segmented Timeline Progress Bars */}
              <div className="flex items-center gap-1.5 flex-1 max-w-md mr-3">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    onClick={() => selectSlide(idx)}
                    className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden cursor-pointer relative"
                    title={slide.title}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-75"
                      style={{
                        width:
                          idx < activeSlide
                            ? '100%'
                            : idx === activeSlide
                            ? `${progress}%`
                            : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Player Status & Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-sky-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span>DEMO {activeSlide + 1}/4</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-muted hover:text-foreground transition-colors cursor-pointer"
                  title={isPlaying ? 'Pause simulation' : 'Play simulation'}
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3 fill-current" />
                  )}
                </button>
              </div>
            </div>

            {/* Video Canvas Presentation Viewport */}
            <div className="relative h-64 sm:h-80 w-full flex items-center justify-center p-4 overflow-hidden bg-gradient-to-b from-[#060a14] via-[#090e1c] to-[#04070e]">
              {/* Animated Grid Background */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.25) 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              />

              {/* SCENE 1: Universal Polyglot DB Parser */}
              {activeSlide === 0 && (
                <div className="w-full max-w-xl space-y-3 z-10 animate-fadeIn">
                  <div className="p-3 rounded-xl bg-[#0b101c]/90 border border-blue-500/30 shadow-lg font-mono text-[11px] text-sky-300">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 text-[10px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="h-3 w-3 text-sky-400" />
                        <span>AST Polyglot Ingestion Engine</span>
                      </span>
                      <span className="text-emerald-400">6 Dialects Active</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted/80">{'>'} Parsing PostgreSQL, MySQL & MongoDB schemas...</p>
                      <p className="text-sky-400">{'>'} Synthesizing schema graph AST nodes: 18 tables, 42 relations</p>
                    </div>
                  </div>

                  {/* Dynamic Database Table Cards Simulation */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                    <div className="p-2.5 rounded-lg bg-[#111728] border border-blue-500/40 shadow-sm animate-pulse">
                      <div className="flex items-center justify-between font-bold text-sky-400 mb-1">
                        <span className="flex items-center gap-1"><Database className="h-2.5 w-2.5" /> users</span>
                        <span className="text-[9px] text-muted">PK</span>
                      </div>
                      <div className="text-muted space-y-0.5 text-[9px]">
                        <p>id: UUID [PK]</p>
                        <p>email: VARCHAR</p>
                        <p>role: ENUM</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#111728] border border-emerald-500/40 shadow-sm">
                      <div className="flex items-center justify-between font-bold text-emerald-400 mb-1">
                        <span className="flex items-center gap-1"><Database className="h-2.5 w-2.5" /> orders</span>
                        <span className="text-[9px] text-muted">FK</span>
                      </div>
                      <div className="text-muted space-y-0.5 text-[9px]">
                        <p>id: SERIAL [PK]</p>
                        <p>user_id: UUID [FK]</p>
                        <p>total: NUMERIC</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#111728] border border-indigo-500/40 shadow-sm hidden sm:block">
                      <div className="flex items-center justify-between font-bold text-indigo-400 mb-1">
                        <span className="flex items-center gap-1"><Database className="h-2.5 w-2.5" /> order_items</span>
                        <span className="text-[9px] text-muted">Junction</span>
                      </div>
                      <div className="text-muted space-y-0.5 text-[9px]">
                        <p>id: SERIAL [PK]</p>
                        <p>order_id: INT [FK]</p>
                        <p>quantity: INT</p>
                      </div>
                    </div>
                  </div>

                  {/* Spreadsheet Grid Mock */}
                  <div className="p-2 rounded-lg bg-[#0d1220] border border-white/10 text-[10px] font-mono">
                    <div className="flex items-center justify-between text-muted pb-1 border-b border-white/5 text-[9px]">
                      <span>SPREADSHEET VALUES INSPECTOR</span>
                      <span className="text-sky-400 font-bold">1,482 Live Rows</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-1 text-slate-300 text-[9px]">
                      <span>usr_9a4f21</span>
                      <span>alex@corp.io</span>
                      <span>ENTERPRISE</span>
                      <span className="text-emerald-400">ACTIVE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 2: Deterministic Blast Radius & Ripple Simulator */}
              {activeSlide === 1 && (
                <div className="w-full max-w-xl space-y-3.5 z-10 animate-fadeIn">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#16101d] border border-rose-500/40 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-rose-300 font-bold">SIMULATED MUTATION:</span>
                      <span className="text-foreground">orders.status (COLUMN_RENAME)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                      78% BLAST RISK
                    </span>
                  </div>

                  {/* Cascading Shockwave Propagation Animation */}
                  <div className="p-4 rounded-xl bg-[#0e1322] border border-white/10 relative overflow-hidden">
                    <div className="flex items-center justify-between gap-3 text-center relative z-10 text-[10px] font-mono">
                      <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/50 flex-1">
                        <span className="text-rose-400 block font-bold mb-0.5">Epicenter</span>
                        <span className="text-slate-300 text-[9px]">orders table</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-rose-400 shrink-0 animate-pulse" />
                      <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 flex-1">
                        <span className="text-amber-400 block font-bold mb-0.5">Cascade (2)</span>
                        <span className="text-slate-300 text-[9px]">order_items, bills</span>
                      </div>
                      <ArrowRight className="h-3 w-3 text-amber-400 shrink-0 animate-pulse" />
                      <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-500/50 flex-1">
                        <span className="text-sky-400 block font-bold mb-0.5">APIs (4 Broken)</span>
                        <span className="text-slate-300 text-[9px]">POST /checkout</span>
                      </div>
                    </div>

                    {/* Animated Ripple Line */}
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-muted">
                      <span>Multi-Hop Traversal: Depth 3</span>
                      <span className="text-rose-400 font-mono font-bold">Automated Mitigation Checklist Ready</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 3: Multi-Tier C4 HLD & LLD Interactive Flowcharts */}
              {activeSlide === 2 && (
                <div className="w-full max-w-xl space-y-3 z-10 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-white/10">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <Layers className="h-3.5 w-3.5" />
                      <span>C4 Architecture Diagram Visualizer</span>
                    </span>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-sky-300 border border-blue-500/30">ERD</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-muted">HLD</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-muted">LLD</span>
                    </div>
                  </div>

                  {/* Flowchart Diagram Topology Mockup */}
                  <div className="p-4 rounded-xl bg-[#0c1220] border border-blue-500/30 relative">
                    <div className="flex items-center justify-between gap-2 text-center text-[10px] font-mono">
                      <div className="p-2 rounded-lg bg-[#141d30] border border-blue-500/30 flex-1 shadow-sm">
                        <span className="text-sky-400 block font-bold">API Gateway</span>
                        <span className="text-[9px] text-muted">Port 8000</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="h-0.5 w-6 bg-gradient-to-r from-blue-500 to-emerald-500 animate-pulse" />
                        <span className="text-[8px] text-emerald-400">REST</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#141d30] border border-emerald-500/30 flex-1 shadow-sm">
                        <span className="text-emerald-400 block font-bold">Auth Service</span>
                        <span className="text-[9px] text-muted">JWT Auth</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="h-0.5 w-6 bg-gradient-to-r from-emerald-500 to-indigo-500 animate-pulse" />
                        <span className="text-[8px] text-indigo-400">SQL</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#141d30] border border-indigo-500/30 flex-1 shadow-sm">
                        <span className="text-indigo-400 block font-bold">PostgreSQL</span>
                        <span className="text-[9px] text-muted">Port 5432</span>
                      </div>
                    </div>

                    <div className="mt-3 text-center text-[10px] text-muted font-mono">
                      Vector Infinite Pan & Zoom · 1-Click SVG/PDF Export
                    </div>
                  </div>
                </div>
              )}

              {/* SCENE 4: Air-Gapped Desktop Studio & Local Privacy */}
              {activeSlide === 3 && (
                <div className="w-full max-w-xl space-y-3 z-10 animate-fadeIn">
                  <div className="flex items-center justify-center p-3">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                        <Logo size="lg" withText={false} />
                      </div>
                      <span className="text-sm font-extrabold text-foreground tracking-tight">
                        BendLens Air-Gapped Desktop Architecture
                      </span>
                      <p className="text-[11px] text-muted max-w-sm">
                        Zero network leakage, 100% in-memory processing, and automated Windows desktop icon synchronization.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                    <div className="p-2 rounded-lg bg-[#0e1424] border border-white/10">
                      <span className="text-emerald-400 font-bold block">0.00 KB</span>
                      <span className="text-muted text-[9px]">Cloud Telemetry</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0e1424] border border-white/10">
                      <span className="text-sky-400 font-bold block">&lt; 15ms</span>
                      <span className="text-muted text-[9px]">AST Parse Latency</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0e1424] border border-white/10">
                      <span className="text-indigo-400 font-bold block">1-Click</span>
                      <span className="text-muted text-[9px]">Desktop Shortcut</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slide Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {slides.map((slide, idx) => {
              const isCurrent = activeSlide === idx;
              return (
                <button
                  key={slide.id}
                  onClick={() => selectSlide(idx)}
                  className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-[#121829] border-blue-500 text-foreground shadow-md'
                      : 'bg-[#0b101c] border-white/10 text-muted hover:text-foreground hover:bg-[#0f1524]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold">
                    <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? 'bg-sky-400 animate-pulse' : 'bg-muted'}`} />
                    <span className="truncate">{slide.tag}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground line-clamp-1">
                    {slide.title}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Detailed Feature Capabilities Card */}
          <div className="p-4 rounded-2xl bg-[#0c1220] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-sky-400 font-bold tracking-wider uppercase">
                  {slides[activeSlide].badge} · {slides[activeSlide].tag}
                </span>
                <h4 className="text-sm font-bold text-foreground">
                  {slides[activeSlide].title}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-muted hidden sm:inline">
                {slides[activeSlide].stats}
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {slides[activeSlide].summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300">
              {slides[activeSlide].highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-snug">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Update Execution Pipeline (Only runs on explicit user click) */}
          {isUpdating && (
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                <span>{updateStep || 'Applying BendLens Architecture Updates...'}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}

          {updateSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2.5 text-xs text-emerald-300 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Update installed successfully! BendLens is now on v{updateInfo?.latestVersion || '1.1.0'}. Closing...</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
              >
                Close Now
              </button>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-[#0c1220] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            {updateInfo?.hasUpdate ? (
              <>
                <span>Installed: <strong className="font-mono text-foreground">v{updateInfo?.currentVersion || '1.0.0'}</strong></span>
                <ArrowRight className="h-3 w-3 text-muted" />
                <span>Target: <strong className="font-mono text-sky-400">v{updateInfo?.latestVersion || '1.1.0'}</strong></span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Installed: <strong>v{updateInfo?.currentVersion || '1.1.0'} (Latest Release)</strong></span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating && !updateSuccess}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-white/5 border border-white/10 transition-colors cursor-pointer disabled:opacity-40"
            >
              Close
            </button>

            {!updateInfo?.hasUpdate ? (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm cursor-pointer hover:bg-emerald-500/30 transition-all"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Already Up to Date (v{updateInfo?.currentVersion || '1.1.0'})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onApplyUpdate}
                disabled={isUpdating || updateSuccess}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-[0_2px_15px_rgba(56,189,248,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Installing Update...</span>
                  </>
                ) : updateSuccess ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Updated!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Install & Apply Update</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
