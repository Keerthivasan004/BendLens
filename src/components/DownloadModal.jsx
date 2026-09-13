'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, ShieldCheck, X, ArrowRight, Laptop, Lock, RefreshCw, Play, HardDrive, Zap, FileSearch } from 'lucide-react';

export default function DownloadModal({ isOpen, onClose, reason = 'DEFAULT' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC to close + lock background scroll while open (same behavior as X button)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const isFromShowLens = reason === 'SHOW_LENS';

  const modalElement = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Download BendLens Desktop App"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-3xl bg-surface-card border border-border shadow-modal overflow-hidden flex flex-col my-auto animate-rise"
      >
        {/* Hero header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#2f62f0] via-[#4c71f7] to-[#06b6d4] px-6 sm:px-10 py-8 sm:py-10 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_200px_at_85%_10%,rgba(255,255,255,0.22),transparent_70%)]"
          />
          <button
            onClick={onClose}
            aria-label="Close download dialog (Esc)"
            title="Close (Esc)"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-sm">
              <Laptop className="h-6 w-6 text-white" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-white/80">
              Native Windows App
            </span>
          </div>
          <h3 className="relative text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {isFromShowLens ? 'Take the Studio to your desktop' : 'BendLens Desktop App'}
          </h3>
          <p className="relative text-sm text-white/85 leading-relaxed mt-2 max-w-xl">
            {isFromShowLens
              ? 'All architecture diagrams and blast-radius simulations run 100% locally on your computer — no browser tab required.'
              : 'One native executable. Scan any folder on your machine with the full studio — zero configuration, zero cloud.'}
          </p>
          <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
              <ShieldCheck className="h-3.5 w-3.5" /> Air-gapped
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
              <Lock className="h-3.5 w-3.5" /> Private by default
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
              <RefreshCw className="h-3.5 w-3.5" /> Auto-updates included
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 sm:px-10 py-6 sm:py-8 bg-surface">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            {/* Why desktop */}
            <div>
              <div className="section-label mb-3">Why go desktop</div>
              <ul className="space-y-3">
                {[
                  { icon: HardDrive, title: 'Scan any local folder', desc: 'Point at Desktop, repos, or network drives — browsers cannot do this.' },
                  { icon: Zap, title: 'Native speed, instant splash', desc: 'Embedded engine boots in seconds with zero browser overhead.' },
                  { icon: ShieldCheck, title: 'Nothing leaves your PC', desc: 'Parsing, graphs, and diagrams all compute in local memory.' },
                ].map((f) => (
                  <li key={f.title} className="flex items-start gap-3">
                    <span className="h-9 w-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                      <f.icon className="h-4 w-4 text-brand" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-foreground">{f.title}</span>
                      <span className="block text-xs text-muted leading-relaxed mt-0.5">{f.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl border border-border-subtle bg-surface-subtle px-4 py-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { k: 'OS', v: 'Win 10/11 · 64-bit' },
                  { k: 'Setup', v: '1-click · no admin' },
                  { k: 'Network', v: 'Fully offline' },
                ].map((s) => (
                  <div key={s.k}>
                    <div className="section-label !text-[10px]">{s.k}</div>
                    <div className="text-xs font-bold text-foreground mt-1">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup steps */}
            <div>
              <div className="section-label mb-3">Get running in a minute</div>
              <ol className="space-y-2.5">
                {[
                  { n: '1', t: 'Download the installer', d: 'Grab BendLens-Setup.exe below — one file, no bundles.' },
                  { n: '2', t: 'Run it once', d: 'Creates the app plus a Desktop shortcut automatically.' },
                  { n: '3', t: 'Scan any codebase', d: 'Paste a folder path — even Desktop — and explore the studio.' },
                ].map((s) => (
                  <li key={s.n} className="flex items-start gap-3 rounded-xl border border-border bg-surface-card p-3.5 shadow-subtle">
                    <span className="h-7 w-7 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {s.n}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-foreground">{s.t}</span>
                      <span className="block text-xs text-muted leading-relaxed mt-0.5">{s.d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex items-start gap-2 text-[11px] text-muted leading-relaxed">
                <FileSearch className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand" />
                <span>Prefer not to install? Upload a .ZIP archive or paste your schema instead — right from the ingestion panel.</span>
              </div>
            </div>
          </div>

          {/* Download actions */}
          <div className="mt-6 pt-5 border-t border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <a
              href="/api/download-app"
              download="BendLens.exe"
              onClick={() => setTimeout(onClose, 1500)}
              className="btn-primary flex-1 py-3 text-sm font-bold justify-center group shadow-glow"
            >
              <Download className="h-4 w-4" />
              <span>Download Desktop App</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="/lens"
              onClick={onClose}
              className="btn-secondary sm:w-auto py-3 px-5 text-sm font-semibold justify-center"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Continue in Web Studio</span>
            </a>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted">
            Press <kbd className="px-1.5 py-0.5 rounded-md bg-surface-raised border border-border font-mono text-[10px] font-bold">Esc</kbd> to close this dialog
          </p>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : null;
}
