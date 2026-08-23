'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, 
  Download, Search, Code, Eye, Layers, Database, 
  Box, Cpu, GitCommit, ArrowRight, Check, Move, Sparkles
} from 'lucide-react';

export default function DiagramCanvas({ diagrams, theme = 'dark' }) {
  const [activeTab, setActiveTab] = useState('erd');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  const currentDiagram = diagrams ? diagrams[activeTab] : null;

  // Filter diagram lines if searching
  const getFilteredMermaid = () => {
    if (!currentDiagram || !currentDiagram.mermaid) return '';
    if (!filterQuery.trim()) return currentDiagram.mermaid;

    const query = filterQuery.toLowerCase();
    const lines = currentDiagram.mermaid.split('\n');
    
    const filtered = lines.filter((line, idx) => {
      if (idx === 0) return true;
      return line.toLowerCase().includes(query) || line.includes('{') || line.includes('}');
    });

    return filtered.length > 2 ? filtered.join('\n') : currentDiagram.mermaid;
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.mermaid) {
      const isDark = theme === 'dark';
      
      window.mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        securityLevel: 'loose',
        themeVariables: isDark ? {
          darkMode: true,
          background: '#000000',
          primaryColor: '#12172a',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#60a5fa',
          lineColor: '#93c5fd',
          secondaryColor: '#1e1b4b',
          tertiaryColor: '#0b0f19',
          noteBkgColor: '#12172a',
          noteTextColor: '#f8fafc',
          noteBorderColor: '#60a5fa',
          actorBkg: '#161c2d',
          actorBorder: '#60a5fa',
          actorTextColor: '#ffffff',
          signalColor: '#93c5fd',
          signalTextColor: '#ffffff',
          clusterBkg: '#070a12',
          clusterBorder: '#3b82f6',
          titleColor: '#93c5fd',
          fontSize: '13px',
          fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', sans-serif"
        } : {
          darkMode: false,
          background: '#ffffff',
          primaryColor: '#ffffff',
          primaryTextColor: '#000000',
          primaryBorderColor: '#1e3a8a',
          lineColor: '#1e3a8a',
          secondaryColor: '#1e40af',
          tertiaryColor: '#f8fafc',
          fontSize: '13px',
          fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', sans-serif"
        },
        er: {
          useMaxWidth: false,
          fill: isDark ? '#12172a' : '#ffffff',
          stroke: isDark ? '#60a5fa' : '#1e3a8a',
          fontSize: 13
        },
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis',
          nodeSpacing: 50,
          rankSpacing: 60,
          padding: 20
        },
        sequence: {
          useMaxWidth: false,
          actorFontSize: 13,
          messageFontSize: 12,
          boxMargin: 15
        }
      });

      renderDiagram();
    }
  }, [activeTab, currentDiagram, showCode, filterQuery, theme]);

  const renderDiagram = () => {
    const element = containerRef.current;
    const mermaidCode = getFilteredMermaid();
    if (element && mermaidCode) {
      element.innerHTML = '';
      const id = `mermaid-${Date.now()}`;
      window.mermaid
        .render(id, mermaidCode)
        .then(({ svg }) => {
          element.innerHTML = svg;
          const svgEl = element.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = 'none';
            svgEl.style.height = 'auto';
          }
        })
        .catch((err) => {
          console.error('Mermaid render error:', err);
          element.innerHTML = `<div class="p-6 text-xs text-rose-500 font-mono bg-surface-card rounded-xl border border-rose-500/30">
            <strong>Syntax Note:</strong> Switch to 'Code' view to inspect schema definitions.
          </div>`;
        });
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prevZoom) => {
      const newZoom = prevZoom * zoomFactor;
      return Math.min(Math.max(newZoom, 0.25), 3.5);
    });
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.25));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleExportSVG = () => {
    if (!containerRef.current) return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `BendLens-${activeTab.toUpperCase()}-Diagram.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleCopyCode = () => {
    if (!currentDiagram) return;
    navigator.clipboard.writeText(currentDiagram.mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'erd', label: 'Database ERD', icon: Database, color: 'text-blue-900 dark:text-cyan-400' },
    { id: 'hld', label: 'High-Level C4', icon: Box, color: 'text-violet-700 dark:text-violet-400' },
    { id: 'lld', label: 'Low-Level Call Graph', icon: Cpu, color: 'text-emerald-700 dark:text-emerald-400' },
    { id: 'sequence', label: 'Execution Sequence', icon: GitCommit, color: 'text-amber-700 dark:text-amber-400' }
  ];

  return (
    <div
      ref={wrapperRef}
      className={`glass-panel overflow-hidden flex flex-col border border-border transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'h-[640px] rounded-2xl shadow-xl'
      }`}
    >
      {/* Top Floating Controls Header */}
      <div className="bg-white dark:bg-black px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Diagram Type Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  handleResetZoom();
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Search in Diagram */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search nodes or tables..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded-lg bg-surface-card border border-border focus:border-blue-900 dark:focus:border-blue-400 outline-none text-foreground w-40 sm:w-48 placeholder-slate-400"
            />
          </div>

          {/* Zoom Controls Pill */}
          <div className="flex items-center bg-surface-card rounded-lg border border-border p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold px-2 text-foreground min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer ml-0.5 border-l border-border"
              title="Reset View"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Toggle Code / Visual */}
          <button
            onClick={() => setShowCode(!showCode)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showCode
                ? 'bg-blue-900 dark:bg-blue-600 text-white border-transparent shadow-sm'
                : 'bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-800 text-foreground border-border'
            }`}
            title={showCode ? 'View Visual Diagram' : 'View Mermaid Code'}
          >
            {showCode ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
          </button>

          {/* Export SVG */}
          <button
            onClick={handleExportSVG}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-800 text-foreground border border-border text-xs font-bold transition-all cursor-pointer"
            title="Download High-Res SVG Diagram"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SVG</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-surface-card hover:bg-slate-100 dark:hover:bg-neutral-800 text-foreground border border-border transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        className={`flex-1 relative overflow-hidden bg-white dark:bg-black canvas-grid ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Navigation / Pan Hint Floating Overlay */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-card/90 backdrop-blur-sm border border-border text-[10px] text-slate-500 font-medium shadow-sm">
          <Move className="h-3 w-3 text-blue-500" />
          <span>Click & Drag to Pan • Wheel to Zoom</span>
        </div>

        {/* Visual Mermaid Canvas */}
        {!showCode ? (
          <div
            className="w-full h-full flex items-center justify-center select-none"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <div ref={containerRef} className="mermaid-container p-12 inline-block min-w-fit min-h-fit" />
          </div>
        ) : (
          /* Code View Drawer */
          <div className="w-full h-full p-6 bg-slate-950 text-slate-100 font-mono text-xs overflow-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-slate-400 font-bold">Mermaid Architecture Code</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Code className="h-3 w-3" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="flex-1 whitespace-pre leading-relaxed text-cyan-300">
              {currentDiagram?.mermaid}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="bg-white dark:bg-black px-4 py-2 border-t border-border flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{currentDiagram?.title || 'System Diagram'}</span>
          {filterQuery && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-mono text-[10px]">
              Filter: "{filterQuery}"
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>Engine: <strong className="font-mono text-foreground">Mermaid v10 Vector</strong></span>
          <span>Zoom: <strong className="font-mono text-foreground">{Math.round(zoom * 100)}%</strong></span>
        </div>
      </div>
    </div>
  );
}
