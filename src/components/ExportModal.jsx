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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-surface-card shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-bold text-foreground">Export Architecture & Impact Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-5 py-2.5 border-b border-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-0.5 bg-surface-raised rounded-md border border-border">
            <button
              onClick={() => setFormat('markdown')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                format === 'markdown'
                  ? 'bg-surface-card text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Markdown (.md)
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                format === 'json'
                  ? 'bg-surface-card text-foreground shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" /> JSON (.json)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="btn-secondary text-xs py-1 px-2.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="btn-primary text-xs py-1 px-3"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Preview */}
        <div className="flex-1 overflow-auto p-4 bg-surface-subtle border-t border-border">
          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
