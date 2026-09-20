'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, 
  Download, Search, Code, Eye, Layers, Database, 
  Box, Cpu, GitCommit, ArrowRight, Check, Move, Sparkles
} from 'lucide-react';
import DatabaseSchemaDiagram from './DatabaseSchemaDiagram';

export default function DiagramCanvas({ 
  diagrams, 
  schemaData, 
  theme = 'dark', 
  onSelectForImpact,
  activeTab: controlledActiveTab,
  onTabChange,
  initialTab = 'erd'
}) {
  const [internalActiveTab, setInternalActiveTab] = useState(initialTab);
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  const [erdMode, setErdMode] = useState('MERMAID'); // 'MERMAID' | 'INTERACTIVE'
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMermaidReady, setIsMermaidReady] = useState(typeof window !== 'undefined' && !!window.mermaid);

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const viewportRef = useRef(null);
  const renderReqId = useRef(0);
  const isRenderingRef = useRef(false);
  const queuedRenderRef = useRef(false);
  const lastThemeRef = useRef(null);
  const svgCacheRef = useRef(new Map());

  const currentDiagram = diagrams ? diagrams[activeTab] : null;

  const cleanStrayMermaidErrors = () => {
    if (typeof document !== 'undefined') {
      // Only remove error overlays, never remove active rendering sandboxes
      document.querySelectorAll('body > [id*="mermaid-"][aria-roledescription="error"], body > svg[aria-roledescription="error"], body > div[id^="dmermaid"]').forEach((el) => {
        el.remove();
      });
    }
  };

  const getFilteredMermaid = () => {
    if (!currentDiagram) return '';
    if (typeof currentDiagram === 'string') return currentDiagram;
    if (typeof currentDiagram === 'object' && currentDiagram.mermaid) return currentDiagram.mermaid;
    return '';
  };

  // Highlight search matches directly in rendered SVG without corrupting diagram syntax
  useEffect(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;
    const q = filterQuery.trim().toLowerCase();
    const nodes = svg.querySelectorAll('g.node, g.cluster, g.actor, g.messageLine0, g.messageLine1, .entityBox, .entityLabel');
    if (!q) {
      nodes.forEach((n) => {
        n.style.opacity = '1';
        n.style.filter = 'none';
      });
      return;
    }
    nodes.forEach((n) => {
      const text = (n.textContent || '').toLowerCase();
      if (text.includes(q)) {
        n.style.opacity = '1';
        n.style.filter = 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.85))';
      } else {
        n.style.opacity = '0.35';
        n.style.filter = 'none';
      }
    });
  }, [filterQuery]);

  // Proactively monitor and detect window.mermaid availability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.mermaid) {
        setIsMermaidReady(true);
      } else {
        const interval = setInterval(() => {
          if (window.mermaid) {
            setIsMermaidReady(true);
            clearInterval(interval);
          }
        }, 80);
        const timer = setTimeout(() => clearInterval(interval), 4000);
        return () => {
          clearInterval(interval);
          clearTimeout(timer);
        };
      }
    }
  }, []);

  // Initialize Mermaid configuration only once or on theme change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.mermaid && lastThemeRef.current !== theme) {
      lastThemeRef.current = theme;
      cleanStrayMermaidErrors();
      const isDark = theme === 'dark';
      
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          maxTextSize: 10000000,
          theme: isDark ? 'dark' : 'neutral',
          securityLevel: 'loose',
          themeVariables: isDark ? {
            darkMode: true,
            background: '#0b1120',
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
            clusterBkg: '#0a0f1e',
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
      } catch (e) {}
    }
  }, [theme, isMermaidReady]);

  // Diagram rendering effect on tab or diagram change
  useEffect(() => {
    if (activeTab === 'erd' && erdMode === 'INTERACTIVE') {
      setTimeout(handleFitToScreen, 120);
      return;
    }
    if (typeof window !== 'undefined' && window.mermaid) {
      renderDiagram();
    }
  }, [activeTab, erdMode, currentDiagram, showCode, isMermaidReady]);

  const renderDiagram = async () => {
    if (isRenderingRef.current) {
      queuedRenderRef.current = true;
      return;
    }
    isRenderingRef.current = true;

    const thisReq = ++renderReqId.current;
    const element = containerRef.current;
    const mermaidCode = getFilteredMermaid();
    cleanStrayMermaidErrors();

    if (!element || !mermaidCode) {
      isRenderingRef.current = false;
      return;
    }

    // Check in-memory cache for instant 0ms transitions without recomputing layout
    const cacheKey = `${activeTab}-${theme}-${mermaidCode.length}-${mermaidCode.slice(0, 60)}`;
    if (svgCacheRef.current.has(cacheKey)) {
      const cachedSvg = svgCacheRef.current.get(cacheKey);
      if (thisReq === renderReqId.current && element) {
        cleanStrayMermaidErrors();
        element.innerHTML = cachedSvg;
        const svgEl = element.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = 'none';
          svgEl.style.height = 'auto';
        }
        setTimeout(handleFitToScreen, 30);
      }
      isRenderingRef.current = false;
      return;
    }

    // Yield to event loop to keep the UI interactive and avoid window freezes
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Ensure custom fonts are loaded to guarantee non-zero text measurement bounding boxes
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    if (thisReq !== renderReqId.current) {
      isRenderingRef.current = false;
      if (queuedRenderRef.current) {
        queuedRenderRef.current = false;
        renderDiagram();
      }
      return;
    }

    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const { svg } = await window.mermaid.render(id, mermaidCode);
      if (thisReq === renderReqId.current && element) {
        cleanStrayMermaidErrors();

        // Self-heal: If Mermaid generated an internal text size error SVG, fall back to Interactive Topology
        if (svg && (svg.includes('Maximum text size in diagram exceeded') || svg.includes('style a fill:#faa'))) {
          if (activeTab === 'erd') {
            setErdMode('INTERACTIVE');
            isRenderingRef.current = false;
            return;
          }
        }

        element.innerHTML = svg;
        svgCacheRef.current.set(cacheKey, svg);
        const svgEl = element.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = 'none';
          svgEl.style.height = 'auto';
        }
        setTimeout(handleFitToScreen, 60);
      }
    } catch (err) {
      if (thisReq === renderReqId.current && element) {
        cleanStrayMermaidErrors();
        console.warn('Mermaid visual render note:', err);

        // Self-healing fallback: strip flowchart edge labels if needed, sanitize unescaped ampersands
        try {
          let sanitizedCode = mermaidCode.replace(/&/g, 'and');
          if (!sanitizedCode.trim().startsWith('erDiagram')) {
            sanitizedCode = sanitizedCode.replace(/\|[^|\n]+\|/g, '');
          }
          const retryId = `mermaid-retry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const { svg: retrySvg } = await window.mermaid.render(retryId, sanitizedCode);
          if (thisReq === renderReqId.current && element) {
            cleanStrayMermaidErrors();
            if (retrySvg && (retrySvg.includes('Maximum text size in diagram exceeded') || retrySvg.includes('style a fill:#faa'))) {
              if (activeTab === 'erd') {
                setErdMode('INTERACTIVE');
                isRenderingRef.current = false;
                return;
              }
            }
            element.innerHTML = retrySvg;
            svgCacheRef.current.set(cacheKey, retrySvg);
            const svgEl = element.querySelector('svg');
            if (svgEl) {
              svgEl.style.maxWidth = 'none';
              svgEl.style.height = 'auto';
            }
            setTimeout(handleFitToScreen, 60);
          }
        } catch (fallbackErr) {
          if (thisReq === renderReqId.current && element) {
            cleanStrayMermaidErrors();
            if (activeTab === 'erd') {
              setErdMode('INTERACTIVE');
            } else {
              element.innerHTML = `<div class="p-6 text-xs text-muted font-mono bg-surface-card rounded-xl border border-border flex flex-col items-center justify-center text-center">
                <p class="font-semibold text-foreground">Diagram Visual Preview</p>
                <p class="text-[11px] text-muted mt-1">Switch to 'Code' view to inspect schema definitions.</p>
              </div>`;
            }
          }
        }
      }
    } finally {
      isRenderingRef.current = false;
      if (queuedRenderRef.current) {
        queuedRenderRef.current = false;
        renderDiagram();
      }
    }
  };

  const handleFitToScreen = () => {
    if (!wrapperRef.current) return;
    const container = wrapperRef.current.querySelector('.canvas-viewport') || wrapperRef.current;
    const cWidth = container.clientWidth - 48;
    const cHeight = container.clientHeight - 48;

    let dWidth = 1000;
    let dHeight = 700;

    if (activeTab === 'erd' && erdMode === 'INTERACTIVE') {
      const svg = wrapperRef.current.querySelector('svg[aria-label="Interactive Database Schema ERD Diagram"]');
      if (svg) {
        dWidth = svg.viewBox.baseVal?.width || svg.clientWidth || 1100;
        dHeight = svg.viewBox.baseVal?.height || svg.clientHeight || 750;
      }
    } else if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const bbox = svg.getBBox ? svg.getBBox() : null;
        dWidth = (bbox && bbox.width > 0) ? bbox.width : (svg.viewBox?.baseVal?.width || svg.clientWidth || 1000);
        dHeight = (bbox && bbox.height > 0) ? bbox.height : (svg.viewBox?.baseVal?.height || svg.clientHeight || 700);
      }
    }

    if (dWidth > 0 && dHeight > 0 && cWidth > 0 && cHeight > 0) {
      const scaleX = cWidth / dWidth;
      const scaleY = cHeight / dHeight;
      const fitZoom = Math.min(scaleX, scaleY);
      const targetZoom = Math.max(0.12, Math.min(fitZoom, 1.25));
      setZoom(Number(targetZoom.toFixed(2)));
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoom(0.85);
      setPanOffset({ x: 0, y: 0 });
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

  // Ensure dragging never gets stuck and cursor always resets on window blur/mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalBlur = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('blur', handleGlobalBlur);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('blur', handleGlobalBlur);
    };
  }, []);

  // Wheel behavior (Figma convention): plain wheel scrolls the page,
  // Ctrl/Cmd + wheel zooms the canvas. Native non-passive listener so
  // preventDefault works without console warnings.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheelNative = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom((prevZoom) => Math.min(Math.max(prevZoom * zoomFactor, 0.1), 4.0));
      }
      // otherwise: let the event propagate so the page scrolls naturally
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 4.0));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.1));
  const handleResetZoom = () => {
    handleFitToScreen();
  };

  const handleExportSVG = () => {
    setIsDragging(false);
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
    setTimeout(() => {
      try {
        if (downloadLink.parentNode) {
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(svgUrl);
      } catch {}
    }, 2000);
  };

  const handleCopyCode = () => {
    if (!currentDiagram) return;
    navigator.clipboard.writeText(currentDiagram.mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'erd', label: 'Database ERD', icon: Database, color: 'text-blue-900 dark:text-cyan-400' },
    { id: 'hld', label: 'High-Level Design (HLD)', icon: Box, color: 'text-violet-700 dark:text-violet-400' },
    { id: 'lld', label: 'Low-Level Design (LLD)', icon: Cpu, color: 'text-emerald-700 dark:text-emerald-400' },
    { id: 'sequence', label: 'Execution Sequence', icon: GitCommit, color: 'text-amber-700 dark:text-amber-400' }
  ];

  return (
    <div
      ref={wrapperRef}
      className={`overflow-hidden flex flex-col border border-border transition-all bg-surface-card shadow-card ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'h-[600px] rounded-2xl'
      }`}
    >
      {/* Top Floating Controls Header */}
      <div className="chrome-bar px-4 py-2.5 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2.5 select-none">
        {/* Diagram Type Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-raised rounded-xl border border-border-subtle shadow-subtle flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setInternalActiveTab(tab.id);
                  if (onTabChange) onTabChange(tab.id);
                  handleResetZoom();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-surface text-foreground shadow-card border-border'
                    : 'text-muted hover:text-foreground border-transparent hover:bg-surface-subtle'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ERD View Mode Switcher (only on ERD tab) */}
          {activeTab === 'erd' && (
            <div className="flex items-center p-0.5 bg-surface-raised rounded-md border border-border text-[11px] font-medium">
              <button
                onClick={() => {
                  setErdMode('MERMAID');
                  handleResetZoom();
                }}
                className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                  erdMode === 'MERMAID'
                    ? 'bg-surface-card text-foreground font-semibold shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Crow's Foot ERD
              </button>
              <button
                onClick={() => {
                  setErdMode('INTERACTIVE');
                  handleResetZoom();
                }}
                className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                  erdMode === 'INTERACTIVE'
                    ? 'bg-surface-card text-foreground font-semibold shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Interactive Topology
              </button>
            </div>
          )}

          {/* Quick Search in Diagram */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search nodes or tables..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-xs rounded-md bg-surface border border-border focus:border-brand outline-none text-foreground w-36 sm:w-44 placeholder:text-muted"
            />
          </div>

          {/* Zoom Controls Pill */}
          <div className="flex items-center bg-surface-raised rounded-md border border-border p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-surface-subtle text-muted hover:text-foreground transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono font-semibold px-2 text-foreground min-w-[38px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-surface-subtle text-muted hover:text-foreground transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-1 px-1.5 rounded hover:bg-brand hover:text-white font-semibold transition-colors cursor-pointer ml-0.5 border-l border-border flex items-center gap-1 text-[10px]"
              title="Fit to Screen (Show Whole Schema)"
            >
              <Maximize2 className="h-3 w-3" />
              <span className="hidden sm:inline">Fit</span>
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-surface-subtle text-muted hover:text-foreground transition-colors cursor-pointer ml-0.5 border-l border-border"
              title="Reset View (Fit Whole Schema)"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Toggle Code / Visual */}
          <button
            onClick={() => setShowCode(!showCode)}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              showCode
                ? 'bg-surface-raised text-foreground border-border shadow-xs'
                : 'bg-surface hover:bg-surface-raised text-muted hover:text-foreground border-border'
            }`}
            title={showCode ? 'View Visual Diagram' : 'View Mermaid Code'}
          >
            {showCode ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
          </button>

          {/* Export SVG */}
          <button
            onClick={handleExportSVG}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface hover:bg-surface-raised text-foreground border border-border text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Download High-Res SVG Diagram"
          >
            <Download className="h-3.5 w-3.5 text-muted" />
            <span className="hidden sm:inline">SVG</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md bg-surface hover:bg-surface-raised text-muted hover:text-foreground border border-border transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={viewportRef}
        className={`flex-1 relative overflow-hidden bg-surface canvas-grid canvas-viewport ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Navigation / Pan Hint Floating Overlay */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg overlay-card border border-border text-[10px] text-muted font-medium shadow-sm">
          <Move className="h-3 w-3 text-blue-500" />
          <span>Drag to pan • Scroll page normally • Ctrl + scroll to zoom</span>
        </div>

        {/* Visual Mermaid Canvas */}
        {!showCode ? (
          <>
            {/* Interactive Schema Diagram (Only for ERD interactive mode) */}
            <div 
              className={`w-full h-full select-none ${activeTab === 'erd' && erdMode === 'INTERACTIVE' ? 'block' : 'hidden'}`}
              style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}
            >
              <DatabaseSchemaDiagram schemaData={schemaData} filterQuery={filterQuery} theme={theme} onSelectForImpact={onSelectForImpact} />
            </div>

            {/* Mermaid Canvas Container (Always mounted so containerRef is NEVER null) */}
            <div
              className={`w-full h-full flex items-center justify-center select-none ${activeTab === 'erd' && erdMode === 'INTERACTIVE' ? 'hidden' : 'block'}`}
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <div ref={containerRef} className="mermaid-container p-12 inline-block min-w-fit min-h-fit" />
            </div>
          </>
        ) : (
          /* Code View Drawer */
          <div className="w-full h-full p-6 bg-slate-950 text-slate-100 font-mono text-xs overflow-auto flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-slate-400 font-bold">{activeTab === 'erd' ? 'Schema source representation' : 'Mermaid Architecture Code'}</span>
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
      <div className="chrome-bar px-4 py-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-muted">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{currentDiagram?.title || 'System Diagram'}</span>
          {filterQuery && (
            <span className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-foreground font-mono text-[10px]">
              Filter: "{filterQuery}"
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>Engine: <strong className="font-mono text-foreground">{activeTab === 'erd' ? (erdMode === 'INTERACTIVE' ? 'Interactive SVG Schema' : 'Mermaid v10 Crow\'s Foot ERD') : 'Mermaid v10 Vector'}</strong></span>
          <span>Zoom: <strong className="font-mono text-foreground">{Math.round(zoom * 100)}%</strong></span>
        </div>
      </div>
    </div>
  );
}
