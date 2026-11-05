'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, ArrowLeft, Scale, Lock, Download, Copy,
  Check, FileText, Calendar, Globe, CheckCircle2
} from 'lucide-react';

const PRIVACY_DOCUMENT = `# BendLens Privacy Policy & Data Sovereignty Statement

**Effective Date:** January 1, 2025  
**Last Updated:** January 1, 2025  
**Platform:** BendLens - Universal Backend Architecture & Blast-Radius Platform  
**Architecture Model:** 100% Local-First, Air-Gapped, Zero Cloud Leakage  
**Compliance Framework:** GDPR (Regulation (EU) 2016/679), CCPA/CPRA (Cal. Civ. Code § 1798.100), India DPDP Act 2023  

---

## 1. Executive Summary & Privacy Pledge

BendLens is engineered from the ground up on an uncompromising architectural principle: **Your source code, backend schemas, database structures, and internal architectures belong exclusively to you.**

Unlike conventional cloud-tethered developer tools, BendLens operates as a **100% local-first, air-gapped platform**. All code analysis, abstract syntax tree (AST) extraction, knowledge graph synthesis, and blast-radius simulations run strictly inside your local device runtime or isolated private cloud memory.

BendLens **never** transmits, uploads, stores, or proxies your proprietary source code, credentials, API payloads, or database schema definitions to external servers, third-party analytics engines, or foreign AI APIs.

---

## 2. Information We Never Collect

To provide absolute certainty to engineering teams, compliance officers, and enterprise security auditors, BendLens certifies that it does **NOT**:

- **Exfiltrate Source Code:** We do not upload your repository files, AST tokens, or dependency trees to external servers.
- **Store Credentials:** We never record, persist, or transmit your private API keys, GitHub personal access tokens, database passwords, or connection strings.
- **Track Proprietary Behavior:** We do not embed covert tracking beacons, behavioral telemetry, session replay scripts, or commercial ad pixels.
- **Harvest Database Schemas:** Database definitions, table structures, foreign keys, and blast-radius impact graphs are generated and retained exclusively in volatile Node.js runtime memory.

---

## 3. Local-First Processing & Data Retention

### 3.1 In-Memory Analysis Lifecycle
When you point BendLens to a local repository folder or schema file, AST parsing is performed synchronously or asynchronously within your device's local memory. When you close the session or clear the workspace, runtime graph nodes are garbage-collected by the local V8 runtime.

### 3.2 Optional Web Architecture Crawling
When you use BendLens to map external web architectures or public API perimeters, all network requests are dispatched directly from your device or private backend server to the specified target host. Discovered OpenAPI specifications and TLS certificate perimeters are processed locally and stored in your device's local browser storage (\`localStorage\`) or local temp directory.

---

## 4. Security & Enterprise Compliance

### 4.1 GDPR & CCPA Compliance
Under the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA), BendLens acts neither as a Data Controller nor as a Data Processor of your proprietary codebase data, as no personal data or proprietary code is received by BendLens servers.

### 4.2 Air-Gapped Operation
BendLens is fully functional in completely air-gapped, isolated virtual private clouds (VPCs), on-premise data centers, and offline environments without Internet connectivity.

---

## 5. Contact & Trust Center

If you have questions regarding BendLens's local-first architecture or security compliance, please consult the project documentation or contact our engineering team:

- **Project:** BendLens Platform
- **Security & Privacy:** Local-First Architecture Guarantee
- **Repository:** Private Local Workspace`;

export default function PrivacyPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PRIVACY_DOCUMENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([PRIVACY_DOCUMENT], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bendlens_privacy_policy.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Studio</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 font-mono text-xs">
            <Scale className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-white tracking-tight">BendLens</span>
            <span className="text-slate-500">/</span>
            <span className="text-emerald-400">Privacy Policy</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy Markdown content"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy MD'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download document as Markdown"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download MD</span>
          </button>
        </div>
      </header>

      {/* Body Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Privacy Policy & Data Sovereignty Statement
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  100% Air-Gapped Guarantee
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Zero Cloud Leakage • In-Memory AST Parsing • Data Sovereignty by Design
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span>Effective: <strong>January 1, 2025</strong></span>
          </div>
        </div>

        {/* Formatted Article */}
        <article className="p-6 sm:p-10 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <FileText className="h-6 w-6 text-emerald-400" />
              <span>BendLens Platform Privacy Pledge</span>
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-mono">
              Universal Backend Architecture & Blast-Radius Platform (Air-Gapped & Local-First)
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>1. Executive Summary & Privacy Pledge</span>
            </h3>
            <p>
              BendLens is engineered from the ground up on an uncompromising architectural principle: <strong className="text-white">Your source code, backend schemas, database structures, and internal architectures belong exclusively to you.</strong>
            </p>
            <p>
              Unlike conventional cloud-tethered developer tools, BendLens operates as a <strong className="text-emerald-300">100% local-first, air-gapped platform</strong>. All code analysis, abstract syntax tree (AST) extraction, knowledge graph synthesis, and blast-radius simulations run strictly inside your local device runtime or isolated private cloud memory.
            </p>
            <p>
              BendLens <strong className="text-rose-300">never</strong> transmits, uploads, stores, or proxies your proprietary source code, credentials, API payloads, or database schema definitions to external servers, third-party analytics engines, or foreign AI APIs.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>2. Information We Never Collect</span>
            </h3>
            <p>
              To provide absolute certainty to engineering teams, compliance officers, and enterprise security auditors, BendLens certifies that it does NOT:
            </p>
            <ul className="space-y-2 pl-4 text-xs font-mono">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Source Code Exfiltration:</strong> Repository files, AST tokens, and dependency graphs stay in device memory.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Credential Storage:</strong> Private API keys, GitHub tokens, database passwords, and connection strings are never recorded or transmitted.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Covert Telemetry:</strong> Zero tracking beacons, session replay scripts, or commercial ad pixels.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>No Database Harvesting:</strong> Schemas and impact graphs reside exclusively in volatile local Node.js memory.</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>3. Local-First Processing & Data Retention</span>
            </h3>
            <p>
              When you point BendLens to a local repository folder or schema file, AST parsing is performed synchronously within your device memory. When you close the session or clear the workspace, runtime graph nodes are garbage-collected by the local V8 runtime.
            </p>
            <p>
              When you use BendLens to map external web architectures or public API perimeters, all network requests are dispatched directly from your device or private backend server to the specified target host. Discovered OpenAPI specifications and TLS certificate perimeters are processed locally and stored in your device's local browser storage (<code className="text-emerald-300">localStorage</code>) or local temporary directory.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>4. Security & Enterprise Compliance</span>
            </h3>
            <p>
              Under the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA), BendLens acts neither as a Data Controller nor as a Data Processor of your proprietary codebase data, as no personal data or proprietary code is received by BendLens servers.
            </p>
            <p>
              BendLens is fully functional in completely air-gapped, isolated virtual private clouds (VPCs), on-premise data centers, and offline environments without Internet connectivity.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>5. Contact & Trust Center</span>
            </h3>
            <p>
              If you have questions regarding BendLens's local-first architecture or security compliance, please consult the project documentation or contact our engineering team via the local workspace.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
