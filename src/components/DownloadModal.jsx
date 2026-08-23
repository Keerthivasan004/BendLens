'use client';

import React from 'react';
import Logo from '@/components/Logo';
import { Download, ShieldCheck, HardDrive, Terminal, X, CheckCircle2, ArrowRight, Laptop, Lock, Sparkles, RefreshCw, Play } from 'lucide-react';

export default function DownloadModal({ isOpen, onClose, reason = 'DEFAULT' }) {
  if (!isOpen) return null;

  const isFromShowLens = reason === 'SHOW_LENS';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0c101c] border border-slate-200 dark:border-blue-900/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50 dark:bg-[#111626]">
          <div className="flex items-center gap-3">
            <Logo size="sm" withText={false} />
            <div>
              <h3 className="text-sm font-black text-blue-950 dark:text-blue-300">
                {isFromShowLens ? 'Please Download to View Lens Data' : 'BendLens Native Desktop App (.EXE)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isFromShowLens
                  ? 'All architecture diagrams & blast simulations run 100% locally on your computer.'
                  : 'Compiled Native Windows Executable • Zero Unzipping Required'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 bg-white dark:bg-[#0c101c]">
          {/* Brand & Privacy Card */}
          <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold text-blue-950 dark:text-blue-300 block mb-0.5">
                {isFromShowLens
                  ? 'Analysis Ready! Download BendLens.exe to View Lens Data'
                  : '100% Local & Air-Gapped Desktop App'}
              </span>
              <p className="text-blue-900/80 dark:text-blue-300/80 leading-relaxed font-medium">
                BendLens downloads as a single native Windows binary (<strong>BendLens.exe</strong>). Double-click to launch, create a desktop shortcut, and keep all your proprietary backend code 100% private.
              </p>
            </div>
          </div>

          {/* Quick Setup Guide */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-blue-950 dark:text-blue-300">
                1-Click Direct Setup (.EXE Format)
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Auto-Updates Included</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121726] border border-slate-200 dark:border-neutral-800">
                <span className="text-[10px] font-mono font-bold text-blue-900 dark:text-blue-400 block mb-1">STEP 1</span>
                <span className="font-bold text-foreground block mb-1">Download .EXE</span>
                <p className="text-[11px] text-slate-500 font-medium">Click below to download <strong>BendLens.exe</strong> directly.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121726] border border-slate-200 dark:border-neutral-800">
                <span className="text-[10px] font-mono font-bold text-blue-900 dark:text-blue-400 block mb-1">STEP 2</span>
                <span className="font-bold text-foreground block mb-1">Double-Click File</span>
                <p className="text-[11px] text-slate-500 font-medium">Click <strong>BendLens.exe</strong> to start. No unzipping needed.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121726] border border-slate-200 dark:border-neutral-800">
                <span className="text-[10px] font-mono font-bold text-blue-900 dark:text-blue-400 block mb-1">STEP 3</span>
                <span className="font-bold text-foreground block mb-1">Launch & Shortcut</span>
                <p className="text-[11px] text-slate-500 font-medium">Creates a <strong>Desktop Shortcut</strong> and opens the studio immediately!</p>
              </div>
            </div>
          </div>

          {/* Download Action Triggers */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <a
              href="/api/download-app"
              download="BendLens.exe"
              onClick={() => setTimeout(onClose, 1500)}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-xs shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <Download className="h-4 w-4" />
              <span>Download BendLens.exe</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="/lens"
              onClick={onClose}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-foreground font-bold text-xs border border-border shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current text-blue-900 dark:text-blue-400" />
              <span>Proceed to Studio Console</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
