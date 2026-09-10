'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Logo from '@/components/Logo';
import { Download, ShieldCheck, HardDrive, Terminal, X, CheckCircle2, ArrowRight, Laptop, Lock, Sparkles, RefreshCw, Play } from 'lucide-react';

export default function DownloadModal({ isOpen, onClose, reason = 'DEFAULT' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isFromShowLens = reason === 'SHOW_LENS';

  const modalElement = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-2xl rounded-xl bg-surface-card border border-border shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" withText={false} />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isFromShowLens ? 'Download Desktop App to View Lens' : 'BendLens Native Desktop App (.EXE)'}
              </h3>
              <p className="text-[11px] text-muted">
                {isFromShowLens
                  ? 'All architecture diagrams & simulations run 100% locally on your computer.'
                  : 'Single Native Executable · Zero Configuration Required'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 bg-surface">
          {/* Privacy Notice */}
          <div className="p-3.5 rounded-lg bg-surface-raised border border-border flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-foreground block mb-0.5">
                {isFromShowLens
                  ? 'Local Codebase Security Boundary'
                  : '100% Air-Gapped Local Architecture'}
              </span>
              <p className="text-muted leading-relaxed">
                BendLens runs as a standalone native binary (<strong>BendLens.exe</strong>). Launching the desktop app allows direct scanning of your machine's project folders without uploading code to any third-party cloud.
              </p>
            </div>
          </div>

          {/* Quick Steps */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Setup Steps
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted font-medium">
                <RefreshCw className="h-3 w-3 animate-spin text-brand" />
                <span>Auto-Updates Included</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <span className="text-[10px] font-mono font-bold text-brand block mb-0.5">STEP 1</span>
                <span className="font-semibold text-foreground block mb-0.5">Download .EXE</span>
                <p className="text-[11px] text-muted">Download <strong>BendLens.exe</strong> directly.</p>
              </div>

              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <span className="text-[10px] font-mono font-bold text-brand block mb-0.5">STEP 2</span>
                <span className="font-semibold text-foreground block mb-0.5">Double-Click File</span>
                <p className="text-[11px] text-muted">Click <strong>BendLens.exe</strong> to start immediately.</p>
              </div>

              <div className="p-3 rounded-lg bg-surface-raised border border-border">
                <span className="text-[10px] font-mono font-bold text-brand block mb-0.5">STEP 3</span>
                <span className="font-semibold text-foreground block mb-0.5">Scan Codebase</span>
                <p className="text-[11px] text-muted">Directly inspect local directory trees.</p>
              </div>
            </div>
          </div>

          {/* Download Action Triggers */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-border">
            <a
              href="/api/download-app"
              download="BendLens.exe"
              onClick={() => setTimeout(onClose, 1500)}
              className="btn-primary w-full sm:flex-1 py-2 text-xs font-semibold justify-center group"
            >
              <Download className="h-4 w-4 mr-1.5" />
              <span>Download BendLens.exe</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
            </a>

            <a
              href="/lens"
              onClick={onClose}
              className="btn-secondary w-full sm:w-auto py-2 text-xs font-semibold justify-center"
            >
              <Play className="h-3.5 w-3.5 fill-current mr-1.5" />
              <span>Continue in Web Studio</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : null;
}
