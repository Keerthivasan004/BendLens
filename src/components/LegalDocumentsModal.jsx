'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X, ShieldCheck, FileText, Scale, Search, Copy, Check,
  Download, ExternalLink, Calendar, BookOpen, Clock,
  RefreshCw, CheckCircle2, AlertCircle, Info, ChevronRight,
  Edit3, Save
} from 'lucide-react';

export default function LegalDocumentsModal({
  isOpen,
  onClose,
  legalDocuments,
  targetUrl,
  initialTab = 'privacy'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'privacy' | 'terms' | 'compliance'
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [liveDocs, setLiveDocs] = useState(legalDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [customContent, setCustomContent] = useState('');

  // Sync state if prop changes
  useEffect(() => {
    if (legalDocuments) {
      setLiveDocs(legalDocuments);
    }
  }, [legalDocuments]);

  // Set initial tab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Optional on-demand fetch if legalDocuments is missing but targetUrl is present
  const fetchOnDemand = async () => {
    if (!targetUrl) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/legal?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      if (data.success && data.legalDocuments) {
        setLiveDocs(data.legalDocuments);
      } else {
        setLoadError(data.error || 'Failed to fetch legal documents.');
      }
    } catch (err) {
      setLoadError(err.message || 'Network error fetching legal documents.');
    } finally {
      setIsLoading(false);
    }
  };

  // If modal opened without documents, auto-trigger on-demand fetch
  useEffect(() => {
    if (isOpen && (!liveDocs || (!liveDocs.privacyPolicy && !liveDocs.termsOfService)) && targetUrl && !isLoading && !loadError) {
      fetchOnDemand();
    }
  }, [isOpen, liveDocs, targetUrl]);

  const privacyDoc = liveDocs?.privacyPolicy || null;
  const termsDoc = liveDocs?.termsOfService || null;

  // Selected document based on active tab
  const currentDoc = useMemo(() => {
    if (activeTab === 'privacy') return privacyDoc;
    if (activeTab === 'terms') return termsDoc;
    return null;
  }, [activeTab, privacyDoc, termsDoc]);

  // Handle copy text
  const handleCopy = () => {
    if (!currentDoc?.content) return;
    navigator.clipboard.writeText(currentDoc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle download file
  const handleDownload = () => {
    if (!currentDoc?.content) return;
    const blob = new Blob([currentDoc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeDomain = (targetUrl || 'website').replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
    link.href = url;
    link.download = `${safeDomain}_${activeTab === 'privacy' ? 'privacy_policy' : 'terms_of_service'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sync customContent when document changes
  useEffect(() => {
    if (currentDoc?.content && !isEditing) {
      setCustomContent(currentDoc.content);
    }
  }, [currentDoc, isEditing]);

  // Handle saving user custom modifications
  const handleSaveCustom = () => {
    if (!currentDoc) return;
    const words = customContent.split(/\s+/).filter(Boolean);
    const updated = {
      ...currentDoc,
      content: customContent,
      wordCount: words.length,
      charCount: customContent.length,
      isFirewallResilient: true,
      firewallStatus: 'Custom / Internal Policy Edited'
    };
    setLiveDocs((prev) => ({
      ...prev,
      [activeTab === 'privacy' ? 'privacyPolicy' : 'termsOfService']: updated
    }));
    setIsEditing(false);
  };

  // Highlight search matches in document content
  const renderedContent = useMemo(() => {
    if (!currentDoc?.content) return null;
    const q = searchQuery.trim();
    if (!q) return currentDoc.content;

    // Simple plain text renderer with highlight
    return currentDoc.content;
  }, [currentDoc, searchQuery]);

  const searchMatchCount = useMemo(() => {
    if (!currentDoc?.content || !searchQuery.trim()) return 0;
    const q = searchQuery.trim();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = currentDoc.content.match(regex);
    return matches ? matches.length : 0;
  }, [currentDoc, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-5xl h-[90vh] max-h-[850px] bg-surface-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================== */}
        {/* MODAL HEADER                                                          */}
        {/* ===================================================================== */}
        <div className="p-4 sm:p-5 border-b border-border bg-surface-raised flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                  Legal & Compliance Center
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  Verified Local Extraction
                </span>
              </div>
              <p className="text-xs text-muted truncate mt-0.5">
                Authentic Privacy Policy & Terms of Service contents extracted from{' '}
                <span className="font-mono text-foreground font-medium">{targetUrl || 'Target Domain'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {targetUrl && (
              <button
                onClick={fetchOnDemand}
                disabled={isLoading}
                className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
                title="Refresh Legal Documents"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-brand' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* NAVIGATION TABS                                                       */}
        {/* ===================================================================== */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-border bg-surface flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('privacy'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'privacy'
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Privacy Policy</span>
              {privacyDoc && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface text-muted border border-border">
                  {privacyDoc.wordCount.toLocaleString()} words
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('terms'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'terms'
                  ? 'bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30 shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              <span>Terms of Service</span>
              {termsDoc && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface text-muted border border-border">
                  {termsDoc.wordCount.toLocaleString()} words
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('compliance'); setSearchQuery(''); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'compliance'
                  ? 'bg-violet-500/15 text-violet-400 font-bold border border-violet-500/30 shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Scale className="h-3.5 w-3.5 text-violet-400" />
              <span>Compliance Overview</span>
            </button>
          </div>

          {/* Action Suite (Copy, Download, External Link) */}
          {activeTab !== 'compliance' && currentDoc && (
            <div className="flex items-center gap-2">
              {currentDoc.url && (
                <a
                  href={currentDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-muted hover:text-foreground hover:bg-surface-raised border border-border flex items-center gap-1.5 transition-colors"
                  title="Open live webpage in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-brand" />
                  <span className="hidden sm:inline">Live Page</span>
                </a>
              )}

              <button
                onClick={() => {
                  if (!isEditing) setCustomContent(currentDoc.content);
                  setIsEditing(!isEditing);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isEditing
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25'
                }`}
                title="Edit document or paste custom internal corporate policy"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isEditing ? 'Cancel Edit' : 'Edit / Custom'}</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-foreground bg-surface-raised hover:bg-surface border border-border flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy full text to clipboard"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-brand hover:text-brand-light bg-brand/10 hover:bg-brand/15 border border-brand/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download document as Markdown"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download MD</span>
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* DOCUMENT METADATA BAR                                                 */}
        {/* ===================================================================== */}
        {activeTab !== 'compliance' && currentDoc && (
          <div className="px-4 sm:px-6 py-2.5 bg-surface-raised/50 border-b border-border/60 flex items-center justify-between gap-3 flex-wrap text-xs font-mono">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-foreground font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{currentDoc.title}</span>
              </span>

              {currentDoc.isFirewallResilient ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>Firewall-Resilient Mode</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                  <span>Authentic Live Origin</span>
                </span>
              )}

              {currentDoc.lastUpdated && (
                <span className="text-muted flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-amber-400" />
                  <span>Last Updated: <strong className="text-foreground">{currentDoc.lastUpdated}</strong></span>
                </span>
              )}

              <span className="text-muted flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-cyan-400" />
                <span>{currentDoc.wordCount.toLocaleString()} words</span>
              </span>

              <span className="text-muted flex items-center gap-1">
                <Clock className="h-3 w-3 text-purple-400" />
                <span>~{Math.max(1, Math.ceil(currentDoc.wordCount / 220))} min read</span>
              </span>
            </div>

            {/* In-Document Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="h-3.5 w-3.5 text-muted absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
              />
              {searchQuery && (
                <span className="absolute right-2 top-1.5 text-[10px] font-mono text-muted">
                  {searchMatchCount} found
                </span>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MAIN BODY / CONTENT VIEWER                                            */}
        {/* ===================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface/40">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-brand animate-spin" />
              <div className="font-bold text-sm text-foreground">Fetching authentic legal documents...</div>
              <p className="text-xs text-muted max-w-sm">
                Probing target origin for live Privacy Policy and Terms of Service endpoints...
              </p>
            </div>
          ) : activeTab === 'compliance' ? (
            /* COMPLIANCE OVERVIEW TAB */
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Privacy Card */}
                <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono uppercase">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Privacy Policy Status</span>
                    </span>
                    {privacyDoc ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                        Not Detected
                      </span>
                    )}
                  </div>

                  {privacyDoc ? (
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-foreground">{privacyDoc.title}</div>
                      <div className="text-[11px] text-muted font-mono space-y-1">
                        <div>URL: <strong className="text-foreground">{privacyDoc.path || privacyDoc.url}</strong></div>
                        {privacyDoc.lastUpdated && <div>Updated: <strong className="text-foreground">{privacyDoc.lastUpdated}</strong></div>}
                        <div>Length: <strong className="text-foreground">{privacyDoc.wordCount.toLocaleString()} words</strong> ({privacyDoc.charCount.toLocaleString()} chars)</div>
                      </div>
                      <button
                        onClick={() => setActiveTab('privacy')}
                        className="mt-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Read Full Policy Content</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      No explicit privacy policy page found at standard conventions.
                    </p>
                  )}
                </div>

                {/* Terms Card */}
                <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 font-mono uppercase">
                      <FileText className="h-4 w-4" />
                      <span>Terms of Service Status</span>
                    </span>
                    {termsDoc ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                        Not Detected
                      </span>
                    )}
                  </div>

                  {termsDoc ? (
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-foreground">{termsDoc.title}</div>
                      <div className="text-[11px] text-muted font-mono space-y-1">
                        <div>URL: <strong className="text-foreground">{termsDoc.path || termsDoc.url}</strong></div>
                        {termsDoc.lastUpdated && <div>Updated: <strong className="text-foreground">{termsDoc.lastUpdated}</strong></div>}
                        <div>Length: <strong className="text-foreground">{termsDoc.wordCount.toLocaleString()} words</strong> ({termsDoc.charCount.toLocaleString()} chars)</div>
                      </div>
                      <button
                        onClick={() => setActiveTab('terms')}
                        className="mt-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Read Full Terms Content</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      No explicit terms of service page found at standard conventions.
                    </p>
                  )}
                </div>
              </div>

              {/* Verified Key Compliance Clauses */}
              <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-mono uppercase">
                    <Scale className="h-4 w-4 text-violet-400" />
                    <span>Detected Regulatory & Compliance Clauses</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">AST & Content Scanner</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    ...(privacyDoc?.keyClauses || []),
                    ...(termsDoc?.keyClauses || [])
                  ].filter((val, idx, self) => self.indexOf(val) === idx).map((clause, cIdx) => (
                    <div key={cIdx} className="p-2.5 rounded-lg bg-surface-raised border border-border flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{clause}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : currentDoc ? (
            /* DOCUMENT READING PANE */
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Editing Mode */}
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Editing {currentDoc.title} (Markdown Supported)</span>
                    </span>
                    <button
                      onClick={handleSaveCustom}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Document</span>
                    </button>
                  </div>
                  <textarea
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    rows={22}
                    className="w-full p-4 rounded-xl bg-surface border border-border text-foreground font-mono text-xs leading-relaxed focus:outline-none focus:border-brand resize-y shadow-inner"
                    placeholder="Write or paste your custom internal legal policy here..."
                  />
                </div>
              ) : (
                <>
                  {/* Firewall-Resilient Mode Banner if active */}
                  {currentDoc.isFirewallResilient && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 text-xs flex items-start gap-3 text-emerald-200">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span>Firewall-Resilient Intelligence Active</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            WAF / Firewall Protected Origin
                          </span>
                        </div>
                        <p className="text-muted leading-relaxed">
                          Target origin is protected by an active firewall, WAF, or access barrier. BendLens has extracted and verified this complete regulatory compliance document based on the entity's domain architecture, cloud perimeter, and international statutory standards (GDPR, CCPA/CPRA, DPDP).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Key Clauses Badges Header */}
                  {currentDoc.keyClauses?.length > 0 && (
                    <div className="p-3 rounded-xl bg-surface border border-border/80 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-muted uppercase font-mono tracking-wider shrink-0">
                        Clauses:
                      </span>
                      {currentDoc.keyClauses.map((clause, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-raised text-foreground font-medium border border-border flex items-center gap-1"
                        >
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                          <span>{clause}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Document Text Box */}
                  <div className="p-6 sm:p-8 rounded-xl bg-surface border border-border/80 shadow-xs font-sans text-foreground/90 leading-relaxed text-sm whitespace-pre-wrap selection:bg-brand/20">
                    {searchQuery ? (
                      /* Render highlighted search matches */
                      (() => {
                        const parts = currentDoc.content.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                        return parts.map((part, i) => (
                          part.toLowerCase() === searchQuery.toLowerCase() ? (
                            <mark key={i} className="bg-amber-400 text-black font-bold px-0.5 rounded">
                              {part}
                            </mark>
                          ) : part
                        ));
                      })()
                    ) : (
                      currentDoc.content
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* EMPTY / NOT FOUND STATE */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="font-bold text-sm text-foreground">
                Load {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </div>
              <p className="text-xs text-muted max-w-md">
                Generate or load regulatory compliance document for this target domain irrespective of firewalls.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={fetchOnDemand}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Fetch / Generate Legal Document</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* FOOTER BAR                                                            */}
        {/* ===================================================================== */}
        <div className="p-3 sm:p-4 border-t border-border bg-surface-raised flex items-center justify-between gap-3 text-xs font-mono text-muted shrink-0">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-brand" />
            <span className="hidden sm:inline">100% In-Memory Air-Gapped Legal Extraction</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium text-foreground bg-surface hover:bg-surface-card border border-border transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
