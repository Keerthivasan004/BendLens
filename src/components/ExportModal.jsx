'use client';

import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Code2 } from 'lucide-react';

export default function ExportModal({ isOpen, onClose, data }) {
  const [format, setFormat] = useState('markdown');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !data) return null;

  const generateMarkdown = () => {
    return `# BendLens Architecture & Impact Report: ${data.projectName}
Generated at: ${new Date(data.timestamp).toLocaleString()}

## 1. Executive Summary
- **Scanned Files**: ${data.scannedFilesCount}
- **Database Tables**: ${data.schema?.tables?.length || 0}
- **API Endpoints**: ${data.code?.endpoints?.length || 0}
- **Architecture Risk Score**: ${data.personas?.manager?.metrics?.architectureRiskScore || 50}/100

## 2. Database Schema (ERD)
\`\`\`mermaid
${data.diagrams?.erd?.mermaid || ''}
\`\`\`

## 3. High-Level Design (HLD)
\`\`\`mermaid
${data.diagrams?.hld?.mermaid || ''}
\`\`\`

## 4. Low-Level Design (LLD)
\`\`\`mermaid
${data.diagrams?.lld?.mermaid || ''}
\`\`\`

## 5. What-If Blast Radius Baseline
- **Target Table**: ${data.sampleImpact?.target?.name || 'N/A'}
- **Risk Score**: ${data.sampleImpact?.blastRadius?.riskScore || 0}% (${data.sampleImpact?.blastRadius?.riskLevel || 'LOW'})
- **User Impact**: ${data.sampleImpact?.personaInsights?.business?.userFacingImpact || 'None'}
`;
  };

  const generateJSON = () => {
    return JSON.stringify(data, null, 2);
  };

  const content = format === 'json' ? generateJSON() : generateMarkdown();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : 'md';
    const mime = format === 'json' ? 'application/json' : 'text/markdown';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bendlens-architecture-report.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="glass-panel w-full max-w-3xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-500 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-foreground">Export Architecture & Impact Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-5 py-3 border-b border-border/50 bg-surface-raised flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormat('markdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                format === 'markdown'
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Markdown (.md)
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                format === 'json'
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" /> JSON (.json)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-card hover:bg-slate-200 dark:hover:bg-slate-800 text-foreground border border-border transition-all cursor-pointer shadow-sm"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer shadow-md"
            >
              <Download className="h-3.5 w-3.5" />
              Download File
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          <pre className="text-xs font-mono text-cyan-300 whitespace-pre-wrap leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
