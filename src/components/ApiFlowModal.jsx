'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Workflow, ArrowRight, ArrowDown, Search, Filter, Sparkles, Radio, Layers, 
  Database, Key, Copy, Check, Zap, Play, Pause, Download, 
  Maximize2, Minimize2, RotateCcw, Eye, Code2, Server, Globe, 
  Activity, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Webhook,
  HardDrive, ShoppingBag, Package, CreditCard, Users, ArrowUpRight,
  ZoomIn, ZoomOut, Compass, ExternalLink, FolderGit2, GitBranch
} from 'lucide-react';

function getDomainBadge(domain) {
  const d = (domain || '').toLowerCase();
  if (d.includes('auth') || d.includes('login') || d.includes('security')) {
    return { label: 'Auth & Security', icon: Key, color: 'text-amber-400 bg-amber-500/10 border-amber-500/25', stroke: '#f59e0b', fill: '#78350f' };
  }
  if (d.includes('user') || d.includes('account') || d.includes('profile')) {
    return { label: 'Users & Identity', icon: Users, color: 'text-blue-400 bg-blue-500/10 border-blue-500/25', stroke: '#3b82f6', fill: '#1e3a8a' };
  }
  if (d.includes('order') || d.includes('checkout') || d.includes('cart')) {
    return { label: 'Orders & Checkout', icon: ShoppingBag, color: 'text-purple-400 bg-purple-500/10 border-purple-500/25', stroke: '#a855f7', fill: '#581c87' };
  }
  if (d.includes('product') || d.includes('catalog') || d.includes('item')) {
    return { label: 'Catalog & Inventory', icon: Package, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', stroke: '#10b981', fill: '#064e3b' };
  }
  if (d.includes('payment') || d.includes('billing') || d.includes('stripe') || d.includes('invoice')) {
    return { label: 'Payments & Billing', icon: CreditCard, color: 'text-rose-400 bg-rose-500/10 border-rose-500/25', stroke: '#f43f5e', fill: '#881337' };
  }
  if (d.includes('webhook') || d.includes('event') || d.includes('callback')) {
    return { label: 'Webhooks & Events', icon: Webhook, color: 'text-pink-400 bg-pink-500/10 border-pink-500/25', stroke: '#ec4899', fill: '#831843' };
  }
  if (d.includes('health') || d.includes('metric') || d.includes('ping') || d.includes('status')) {
    return { label: 'Health & Diagnostics', icon: Activity, color: 'text-teal-400 bg-teal-500/10 border-teal-500/25', stroke: '#14b8a6', fill: '#134e4a' };
  }
  if (d.includes('file') || d.includes('upload') || d.includes('media') || d.includes('asset')) {
    return { label: 'Storage & Assets', icon: HardDrive, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25', stroke: '#06b6d4', fill: '#164e63' };
  }
  if (d.includes('formation') || d.includes('llc') || d.includes('corp')) {
    return { label: 'Corporate Services', icon: ShieldCheck, color: 'text-sky-400 bg-sky-500/10 border-sky-500/25', stroke: '#0284c7', fill: '#0c4a6e' };
  }
  return { label: 'Core Domain API', icon: Code2, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25', stroke: '#6366f1', fill: '#312e81' };
}

function getMethodBadge(method) {
  const m = (method || 'GET').toUpperCase();
  switch (m) {
    case 'GET':
      return { bg: '#064e3b', border: '#10b981', text: '#34d399', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    case 'POST':
      return { bg: '#78350f', border: '#f59e0b', text: '#fbbf24', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    case 'PUT':
    case 'PATCH':
      return { bg: '#1e3a8a', border: '#3b82f6', text: '#60a5fa', class: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    case 'DELETE':
      return { bg: '#881337', border: '#f43f5e', text: '#fb7185', class: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    case 'WS':
      return { bg: '#581c87', border: '#a855f7', text: '#c084fc', class: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    default:
      return { bg: '#1e293b', border: '#64748b', text: '#94a3b8', class: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
  }
}

const SERVICE_COLOR_THEMES = [
  { stroke: '#06b6d4', glow: '#22d3ee', badge: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', border: '#0891b2', name: 'cyan' },
  { stroke: '#a855f7', glow: '#c084fc', badge: 'text-purple-400 bg-purple-500/10 border-purple-500/30', border: '#7e22ce', name: 'purple' },
  { stroke: '#10b981', glow: '#34d399', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', border: '#059669', name: 'emerald' },
  { stroke: '#f59e0b', glow: '#fbbf24', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/30', border: '#d97706', name: 'amber' },
  { stroke: '#3b82f6', glow: '#60a5fa', badge: 'text-blue-400 bg-blue-500/10 border-blue-500/30', border: '#2563eb', name: 'blue' },
  { stroke: '#f43f5e', glow: '#fb7185', badge: 'text-rose-400 bg-rose-500/10 border-rose-500/30', border: '#e11d48', name: 'rose' },
  { stroke: '#6366f1', glow: '#818cf8', badge: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', border: '#4f46e5', name: 'indigo' },
  { stroke: '#14b8a6', glow: '#2dd4bf', badge: 'text-teal-400 bg-teal-500/10 border-teal-500/30', border: '#0d9488', name: 'teal' }
];

export default function ApiFlowModal({
  isOpen,
  onClose,
  endpoints = [],
  tables = [],
  diagrams = {},
  theme = 'dark',
  initialFocusedEndpoint = null,
  onSelectForImpact
}) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState('GRAPHICAL'); // 'GRAPHICAL' | 'COLUMNS' | 'MERMAID' | 'MATRIX'
  const [layoutOrientation, setLayoutOrientation] = useState('COMPACT'); // 'COMPACT' | 'HORIZONTAL' | 'VERTICAL'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('ALL');
  const [commFilter, setCommFilter] = useState('ALL'); // 'ALL' | 'AUTH' | 'LIFECYCLE' | 'DATABASE' | 'SUB' | 'ASYNC' | 'CASCADE' | 'WORKFLOW'
  const [currentPage, setCurrentPage] = useState(1);
  const [focusedEndpoint, setFocusedEndpoint] = useState(initialFocusedEndpoint);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [isTrafficSimulated, setIsTrafficSimulated] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState('');
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rAFRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialFocusedEndpoint) {
      setFocusedEndpoint(initialFocusedEndpoint);
    }
  }, [initialFocusedEndpoint]);

  // Reset to page 1 whenever filter or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedServiceFilter, selectedMethod, searchQuery, commFilter]);

  // Lock background body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Butter-smooth, non-passive mouse wheel & trackpad zooming
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !isOpen) return;

    const handleWheelZoom = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => Math.min(2.5, Math.max(0.25, parseFloat((prev * zoomFactor).toFixed(3)))));
    };

    el.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelZoom);
  }, [isOpen, viewMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Construct complete topological network graph with layout coordinates
  // Construct complete topological network graph with layout coordinates
  const flowGraph = useMemo(() => {
    if (!endpoints || endpoints.length === 0) {
      return {
        stages: [],
        nodes: [],
        stageApis: [],
        visibleServices: [],
        visibleEndpoints: [],
        links: [],
        canvasWidth: 1850,
        canvasHeight: 900,
        isFilteredService: false,
        stats: { total: 0, links: 0, domains: 0, apiServices: 0 }
      };
    }

    const nodeLookup = new Map();
    const domainSet = new Set();

    // 1. Ingress Gateway Node
    const gatewayNode = {
      id: 'gateway-ingress-node',
      method: 'GATEWAY',
      path: '/api/v1 (API Gateway Ingress)',
      kind: 'INGRESS',
      level: 'CRITICAL',
      domain: 'gateway',
      domainInfo: { label: 'Edge Router', icon: Globe, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25', stroke: '#06b6d4' },
      module: 'Ingress Proxy',
      connectedTables: [],
      upstreamCallers: [],
      downstreamTargets: []
    };
    nodeLookup.set(gatewayNode.id, gatewayNode);

    // 2. Discover authentic parent API Services & cluster endpoints
    // Intelligently group endpoints into genuine Services and Resource Branches
    const isSingleProjectApp = endpoints.length <= 20 && (!endpoints.some(e => e.module && !['api', 'default', ''].includes(e.module.toLowerCase())));
    
    const getCleanPath = (rawPath) => {
      const p = String(rawPath || '/').trim();
      return p.replace(/^\/api(\/v\d+)?/i, '') || p;
    };

    const getBranchInfo = (endpoint) => {
      const p = String(endpoint.path || '/');
      const pClean = getCleanPath(p);
      const segs = pClean.split('/').filter(Boolean);

      // 1. Business Formation specialized resources
      if (/business-formation/i.test(pClean)) {
        if (/c-corp/i.test(pClean)) {
          return { key: 'C-Corp Formation', shortKey: '/c-corp', color: '#f97316' };
        }
        if (/best-llc|advisory|review/i.test(pClean)) {
          return { key: 'LLC Advisory & Reviews', shortKey: '/advisory', color: '#38bdf8' };
        }
        if (/llc/i.test(pClean)) {
          return { key: 'LLC Formation', shortKey: '/llc', color: '#f59e0b' };
        }
        if (/s-corp/i.test(pClean)) {
          return { key: 'S-Corp Formation', shortKey: '/s-corp', color: '#10b981' };
        }
        if (/nonprofit/i.test(pClean)) {
          return { key: 'Non-Profit Formation', shortKey: '/nonprofit', color: '#a855f7' };
        }
        if (segs.length >= 2 && segs[0] === 'business-formation') {
          const sub = segs[1];
          const subTitle = sub.charAt(0).toUpperCase() + sub.slice(1).replace(/[-_]/g, ' ');
          return { key: `${subTitle} Formation`, shortKey: `/${sub}`, color: '#06b6d4' };
        }
        return { key: 'Business Formation Core', shortKey: '/business', color: '#06b6d4' };
      }

      // 2. Standard Application Domain Resources
      if (/auth|oauth|login|session|token|register/i.test(pClean)) {
        return { key: 'Authentication & Security', shortKey: '/auth', color: '#38bdf8' };
      }
      if (/user|account|profile|member/i.test(pClean)) {
        return { key: 'User Identity & Profiles', shortKey: '/users', color: '#6366f1' };
      }
      if (/order|checkout|cart/i.test(pClean)) {
        return { key: 'Orders & Checkout', shortKey: '/orders', color: '#10b981' };
      }
      if (/payment|billing|invoice|webhook|stripe/i.test(pClean)) {
        return { key: 'Payments & Billing', shortKey: '/payments', color: '#ec4899' };
      }
      if (/product|catalog|inventory|item/i.test(pClean)) {
        return { key: 'Catalog & Products', shortKey: '/products', color: '#a855f7' };
      }
      if (/health|ping|status|metrics/i.test(pClean)) {
        return { key: 'System Health & Telemetry', shortKey: '/health', color: '#14b8a6' };
      }

      // 3. Dynamic multi-segment resource fallback
      if (segs.length >= 2) {
        const lead = segs[1];
        const title = lead.charAt(0).toUpperCase() + lead.slice(1).replace(/[-_]/g, ' ');
        return { key: `${title} Resource`, shortKey: `/${lead}`, color: '#818cf8' };
      }

      const lead = segs[0] || 'core';
      const title = lead.charAt(0).toUpperCase() + lead.slice(1).replace(/[-_]/g, ' ');
      return { key: `${title} Resource`, shortKey: `/${lead}`, color: '#818cf8' };
    };

    const apiGroups = new Map();
    endpoints.forEach((ep, idx) => {
      const p = String(ep.path || '/');
      const method = String(ep.method || 'GET').toUpperCase();
      let apiName = ep.module || '';

      if (isSingleProjectApp) {
        apiName = ep.module && !['api', 'default', ''].includes(ep.module) 
          ? ep.module 
          : 'E-Commerce Core API';
      } else if (!apiName || apiName === 'api' || apiName === 'default') {
        const bInfo = getBranchInfo(ep);
        apiName = bInfo.key.includes('Formation') ? 'Business Formation Platform' : `${bInfo.key.split(' ')[0]} Service`;
      }

      if (!apiGroups.has(apiName)) {
        apiGroups.set(apiName, []);
      }

      const rawDomain = apiName.toLowerCase().replace(/[^a-z0-9]/g, '');
      domainSet.add(rawDomain);

      const branchInfo = getBranchInfo(ep);

      const nodeObj = {
        id: `ep-${idx}-${method}-${p.replace(/[^a-zA-Z0-9]/g, '_')}`,
        index: idx,
        method,
        path: p,
        rawPath: ep.path,
        kind: ep.kind || 'REST',
        level: ep.level || 'MEDIUM',
        domain: rawDomain,
        domainInfo: getDomainBadge(rawDomain),
        module: apiName,
        apiService: apiName,
        branchKey: branchInfo.key,
        branchShortKey: branchInfo.shortKey,
        branchColor: branchInfo.color,
        connectedTables: ep.connectedTables || [],
        upstreamCallers: [],
        downstreamTargets: []
      };

      apiGroups.get(apiName).push(nodeObj);
      nodeLookup.set(nodeObj.id, nodeObj);
    });

    // 3. Create Service Nodes with assigned distinct color themes
    const stageApis = [];
    let sIdx = 0;
    for (const [apiTitle, childEps] of apiGroups.entries()) {
      const theme = SERVICE_COLOR_THEMES[sIdx % SERVICE_COLOR_THEMES.length];
      const sNode = {
        id: `api-service-${sIdx}`,
        method: 'API SERVICE',
        path: apiTitle,
        kind: 'API_SERVICE',
        level: 'CRITICAL',
        domain: apiTitle.toLowerCase(),
        domainInfo: getDomainBadge(apiTitle),
        module: apiTitle,
        theme,
        totalEndpointsCount: childEps.length,
        childEndpoints: childEps,
        connectedTables: [],
        upstreamCallers: [],
        downstreamTargets: []
      };
      
      childEps.forEach((ep, epIdx) => {
        ep.indexInService = epIdx;
        ep.serviceTheme = theme;
      });

      stageApis.push(sNode);
      nodeLookup.set(sNode.id, sNode);
      sIdx++;
    }

    // 4. TRI-MODE AUTHENTIC VISUAL MESH ENGINE (COMPACT SCREEN-FIT, HORIZONTAL TREE, VERTICAL FLOW)
    const isCompact = layoutOrientation === 'COMPACT';
    const isHorizontal = layoutOrientation === 'HORIZONTAL';
    const isVertical = layoutOrientation === 'VERTICAL';

    const filterEp = (ep) => {
      if (selectedMethod !== 'ALL' && ep.method !== selectedMethod) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (ep.path || '').toLowerCase().includes(q) || (ep.module || '').toLowerCase().includes(q);
      }
      return true;
    };

    const getEpTier = (ep) => {
      const p = (ep.path || '').toLowerCase();
      const m = (ep.method || 'GET').toUpperCase();
      if (ep.kind === 'AUTH' || /auth|login|token|oauth|session|verify|register/i.test(p)) return 1;
      if (ep.kind === 'WEBHOOK' || ep.kind === 'WEBSOCKET' || /webhook|event|socket|stream|notify|callback/i.test(p) || m === 'DELETE') return 4;
      if (['POST', 'PUT', 'PATCH'].includes(m) || /create|start|init|new|submit|checkout|formation/i.test(p)) return 2;
      return 3;
    };

    const targetServices = stageApis;
    const visibleEndpoints = [];
    const allBranchNodes = [];
    const treeLines = [];
    const serviceClusters = [];

    let canvasWidth = 1100;
    let canvasHeight = 600;

    if (isCompact) {
      // =========================================================================
      // COMPACT SCREEN-FIT CANOPY LAYOUT (ZERO-SCROLL VIEWPORT OPTIMIZED)
      // Tier 1: Gateway Ingress Router (Top-center, Y = 20, Height = 48)
      // Tier 2: API Service Root (Top-center, Y = 82, Height = 54)
      // Tier 3: Resource Branches (Parallel side-by-side columns, Y = 164, Height = 36)
      // Tier 4: Endpoints nested directly under their Branch (Y >= 216, Height = 54, Gap = 8)
      // =========================================================================
      const COL_WIDTH = 220;
      const COL_GAP = 36;
      const EP_WIDTH = COL_WIDTH;
      const EP_HEIGHT = 54;
      const EP_GAP = 8;
      const BRANCH_HEIGHT = 36;
      const ROOT_HEIGHT = 54;
      const GATEWAY_HEIGHT = 48;

      const serviceMeta = targetServices.map((sNode) => {
        const childEps = (sNode.childEndpoints || []).filter(filterEp);
        const sortedChildEps = [...childEps].sort((a, b) => {
          const tierDiff = getEpTier(a) - getEpTier(b);
          if (tierDiff !== 0) return tierDiff;
          return (a.path || '').localeCompare(b.path || '');
        });

        const branchMap = new Map();
        sortedChildEps.forEach((ep) => {
          const bKey = ep.branchKey || 'General Resource';
          if (!branchMap.has(bKey)) branchMap.set(bKey, []);
          branchMap.get(bKey).push(ep);
        });

        const branchEntries = Array.from(branchMap.entries());
        const branchCount = Math.max(1, branchEntries.length);
        const clusterWidth = Math.max(480, branchCount * COL_WIDTH + Math.max(0, branchCount - 1) * COL_GAP + 48);
        return { sNode, sortedChildEps, branchEntries, branchCount, clusterWidth };
      });

      const maxClusterWidth = serviceMeta.reduce((max, sm) => Math.max(max, sm.clusterWidth), 720);
      canvasWidth = Math.max(980, maxClusterWidth + 80);

      const GATEWAY_WIDTH = Math.min(320, Math.max(220, Math.floor(canvasWidth * 0.26)));
      gatewayNode.width = GATEWAY_WIDTH;
      gatewayNode.height = GATEWAY_HEIGHT;
      gatewayNode.x = Math.floor((canvasWidth - GATEWAY_WIDTH) / 2);
      gatewayNode.y = 20;
      gatewayNode.outAnchor = { x: gatewayNode.x + GATEWAY_WIDTH / 2, y: gatewayNode.y + GATEWAY_HEIGHT };
      gatewayNode.inAnchor = { x: gatewayNode.x + GATEWAY_WIDTH / 2, y: gatewayNode.y };

      let currentClusterY = 82;

      serviceMeta.forEach(({ sNode, sortedChildEps, branchEntries, branchCount, clusterWidth }) => {
        sNode.branchesCount = branchCount;

        const clusterStartX = Math.max(32, Math.floor((canvasWidth - clusterWidth) / 2));
        const clusterStartY = currentClusterY;

        const rootWidth = Math.min(380, Math.max(260, Math.floor(clusterWidth * 0.42)));
        sNode.x = Math.floor(clusterStartX + (clusterWidth - rootWidth) / 2);
        sNode.y = clusterStartY;
        sNode.width = rootWidth;
        sNode.height = ROOT_HEIGHT;
        sNode.inAnchor = { x: sNode.x + rootWidth / 2, y: sNode.y };
        sNode.outAnchor = { x: sNode.x + rootWidth / 2, y: sNode.y + ROOT_HEIGHT };

        const branchY = sNode.y + ROOT_HEIGHT + 28;
        const firstEpY = branchY + BRANCH_HEIGHT + 16;
        const serviceBranches = [];
        let maxEpCountInBranch = 1;

        branchEntries.forEach(([branchKey, bEps], bIdx) => {
          maxEpCountInBranch = Math.max(maxEpCountInBranch, bEps.length);
          const colX = clusterStartX + 24 + bIdx * (COL_WIDTH + COL_GAP);

          const branchNode = {
            id: `branch-${sNode.id}-${branchKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
            branchKey,
            title: branchKey,
            shortKey: bEps[0]?.branchShortKey || `/${branchKey.toLowerCase().split(' ')[0]}`,
            count: bEps.length,
            x: colX,
            y: branchY,
            width: COL_WIDTH,
            height: BRANCH_HEIGHT,
            serviceId: sNode.id,
            serviceName: sNode.path,
            theme: sNode.theme,
            inAnchor: { x: colX + COL_WIDTH / 2, y: branchY },
            outAnchor: { x: colX + COL_WIDTH / 2, y: branchY + BRANCH_HEIGHT }
          };

          serviceBranches.push(branchNode);
          allBranchNodes.push(branchNode);
          nodeLookup.set(branchNode.id, branchNode);

          bEps.forEach((ep, epIdx) => {
            const epY = firstEpY + epIdx * (EP_HEIGHT + EP_GAP);
            ep.x = colX;
            ep.y = epY;
            ep.width = EP_WIDTH;
            ep.height = EP_HEIGHT;
            ep.parentBranchId = branchNode.id;
            ep.inAnchor = { x: colX, y: epY + EP_HEIGHT / 2 };
            ep.outAnchor = { x: colX + EP_WIDTH, y: epY + EP_HEIGHT / 2 };
            ep.topAnchor = { x: colX + EP_WIDTH / 2, y: epY };
            ep.bottomAnchor = { x: colX + EP_WIDTH / 2, y: epY + EP_HEIGHT };

            visibleEndpoints.push(ep);
          });

          if (bEps.length > 0) {
            const stemX = colX - 10;
            const branchBottomX = colX + 24;
            const branchBottomY = branchY + BRANCH_HEIGHT;
            const lastEpY = firstEpY + (bEps.length - 1) * (EP_HEIGHT + EP_GAP);

            const spinePath = `M ${branchBottomX} ${branchBottomY} Q ${stemX} ${branchBottomY + 8}, ${stemX} ${branchBottomY + 16} L ${stemX} ${lastEpY + EP_HEIGHT / 2}`;
            treeLines.push({
              id: `tree-spine-${branchNode.id}`,
              serviceName: sNode.path,
              sourceId: branchNode.id,
              targetId: branchNode.id,
              pathData: spinePath,
              color: sNode.theme?.stroke || '#06b6d4',
              isStem: true
            });

            bEps.forEach((ep, epIdx) => {
              const spurY = firstEpY + epIdx * (EP_HEIGHT + EP_GAP) + EP_HEIGHT / 2;
              const spurPath = `M ${stemX} ${spurY} L ${colX} ${spurY}`;
              treeLines.push({
                id: `tree-spur-${branchNode.id}->${ep.id}`,
                serviceName: sNode.path,
                sourceId: branchNode.id,
                targetId: ep.id,
                pathData: spurPath,
                junction: { x: stemX, y: spurY },
                color: sNode.theme?.stroke || '#06b6d4',
                isStem: false
              });
            });
          }
        });

        // Horizontal bus from Service Root to each branch top
        if (serviceBranches.length > 0) {
          const spineY = sNode.outAnchor.y + 14;
          const minX = serviceBranches[0].inAnchor.x;
          const maxX = serviceBranches[serviceBranches.length - 1].inAnchor.x;

          treeLines.push({
            id: `tree-root-trunk-${sNode.id}`,
            serviceName: sNode.path,
            sourceId: sNode.id,
            targetId: sNode.id,
            pathData: `M ${sNode.outAnchor.x} ${sNode.outAnchor.y} V ${spineY}`,
            junction: { x: sNode.outAnchor.x, y: spineY },
            color: sNode.theme?.stroke || '#06b6d4',
            isTrunk: true
          });

          if (serviceBranches.length > 1) {
            treeLines.push({
              id: `tree-root-bus-${sNode.id}`,
              serviceName: sNode.path,
              sourceId: sNode.id,
              targetId: sNode.id,
              pathData: `M ${minX} ${spineY} H ${maxX}`,
              color: sNode.theme?.stroke || '#06b6d4',
              isTrunk: true
            });
          }

          serviceBranches.forEach((bNode) => {
            treeLines.push({
              id: `tree-root->branch-${sNode.id}->${bNode.id}`,
              serviceName: sNode.path,
              sourceId: sNode.id,
              targetId: bNode.id,
              pathData: `M ${bNode.inAnchor.x} ${spineY} V ${bNode.inAnchor.y}`,
              junction: { x: bNode.inAnchor.x, y: spineY },
              color: sNode.theme?.stroke || '#06b6d4',
              isTrunk: true
            });
          });
        }

        const clusterBottomY = firstEpY + maxEpCountInBranch * (EP_HEIGHT + EP_GAP) + 14;
        const clusterTotalHeight = Math.max(200, (clusterBottomY - clusterStartY) + 14);

        serviceClusters.push({
          id: `cluster-${sNode.id}`,
          sNode,
          branches: serviceBranches,
          x: clusterStartX,
          y: clusterStartY - 10,
          width: clusterWidth,
          height: clusterTotalHeight + 10,
          endpointsCount: sortedChildEps.length
        });

        currentClusterY += clusterTotalHeight + 36;
      });

      canvasHeight = Math.max(540, currentClusterY + 24);

    } else if (isHorizontal) {
      // =========================================================================
      // HORIZONTAL TREE & DEDICATED RIGHT-GUTTER COMMUNICATION MESH
      // Level 0: Ingress Gateway (X = 60)
      // Level 1: API Service Root (X = 410)
      // Level 2: Resource Controller Branches (X = 790)
      // Level 3: Endpoints (X = 1150)
      // Level 4: Dedicated Right-Gutter Communication Mesh (X = 1420+)
      // =========================================================================
      const GATEWAY_X = 60;
      const ROOT_X = 410;
      const ROOT_WIDTH = 250;
      const ROOT_HEIGHT = 70;

      const BRANCH_X = 790;
      const BRANCH_WIDTH = 230;
      const BRANCH_HEIGHT = 44;

      const EP_X = 1150;
      const EP_WIDTH = 270;
      const EP_HEIGHT = 56;
      const EP_GAP = 22;

      let currentClusterY = 90;

      targetServices.forEach((sNode) => {
        const childEps = (sNode.childEndpoints || []).filter(filterEp);
        const sortedChildEps = [...childEps].sort((a, b) => {
          const tierDiff = getEpTier(a) - getEpTier(b);
          if (tierDiff !== 0) return tierDiff;
          return (a.path || '').localeCompare(b.path || '');
        });

        const branchMap = new Map();
        sortedChildEps.forEach((ep) => {
          const bKey = ep.branchKey || 'General Resource';
          if (!branchMap.has(bKey)) branchMap.set(bKey, []);
          branchMap.get(bKey).push(ep);
        });

        const branchEntries = Array.from(branchMap.entries());
        sNode.branchesCount = Math.max(1, branchEntries.length);

        const serviceBranches = [];
        let runningBranchY = currentClusterY + 36;

        branchEntries.forEach(([branchKey, bEps]) => {
          const spanHeight = Math.max(BRANCH_HEIGHT + 16, bEps.length * EP_HEIGHT + (bEps.length - 1) * EP_GAP);
          const branchCenterY = runningBranchY + Math.floor(spanHeight / 2);

          const branchNode = {
            id: `branch-${sNode.id}-${branchKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
            branchKey,
            title: branchKey,
            shortKey: bEps[0]?.branchShortKey || `/${branchKey.toLowerCase().split(' ')[0]}`,
            count: bEps.length,
            x: BRANCH_X,
            y: branchCenterY - Math.floor(BRANCH_HEIGHT / 2),
            width: BRANCH_WIDTH,
            height: BRANCH_HEIGHT,
            serviceId: sNode.id,
            serviceName: sNode.path,
            theme: sNode.theme,
            inAnchor: { x: BRANCH_X, y: branchCenterY },
            outAnchor: { x: BRANCH_X + BRANCH_WIDTH, y: branchCenterY }
          };

          serviceBranches.push(branchNode);
          allBranchNodes.push(branchNode);
          nodeLookup.set(branchNode.id, branchNode);

          let epTopY = runningBranchY + Math.floor((spanHeight - (bEps.length * EP_HEIGHT + (bEps.length - 1) * EP_GAP)) / 2);
          const currentBranchEps = [];

          bEps.forEach((ep) => {
            ep.x = EP_X;
            ep.y = epTopY;
            ep.width = EP_WIDTH;
            ep.height = EP_HEIGHT;
            ep.parentBranchId = branchNode.id;
            ep.inAnchor = { x: ep.x, y: ep.y + EP_HEIGHT / 2 };
            ep.outAnchor = { x: ep.x + ep.width, y: ep.y + EP_HEIGHT / 2 };
            ep.topAnchor = { x: ep.x + ep.width / 2, y: ep.y };
            ep.bottomAnchor = { x: ep.x + ep.width / 2, y: ep.y + EP_HEIGHT };

            visibleEndpoints.push(ep);
            currentBranchEps.push(ep);

            epTopY += EP_HEIGHT + EP_GAP;
          });

          // ORTHOGONAL HORIZONTAL TREE CONNECTOR (Branch -> Child Endpoints)
          // Eliminates all line bundling: exactly 1 stem leaves the branch, connects to a vertical
          // distributor spine, with clean horizontal fingers entering each child endpoint card.
          const spineBranchX = 1085;
          const branchOut = branchNode.outAnchor;
          const branchTheme = sNode.theme?.stroke || '#06b6d4';

          if (currentBranchEps.length === 1) {
            const ep = currentBranchEps[0];
            treeLines.push({
              id: `tree-branch->ep-${branchNode.id}->${ep.id}`,
              serviceName: sNode.path,
              sourceId: branchNode.id,
              targetId: ep.id,
              pathData: `M ${branchOut.x} ${branchOut.y} H ${ep.inAnchor.x}`,
              junction: { x: ep.inAnchor.x, y: ep.inAnchor.y },
              color: branchTheme,
              isStem: true
            });
          } else if (currentBranchEps.length > 1) {
            const minEpY = currentBranchEps[0].inAnchor.y;
            const maxEpY = currentBranchEps[currentBranchEps.length - 1].inAnchor.y;

            // 1. Single horizontal trunk stem from branch to distributor spine
            treeLines.push({
              id: `tree-branch-trunk-${branchNode.id}`,
              serviceName: sNode.path,
              sourceId: branchNode.id,
              targetId: branchNode.id,
              pathData: `M ${branchOut.x} ${branchOut.y} H ${spineBranchX}`,
              junction: { x: spineBranchX, y: branchOut.y },
              color: branchTheme,
              isTrunk: true
            });

            // 2. Vertical distributor spine
            treeLines.push({
              id: `tree-branch-spine-${branchNode.id}`,
              serviceName: sNode.path,
              sourceId: branchNode.id,
              targetId: branchNode.id,
              pathData: `M ${spineBranchX} ${minEpY} V ${maxEpY}`,
              color: branchTheme,
              isStem: true
            });

            // 3. Horizontal shelf finger into each endpoint card
            currentBranchEps.forEach((ep) => {
              treeLines.push({
                id: `tree-branch->ep-${branchNode.id}->${ep.id}`,
                serviceName: sNode.path,
                sourceId: branchNode.id,
                targetId: ep.id,
                pathData: `M ${spineBranchX} ${ep.inAnchor.y} H ${ep.inAnchor.x}`,
                junction: { x: spineBranchX, y: ep.inAnchor.y },
                color: branchTheme,
                isStem: true
              });
            });
          }

          runningBranchY += spanHeight + 48;
        });

        const clusterTotalHeight = Math.max(180, runningBranchY - currentClusterY + 12);

        sNode.x = ROOT_X;
        sNode.y = currentClusterY + Math.floor((clusterTotalHeight - ROOT_HEIGHT) / 2);
        sNode.width = ROOT_WIDTH;
        sNode.height = ROOT_HEIGHT;
        sNode.inAnchor = { x: ROOT_X, y: sNode.y + ROOT_HEIGHT / 2 };
        sNode.outAnchor = { x: ROOT_X + ROOT_WIDTH, y: sNode.y + ROOT_HEIGHT / 2 };

        // ORTHOGONAL HORIZONTAL TREE CONNECTOR (Service Root -> Resource Branches)
        const spineRootX = 725;
        const rootOut = sNode.outAnchor;
        const rootTheme = sNode.theme?.stroke || '#06b6d4';

        if (serviceBranches.length === 1) {
          const bNode = serviceBranches[0];
          treeLines.push({
            id: `tree-root->branch-${sNode.id}->${bNode.id}`,
            serviceName: sNode.path,
            sourceId: sNode.id,
            targetId: bNode.id,
            pathData: `M ${rootOut.x} ${rootOut.y} H ${bNode.inAnchor.x}`,
            junction: { x: bNode.inAnchor.x, y: bNode.inAnchor.y },
            color: rootTheme,
            isTrunk: true
          });
        } else if (serviceBranches.length > 1) {
          const minBranchY = serviceBranches[0].inAnchor.y;
          const maxBranchY = serviceBranches[serviceBranches.length - 1].inAnchor.y;

          // 1. Single horizontal trunk stem from Service Root to distributor spine
          treeLines.push({
            id: `tree-root-trunk-${sNode.id}`,
            serviceName: sNode.path,
            sourceId: sNode.id,
            targetId: sNode.id,
            pathData: `M ${rootOut.x} ${rootOut.y} H ${spineRootX}`,
            junction: { x: spineRootX, y: rootOut.y },
            color: rootTheme,
            isTrunk: true
          });

          // 2. Vertical distributor spine
          treeLines.push({
            id: `tree-root-spine-${sNode.id}`,
            serviceName: sNode.path,
            sourceId: sNode.id,
            targetId: sNode.id,
            pathData: `M ${spineRootX} ${minBranchY} V ${maxBranchY}`,
            color: rootTheme,
            isTrunk: true
          });

          // 3. Horizontal shelf fingers into each branch card
          serviceBranches.forEach((bNode) => {
            treeLines.push({
              id: `tree-root->branch-${sNode.id}->${bNode.id}`,
              serviceName: sNode.path,
              sourceId: sNode.id,
              targetId: bNode.id,
              pathData: `M ${spineRootX} ${bNode.inAnchor.y} H ${bNode.inAnchor.x}`,
              junction: { x: spineRootX, y: bNode.inAnchor.y },
              color: rootTheme,
              isTrunk: true
            });
          });
        }

        serviceClusters.push({
          id: `cluster-${sNode.id}`,
          sNode,
          branches: serviceBranches,
          x: ROOT_X - 32,
          y: currentClusterY,
          width: (EP_X + EP_WIDTH + 32) - (ROOT_X - 32),
          height: clusterTotalHeight,
          endpointsCount: sortedChildEps.length
        });

        currentClusterY += clusterTotalHeight + 80;
      });

      canvasWidth = Math.max(2000, EP_X + EP_WIDTH + 520);
      canvasHeight = Math.max(900, currentClusterY + 50);

      const gatewayHeight = Math.max(56, Math.min(380, 70 + targetServices.length * 40));
      gatewayNode.x = GATEWAY_X;
      gatewayNode.y = Math.max(80, Math.floor((canvasHeight - gatewayHeight) / 2));
      gatewayNode.width = 230;
      gatewayNode.height = gatewayHeight;
      gatewayNode.outAnchor = { x: gatewayNode.x + gatewayNode.width, y: gatewayNode.y + gatewayHeight / 2 };
      gatewayNode.inAnchor = { x: gatewayNode.x, y: gatewayNode.y + gatewayHeight / 2 };

    } else {
      // =========================================================================
      // VERTICAL HIERARCHICAL TREE & 2D MULTI-COLUMN COMMUNICATION MESH
      // Tier 1 (Top, Y = 50): Gateway Router (Centered horizontally)
      // Tier 2 (Middle, Y = 168): API Service Root Node (Centered horizontally)
      // Tier 3 (Main Canopy, Y >= 296): Resource Controller Branches in parallel columns
      // Tier 4 (Under Branches, Y >= 376): Endpoints hanging vertically directly under branch
      // =========================================================================
      const COL_WIDTH = 270;
      const COL_GAP = 52;
      const EP_WIDTH = COL_WIDTH;
      const EP_HEIGHT = 58;
      const EP_GAP = 18;
      const BRANCH_HEIGHT = 44;
      const ROOT_HEIGHT = 72;
      const GATEWAY_HEIGHT = 68;

      const serviceMeta = targetServices.map((sNode) => {
        const childEps = (sNode.childEndpoints || []).filter(filterEp);
        const sortedChildEps = [...childEps].sort((a, b) => {
          const tierDiff = getEpTier(a) - getEpTier(b);
          if (tierDiff !== 0) return tierDiff;
          return (a.path || '').localeCompare(b.path || '');
        });

        const branchMap = new Map();
        sortedChildEps.forEach((ep) => {
          const bKey = ep.branchKey || 'General Resource';
          if (!branchMap.has(bKey)) branchMap.set(bKey, []);
          branchMap.get(bKey).push(ep);
        });

        const branchEntries = Array.from(branchMap.entries());
        const branchCount = Math.max(1, branchEntries.length);
        const clusterWidth = Math.max(540, branchCount * COL_WIDTH + Math.max(0, branchCount - 1) * COL_GAP + 64);
        return { sNode, sortedChildEps, branchEntries, branchCount, clusterWidth };
      });

      const maxClusterWidth = serviceMeta.reduce((max, sm) => Math.max(max, sm.clusterWidth), 700);
      canvasWidth = Math.max(1600, maxClusterWidth + 160);

      const GATEWAY_WIDTH = Math.min(380, Math.max(280, Math.floor(canvasWidth * 0.22)));
      gatewayNode.width = GATEWAY_WIDTH;
      gatewayNode.height = GATEWAY_HEIGHT;
      gatewayNode.x = Math.floor((canvasWidth - GATEWAY_WIDTH) / 2);
      gatewayNode.y = 50;
      gatewayNode.outAnchor = { x: gatewayNode.x + GATEWAY_WIDTH / 2, y: gatewayNode.y + GATEWAY_HEIGHT };
      gatewayNode.inAnchor = { x: gatewayNode.x + GATEWAY_WIDTH / 2, y: gatewayNode.y };

      let currentClusterY = 168;

      serviceMeta.forEach(({ sNode, sortedChildEps, branchEntries, branchCount, clusterWidth }) => {
        sNode.branchesCount = branchCount;

        const clusterStartX = Math.max(60, Math.floor((canvasWidth - clusterWidth) / 2));
        const clusterStartY = currentClusterY;

        const rootWidth = Math.min(420, Math.max(280, Math.floor(clusterWidth * 0.45)));
        sNode.x = Math.floor(clusterStartX + (clusterWidth - rootWidth) / 2);
        sNode.y = clusterStartY + 48;
        sNode.width = rootWidth;
        sNode.height = ROOT_HEIGHT;
        sNode.inAnchor = { x: sNode.x + rootWidth / 2, y: sNode.y };
        sNode.outAnchor = { x: sNode.x + rootWidth / 2, y: sNode.y + ROOT_HEIGHT };

        const branchY = sNode.y + ROOT_HEIGHT + 64;
        const firstEpY = branchY + BRANCH_HEIGHT + 36;
        const serviceBranches = [];
        let maxEpCountInBranch = 1;

        branchEntries.forEach(([branchKey, bEps], bIdx) => {
          maxEpCountInBranch = Math.max(maxEpCountInBranch, bEps.length);
          const colX = clusterStartX + 32 + bIdx * (COL_WIDTH + COL_GAP);

          const branchNode = {
            id: `branch-${sNode.id}-${branchKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
            branchKey,
            title: branchKey,
            shortKey: bEps[0]?.branchShortKey || `/${branchKey.toLowerCase().split(' ')[0]}`,
            count: bEps.length,
            x: colX,
            y: branchY,
            width: COL_WIDTH,
            height: BRANCH_HEIGHT,
            serviceId: sNode.id,
            serviceName: sNode.path,
            theme: sNode.theme,
            inAnchor: { x: colX + COL_WIDTH / 2, y: branchY },
            outAnchor: { x: colX + COL_WIDTH / 2, y: branchY + BRANCH_HEIGHT }
          };

          serviceBranches.push(branchNode);
          allBranchNodes.push(branchNode);
          nodeLookup.set(branchNode.id, branchNode);

          const sx = sNode.outAnchor.x;
          const sy = sNode.outAnchor.y;
          const tx = branchNode.inAnchor.x;
          const ty = branchNode.inAnchor.y;
          const dy = (ty - sy) * 0.5;
          treeLines.push({
            id: `tree-root->branch-${sNode.id}->${branchNode.id}`,
            serviceName: sNode.path,
            sourceId: sNode.id,
            targetId: branchNode.id,
            pathData: `M ${sx} ${sy} C ${sx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`,
            junction: { x: tx, y: ty },
            color: sNode.theme?.stroke || '#06b6d4',
            isTrunk: true
          });

          bEps.forEach((ep, epIdx) => {
            const epY = firstEpY + epIdx * (EP_HEIGHT + EP_GAP);
            ep.x = colX;
            ep.y = epY;
            ep.width = EP_WIDTH;
            ep.height = EP_HEIGHT;
            ep.parentBranchId = branchNode.id;
            ep.inAnchor = { x: colX, y: epY + EP_HEIGHT / 2 };
            ep.outAnchor = { x: colX + EP_WIDTH, y: epY + EP_HEIGHT / 2 };
            ep.topAnchor = { x: colX + EP_WIDTH / 2, y: epY };
            ep.bottomAnchor = { x: colX + EP_WIDTH / 2, y: epY + EP_HEIGHT };

            visibleEndpoints.push(ep);
          });

          if (bEps.length > 0) {
            const stemX = colX - 16;
            const branchBottomX = colX + 32;
            const branchBottomY = branchY + BRANCH_HEIGHT;
            const lastEpY = firstEpY + (bEps.length - 1) * (EP_HEIGHT + EP_GAP);

            const spinePath = `M ${branchBottomX} ${branchBottomY} Q ${stemX} ${branchBottomY + 12}, ${stemX} ${branchBottomY + 22} L ${stemX} ${lastEpY + EP_HEIGHT / 2}`;
            treeLines.push({
              id: `tree-spine-${branchNode.id}`,
              serviceName: sNode.path,
              sourceId: branchNode.id,
              targetId: branchNode.id,
              pathData: spinePath,
              junction: { x: branchBottomX, y: branchBottomY },
              color: sNode.theme?.stroke || '#06b6d4',
              isStem: true
            });

            bEps.forEach((ep) => {
              const spurY = ep.y + EP_HEIGHT / 2;
              const spurPath = `M ${stemX} ${spurY} L ${ep.x} ${spurY}`;
              treeLines.push({
                id: `tree-spur-${branchNode.id}->${ep.id}`,
                serviceName: sNode.path,
                sourceId: branchNode.id,
                targetId: ep.id,
                pathData: spurPath,
                junction: { x: stemX, y: spurY },
                color: sNode.theme?.stroke || '#06b6d4',
                isStem: false
              });
            });
          }
        });

        const clusterBottomY = firstEpY + maxEpCountInBranch * (EP_HEIGHT + EP_GAP) + 24;
        const clusterTotalHeight = Math.max(260, (clusterBottomY - clusterStartY) + 24);

        serviceClusters.push({
          id: `cluster-${sNode.id}`,
          sNode,
          branches: serviceBranches,
          x: clusterStartX,
          y: clusterStartY,
          width: clusterWidth,
          height: clusterTotalHeight,
          endpointsCount: sortedChildEps.length
        });

        currentClusterY += clusterTotalHeight + 70;
      });

      canvasHeight = Math.max(900, currentClusterY + 40);
    }

    const visibleServices = targetServices;

    // 5. Construct Authentic Communication Links (Gateway Routing + Inter-Endpoint Communication)
    const links = [];
    const seenLinks = new Set();

    const addLink = (sourceId, targetId, type, label, color, startAnchor, endAnchor, themeName) => {
      const linkKey = `${sourceId}->${targetId}`;
      if (seenLinks.has(linkKey) || sourceId === targetId) return;
      seenLinks.add(linkKey);

      const src = nodeLookup.get(sourceId);
      const tgt = nodeLookup.get(targetId);
      if (src && tgt) {
        src.downstreamTargets.push({ target: tgt, type, label });
        tgt.upstreamCallers.push({ caller: src, type, label });
        links.push({
          id: `link-${links.length}`,
          sourceId,
          targetId,
          source: src,
          target: tgt,
          type,
          label,
          color,
          themeName: themeName || 'cyan',
          startAnchor: startAnchor || src.outAnchor,
          endAnchor: endAnchor || tgt.inAnchor
        });
      }
    };

    // A. Gateway routes to visible API Service Roots
    visibleServices.forEach((sNode, idx) => {
      if (isHorizontal) {
        const gwOutY = gatewayNode.y + 20 + (idx * (gatewayNode.height - 40)) / Math.max(1, visibleServices.length - 1);
        const sInY = sNode.y + sNode.height / 2;
        addLink(
          gatewayNode.id,
          sNode.id,
          'GATEWAY_ROUTING',
          `Routes traffic to ${sNode.path}`,
          sNode.theme?.stroke || '#06b6d4',
          { x: gatewayNode.x + gatewayNode.width, y: gwOutY },
          { x: sNode.x, y: sInY },
          sNode.theme?.name || 'cyan'
        );
      } else {
        const gwOutX = gatewayNode.x + 40 + (idx * (gatewayNode.width - 80)) / Math.max(1, visibleServices.length - 1);
        const gwOutY = gatewayNode.y + gatewayNode.height;
        const sInX = sNode.x + sNode.width / 2;
        const sInY = sNode.y;
        addLink(
          gatewayNode.id,
          sNode.id,
          'GATEWAY_ROUTING',
          `Routes traffic to ${sNode.path}`,
          sNode.theme?.stroke || '#06b6d4',
          { x: gwOutX, y: gwOutY },
          { x: sInX, y: sInY },
          sNode.theme?.name || 'cyan'
        );
      }
    });

    // B. Endpoint Communication Helper with Multi-Mode Intelligent Routing
    const addEndpointLink = (src, tgt, type, label, color, themeName) => {
      if (!src || !tgt || src.id === tgt.id) return;
      
      const linkIdx = links.length;
      let startAnchor, endAnchor;

      if (isHorizontal) {
        startAnchor = { x: src.x + src.width, y: src.y + 16 + ((linkIdx % 3) * 12) };
        endAnchor = { x: tgt.x + tgt.width, y: tgt.y + 16 + (((linkIdx + 1) % 3) * 12) };
      } else {
        if (src.x < tgt.x - 30) {
          startAnchor = { x: src.x + src.width, y: src.y + 18 + ((linkIdx % 3) * 10) };
          endAnchor = { x: tgt.x, y: tgt.y + 18 + (((linkIdx + 1) % 3) * 10) };
        } else if (src.x > tgt.x + 30) {
          startAnchor = { x: src.x, y: src.y + 18 + ((linkIdx % 3) * 10) };
          endAnchor = { x: tgt.x + tgt.width, y: tgt.y + 18 + (((linkIdx + 1) % 3) * 10) };
        } else {
          startAnchor = { x: src.x + src.width, y: src.y + 24 };
          endAnchor = { x: tgt.x + tgt.width, y: tgt.y + 24 };
        }
      }

      addLink(src.id, tgt.id, type, label, color, startAnchor, endAnchor, themeName);
    };

    // Group visible endpoints by service for intra-service communication discovery
    const serviceEpsMap = new Map();
    visibleEndpoints.forEach(ep => {
      const sKey = ep.apiService || 'default';
      if (!serviceEpsMap.has(sKey)) serviceEpsMap.set(sKey, []);
      serviceEpsMap.get(sKey).push(ep);
    });

    serviceEpsMap.forEach((epsInService) => {
      if (epsInService.length < 2) return;

      const authEps = epsInService.filter(ep => ep.kind === 'AUTH' || /auth|login|token|oauth|session|verify|register/i.test(ep.path));
      const mutateEps = epsInService.filter(ep => ['POST', 'PUT', 'PATCH'].includes(ep.method));
      const queryEps = epsInService.filter(ep => ep.method === 'GET' && !authEps.includes(ep));
      const webhookEps = epsInService.filter(ep => ep.kind === 'WEBHOOK' || /webhook|event|socket|stream|listener/i.test(ep.path));

      // Rule 1: Auth Gatekeepers validate tokens for mutating or core endpoints
      if (authEps.length > 0) {
        const primaryAuth = authEps.find(a => a.method === 'POST') || authEps[0];
        let targetEps = (mutateEps.length > 0 ? mutateEps : queryEps).filter(t => t.id !== primaryAuth.id).slice(0, 3);
        if (targetEps.length === 0) {
          targetEps = epsInService.filter(t => t.id !== primaryAuth.id).slice(0, 3);
        }
        targetEps.forEach(tgt => {
          addEndpointLink(
            primaryAuth,
            tgt,
            'AUTH_VALIDATION',
            'Validates Bearer Token ➔ Authorizes Execution',
            '#38bdf8',
            'cyan'
          );
        });
      }

      // Rule 2: Resource Lifecycle & State Handoff (Create/Mutate -> Read/Query)
      mutateEps.forEach(mutEp => {
        const mutTokens = (mutEp.path || '').toLowerCase().split('/').filter(Boolean);
        const relatedQueries = queryEps.filter(qEp => {
          if (qEp.id === mutEp.id) return false;
          const qTokens = (qEp.path || '').toLowerCase().split('/').filter(Boolean);
          return mutTokens.some(tok => tok.length > 3 && qTokens.includes(tok));
        });

        const targetQueries = relatedQueries.length > 0 ? relatedQueries.slice(0, 2) : queryEps.slice(0, 1);
        targetQueries.forEach(tgtQuery => {
          addEndpointLink(
            mutEp,
            tgtQuery,
            'RESOURCE_LIFECYCLE',
            'Initializes State ➔ Lifecycle Handoff',
            '#10b981',
            'emerald'
          );
        });
      });

      // Rule 3: Sub-Resource Hierarchical Delegation
      epsInService.forEach(srcEp => {
        const srcPath = (srcEp.path || '').replace(/\/$/, '');
        if (srcPath.length < 3) return;
        const subEps = epsInService.filter(tgtEp => {
          if (tgtEp.id === srcEp.id) return false;
          const tgtPath = tgtEp.path || '';
          return tgtPath.startsWith(srcPath + '/') || tgtPath.startsWith(srcPath + '?');
        });
        subEps.slice(0, 2).forEach(subEp => {
          addEndpointLink(
            srcEp,
            subEp,
            'SUB_RESOURCE_DELEGATION',
            'Delegates Sub-Resource Context',
            '#818cf8',
            'indigo'
          );
        });
      });

      // Rule 4: Shared Database Entity Data Bus
      epsInService.forEach(srcEp => {
        const srcWrites = (srcEp.connectedTables || []).filter(ct => 
          typeof ct === 'object' && ct !== null ? ct.action === 'WRITE' : srcEp.method !== 'GET'
        );
        if (srcWrites.length === 0) return;

        srcWrites.forEach(ct => {
          const tName = typeof ct === 'object' && ct !== null ? ct.name : ct;
          if (!tName) return;

          const readerEps = epsInService.filter(tgtEp => {
            if (tgtEp.id === srcEp.id) return false;
            return (tgtEp.connectedTables || []).some(tgtCt => {
              const tgtName = typeof tgtCt === 'object' && tgtCt !== null ? tgtCt.name : tgtCt;
              return tgtName === tName;
            });
          });

          readerEps.slice(0, 2).forEach(readerEp => {
            addEndpointLink(
              srcEp,
              readerEp,
              'SHARED_ENTITY_BUS',
              `Mutates Entity (${tName}) ➔ Syncs Read State`,
              '#c084fc',
              'purple'
            );
          });
        });
      });

      // Rule 5: Webhooks & Event Handlers
      webhookEps.forEach(whEp => {
        const targetDown = mutateEps.find(m => m.id !== whEp.id) || queryEps[0];
        if (targetDown) {
          addEndpointLink(
            whEp,
            targetDown,
            'ASYNC_EVENT_CALLBACK',
            'Async Event Callback ➔ Dispatches Ingestion',
            '#f43f5e',
            'rose'
          );
        }
      });

      // Rule 6: Logical Workflow Progression for Remaining Unconnected Endpoints
      epsInService.forEach((ep, idx) => {
        const hasDirectLinks = links.some(l => 
          (l.sourceId === ep.id || l.targetId === ep.id) && 
          l.type !== 'GATEWAY_ROUTING'
        );
        if (!hasDirectLinks) {
          const nextEp = epsInService[(idx + 1) % epsInService.length];
          if (nextEp && nextEp.id !== ep.id) {
            addEndpointLink(
              ep,
              nextEp,
              'WORKFLOW_STEP',
              'Advances Workflow Step',
              '#f59e0b',
              'amber'
            );
          }
        }
      });
    });

    // Rule 7: Cross-Service Transaction Cascades (When multiple services exist)
    if (stageApis.length >= 2) {
      for (let i = 0; i < stageApis.length - 1 && i < 4; i++) {
        const srcService = stageApis[i];
        const tgtService = stageApis[i + 1];
        const srcEp = visibleEndpoints.find(e => e.apiService === srcService.path && ['POST', 'PUT'].includes(e.method)) ||
                      visibleEndpoints.find(e => e.apiService === srcService.path);
        const tgtEp = visibleEndpoints.find(e => e.apiService === tgtService.path && e.method === 'GET') ||
                      visibleEndpoints.find(e => e.apiService === tgtService.path);
        if (srcEp && tgtEp && srcEp.id !== tgtEp.id) {
          addEndpointLink(
            srcEp,
            tgtEp,
            'CROSS_SERVICE_CASCADE',
            `Dispatches Payload to ${tgtService.path}`,
            '#a855f7',
            'purple'
          );
        }
      }
    }

    // Assign deterministic non-colliding lanes to intra-service and inter-service links
    let intraLaneCounter = 0;
    let crossLaneCounter = 0;

    links.forEach((l) => {
      if (l.type === 'GATEWAY_ROUTING') return;
      if (l.type === 'CROSS_SERVICE_CASCADE') {
        l.laneIndex = crossLaneCounter % 4;
        crossLaneCounter++;
      } else {
        l.laneIndex = intraLaneCounter % 8;
        intraLaneCounter++;
      }
    });

    const activeNodes = [gatewayNode, ...visibleServices, ...visibleEndpoints];
    const interEndpointCount = links.filter(l => l.type !== 'GATEWAY_ROUTING').length;

    const commCounts = {
      auth: links.filter(l => l.type === 'AUTH_VALIDATION').length,
      lifecycle: links.filter(l => l.type === 'RESOURCE_LIFECYCLE').length,
      db: links.filter(l => l.type === 'SHARED_ENTITY_BUS').length,
      sub: links.filter(l => l.type === 'SUB_RESOURCE_DELEGATION').length,
      async: links.filter(l => l.type === 'ASYNC_EVENT_CALLBACK').length,
      cascade: links.filter(l => l.type === 'CROSS_SERVICE_CASCADE').length,
      workflow: links.filter(l => l.type === 'WORKFLOW_STEP').length
    };

    const stages = isCompact
      ? [
          { id: 'INGRESS', title: 'Tier 1: Edge Ingress Gateway', x: 20, y: 12, width: canvasWidth - 40, height: 58 },
          { id: 'API_ROOT', title: `Tier 2: API Service Root (${stageApis.length} ${stageApis.length === 1 ? 'Service' : 'Services'})`, x: 20, y: 74, width: canvasWidth - 40, height: 64 },
          { id: 'BRANCHES_AND_ENDPOINTS', title: `Tier 3: Resource Branches & Communication Mesh (${allBranchNodes.length} Branches • ${visibleEndpoints.length} Endpoints • ${interEndpointCount} Flows)`, x: 20, y: 146, width: canvasWidth - 40, height: canvasHeight - 156 }
        ]
      : isHorizontal
      ? [
          { id: 'INGRESS', title: 'Edge Ingress Gateway', x: 36, y: 20, width: 280, height: canvasHeight - 40 },
          { id: 'API_ROOT', title: `API Service Root (${stageApis.length} ${stageApis.length === 1 ? 'Service' : 'Services'})`, x: 350, y: 20, width: 340, height: canvasHeight - 40 },
          { id: 'BRANCHES', title: `Resource Branches (${allBranchNodes.length} Branches)`, x: 740, y: 20, width: 320, height: canvasHeight - 40 },
          { id: 'ENDPOINTS', title: `Endpoints & Mesh (${visibleEndpoints.length} Endpoints • ${interEndpointCount} Flows)`, x: 1100, y: 20, width: canvasWidth - 1140, height: canvasHeight - 40 }
        ]
      : [
          { id: 'INGRESS', title: 'Tier 1: Edge Ingress Gateway & Security Router', x: 28, y: 20, width: canvasWidth - 56, height: 104 },
          { id: 'API_ROOT', title: `Tier 2: API Architecture & Service Root (${stageApis.length} ${stageApis.length === 1 ? 'Service' : 'Services'})`, x: 28, y: 136, width: canvasWidth - 56, height: 108 },
          { id: 'BRANCHES_AND_ENDPOINTS', title: `Tier 3: Resource Branches & Endpoints Mesh (${allBranchNodes.length} Branches • ${visibleEndpoints.length} Endpoints • ${interEndpointCount} Communication Flows)`, x: 28, y: 256, width: canvasWidth - 56, height: canvasHeight - 276 }
        ];

    return {
      stages,
      nodes: activeNodes,
      branchNodes: allBranchNodes,
      treeLines,
      stageApis,
      visibleServices,
      visibleEndpoints,
      serviceClusters,
      links,
      commCounts,
      canvasWidth,
      canvasHeight,
      stats: {
        total: endpoints.length,
        links: links.length,
        interEndpointLinks: interEndpointCount,
        domains: domainSet.size,
        apiServices: stageApis.length,
        resourceBranches: allBranchNodes.length
      }
    };
  }, [endpoints, tables, selectedServiceFilter, selectedMethod, searchQuery, layoutOrientation]);

  // Auto-fit to view on initial open or when scope/method filter, orientation, or window size changes
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const performFit = () => {
      const container = canvasRef.current;
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight || flowGraph.canvasWidth <= 0 || flowGraph.canvasHeight <= 0) return;

      const scaleX = (clientWidth - 48) / flowGraph.canvasWidth;
      const scaleY = (clientHeight - 48) / flowGraph.canvasHeight;
      const fitScale = Math.min(Math.max(0.28, Math.min(scaleX, scaleY)), 1.05);

      setZoom(fitScale);
      setPanOffset({
        x: Math.max(16, Math.floor((clientWidth - flowGraph.canvasWidth * fitScale) / 2)),
        y: Math.max(16, Math.floor((clientHeight - flowGraph.canvasHeight * fitScale) / 2))
      });
    };

    performFit();
    const timer = setTimeout(performFit, 60);

    let ro;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      ro = new ResizeObserver(() => {
        performFit();
      });
      ro.observe(canvasRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
    };
  }, [isOpen, selectedServiceFilter, selectedMethod, layoutOrientation, flowGraph.canvasWidth, flowGraph.canvasHeight]);

  const filteredNodes = useMemo(() => {
    return flowGraph.nodes;
  }, [flowGraph.nodes]);

  const activeFocusedNode = useMemo(() => {
    if (!focusedEndpoint) return null;
    if (typeof focusedEndpoint === 'object' && focusedEndpoint.id) {
      return flowGraph.nodes.find(n => n.id === focusedEndpoint.id) || focusedEndpoint;
    }
    const pathStr = typeof focusedEndpoint === 'string' ? focusedEndpoint : (focusedEndpoint.path || '');
    return flowGraph.nodes.find(n => n.path === pathStr || n.rawPath === pathStr) || null;
  }, [focusedEndpoint, flowGraph.nodes]);

  const hoveredNode = useMemo(() => {
    if (!hoveredNodeId) return null;
    return flowGraph.nodes.find(n => n.id === hoveredNodeId) || null;
  }, [hoveredNodeId, flowGraph.nodes]);

  // Mermaid compile if selected
  useEffect(() => {
    if (viewMode === 'MERMAID' && typeof window !== 'undefined' && window.mermaid) {
      const mermaidCode = diagrams?.apiFlow?.mermaid || 'flowchart LR\n    EMPTY["No API Flow Detected"]';
      const renderId = `modal-mermaid-${Date.now()}`;
      try {
        window.mermaid.render(renderId, mermaidCode).then(({ svg }) => {
          setMermaidSvg(svg);
        }).catch(err => {
          console.warn('Modal mermaid render error:', err);
        });
      } catch (e) {}
    }
  }, [viewMode, diagrams]);

  // Zoom / Pan handlers
  const handleZoomIn = () => setZoom(prev => Math.min(2.5, prev + 0.15));
  const handleZoomOut = () => setZoom(prev => Math.max(0.35, prev - 0.15));
  const handleResetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (!canvasRef.current) return;
    const { clientWidth, clientHeight } = canvasRef.current;
    const scaleX = (clientWidth - 80) / flowGraph.canvasWidth;
    const scaleY = (clientHeight - 80) / flowGraph.canvasHeight;
    const fitScale = Math.min(Math.max(0.24, Math.min(scaleX, scaleY)), 1.05);
    setZoom(fitScale);
    setPanOffset({
      x: Math.max(20, Math.floor((clientWidth - flowGraph.canvasWidth * fitScale) / 2)),
      y: Math.max(20, Math.floor((clientHeight - flowGraph.canvasHeight * fitScale) / 2))
    });
  };

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const nextX = e.clientX - dragStart.x;
    const nextY = e.clientY - dragStart.y;
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    rAFRef.current = requestAnimationFrame(() => {
      setPanOffset({ x: nextX, y: nextY });
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }
  };

  const handleExportSVG = () => {
    const svgEl = canvasRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BendLens-API-Flow-Graph.svg`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  };

  if (!isOpen || !mounted) return null;

  // Active Flow Inspection Breadcrumb Information
  const activeFocusOrHover = activeFocusedNode || hoveredNode;
  const activeServiceNode = activeFocusOrHover?.kind === 'API_SERVICE'
    ? activeFocusOrHover
    : flowGraph.stageApis.find(s => s.path === activeFocusOrHover?.apiService || s.childEndpoints?.some(ep => ep.id === activeFocusOrHover?.id));
  const activeEndpointNode = activeFocusOrHover && activeFocusOrHover.kind !== 'API_SERVICE' && activeFocusOrHover.method !== 'GATEWAY'
    ? activeFocusOrHover
    : null;

  const modalContent = (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[99999] w-screen h-screen bg-[#070d18] text-foreground flex flex-col overflow-hidden select-none animate-in fade-in duration-200"
      style={{ isolation: 'isolate' }}
    >
      {/* Hardware-Accelerated High-Performance SVG Animation Styles */}
      <style>{`
        @keyframes flowMarch {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .flow-dash-march {
          stroke-dasharray: 8 6;
          animation: flowMarch 1.2s linear infinite;
        }
        .flow-dash-fast {
          stroke-dasharray: 8 4;
          animation: flowMarch 0.7s linear infinite;
        }
      `}</style>

      {/* ===================================================================== */}
      {/* TOP BAR */}
      {/* ===================================================================== */}
      <div className="px-5 py-3 border-b border-slate-800 bg-[#091124] flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/25 via-blue-500/20 to-indigo-500/25 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
            <Workflow className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Interactive API Endpoint Flow Graph</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 uppercase tracking-wider">
                  Fullscreen Studio
                </span>
              </h2>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/35">
                {flowGraph.stats.apiServices || 1} API Trees
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold border border-blue-500/35">
                {flowGraph.stats.resourceBranches || 0} Resource Branches
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/35">
                {flowGraph.stats.total} Endpoints
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-bold border border-purple-500/35">
                {flowGraph.stats.interEndpointLinks || 0} Inter-Endpoint Links
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/35">
                {flowGraph.stats.links} Total Route Wires
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Hierarchical API Trees: Endpoints are organized by Resource Branches inside each API Service container, with clear inter-endpoint runtime communication wires.
            </p>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-750 text-xs font-semibold">
            <button
              onClick={() => setViewMode('GRAPHICAL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'GRAPHICAL'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>Visual Mesh</span>
            </button>
            <button
              onClick={() => setViewMode('COLUMNS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'COLUMNS'
                  ? 'bg-slate-800 text-white shadow-sm font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>Tiered Lanes</span>
            </button>
            <button
              onClick={() => setViewMode('MERMAID')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'MERMAID'
                  ? 'bg-slate-800 text-white shadow-sm font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5 text-purple-400" />
              <span>Mermaid Architecture</span>
            </button>
            <button
              onClick={() => setViewMode('MATRIX')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'MATRIX'
                  ? 'bg-slate-800 text-white shadow-sm font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Call Matrix</span>
            </button>
          </div>

          {/* Layout Orientation Switcher (Visual Mesh) */}
          {viewMode === 'GRAPHICAL' && (
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-750 text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => setLayoutOrientation('COMPACT')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutOrientation === 'COMPACT'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Screen-Fit View: Fits entire API tree & mesh into viewport without scrolling"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Screen Fit</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutOrientation('HORIZONTAL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutOrientation === 'HORIZONTAL'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Horizontal Tree (Left-to-Right Hierarchy: Gateway → API Root → Branches → Endpoints)"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Horizontal</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutOrientation('VERTICAL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  layoutOrientation === 'VERTICAL'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vertical Flow (Top-to-Bottom Multi-Tier Hierarchy)"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                <span>Vertical</span>
              </button>
            </div>
          )}

          {/* Live Traffic Toggle */}
          <button
            onClick={() => setIsTrafficSimulated(!isTrafficSimulated)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isTrafficSimulated
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-750'
            }`}
            title="Toggle animated request pulse simulation along communication links"
          >
            {isTrafficSimulated ? <Pause className="h-3.5 w-3.5 text-cyan-400" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Traffic Pulse</span>
          </button>

          {/* Fit to View */}
          <button
            onClick={handleFitToScreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-colors cursor-pointer shadow-xs"
            title="Auto-Fit and Center Graph in Viewport"
          >
            <Compass className="h-4 w-4" />
          </button>

          {/* Native Browser Fullscreen Toggle */}
          <button
            onClick={toggleNativeFullscreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-colors cursor-pointer shadow-xs"
            title={isNativeFullscreen ? 'Exit Browser Fullscreen' : 'Enter Native Monitor Fullscreen (F11)'}
          >
            {isNativeFullscreen ? <Minimize2 className="h-4 w-4 text-cyan-400" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Export SVG */}
          <button
            onClick={handleExportSVG}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-colors cursor-pointer shadow-xs"
            title="Download High-Resolution SVG Flow Diagram"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-750 hover:border-rose-500/30 transition-colors cursor-pointer ml-1"
            title="Close Fullscreen View (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* FILTER & SCOPE STRIP */}
      {/* ===================================================================== */}
      <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#060b17] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Service Scope Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Scope / Spotlight:
            </span>
            <button
              onClick={() => {
                setSelectedServiceFilter('ALL');
                handleFitToScreen();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedServiceFilter === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs font-bold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Workflow className="h-3.5 w-3.5 text-cyan-400" />
              <span>All Services (1 Image Diagram)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-200">
                {flowGraph.stats.total}
              </span>
            </button>
            {flowGraph.stageApis.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  const newFilter = selectedServiceFilter === s.path ? 'ALL' : s.path;
                  setSelectedServiceFilter(newFilter);
                  if (newFilter !== 'ALL') {
                    const cluster = (flowGraph.serviceClusters || []).find(c => c.sNode.id === s.id);
                    if (cluster && canvasRef.current) {
                      const { clientHeight } = canvasRef.current;
                      const targetY = Math.max(20, Math.floor((clientHeight / 2) - (cluster.y + cluster.height / 2) * zoom));
                      setPanOffset(prev => ({ ...prev, y: targetY }));
                    }
                  } else {
                    handleFitToScreen();
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  selectedServiceFilter === s.path
                    ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/45 shadow-xs font-bold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title={`Spotlight ${s.path} in 1-image diagram (Click again to show all)`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.theme?.stroke || '#06b6d4' }} />
                <span>{s.path}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {s.totalEndpointsCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Method Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Method Filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMethod(m)}
                className={`px-2 py-0.8 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  selectedMethod === m
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-48 sm:w-60">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter endpoint route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-750 focus:border-cyan-500 outline-none text-white placeholder:text-slate-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Communication Protocol Spotlight Filters */}
        {viewMode === 'GRAPHICAL' && (
          <div className="w-full pt-1.5 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mr-1">
                Communication Wire:
              </span>
              {[
                { id: 'ALL', label: 'All Communication Wires', count: flowGraph.stats.interEndpointLinks, color: 'text-white' },
                { id: 'AUTH', label: 'Auth Token', count: flowGraph.commCounts.auth, color: 'text-cyan-400', dot: '#38bdf8' },
                { id: 'LIFECYCLE', label: 'State Handoff', count: flowGraph.commCounts.lifecycle, color: 'text-emerald-400', dot: '#10b981' },
                { id: 'DATABASE', label: 'DB Entity Bus', count: flowGraph.commCounts.db, color: 'text-purple-400', dot: '#c084fc' },
                { id: 'SUB', label: 'Sub-Resource', count: flowGraph.commCounts.sub, color: 'text-indigo-400', dot: '#818cf8' },
                { id: 'ASYNC', label: 'Async Events', count: flowGraph.commCounts.async, color: 'text-rose-400', dot: '#f43f5e' },
                { id: 'CASCADE', label: 'Cross-Service', count: flowGraph.commCounts.cascade, color: 'text-fuchsia-400', dot: '#d946ef' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCommFilter(f.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    commFilter === f.id
                      ? 'bg-slate-700 text-white font-bold border border-slate-600 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                  }`}
                >
                  {f.dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.dot }} />}
                  <span className={f.color}>{f.label}</span>
                  {f.count > 0 && (
                    <span className="text-[9px] px-1 py-0.2 rounded-full bg-slate-800 text-slate-300 font-bold">
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="text-[10px] font-mono text-slate-400 hidden lg:flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-slate-500 rounded-full inline-block"></span> Tree Branch (Hierarchy)</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-cyan-400 rounded-full inline-block"></span> Wire (Traffic Protocol)</span>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MAIN VIEWPORT / CANVAS CONTAINER */}
      {/* ===================================================================== */}
      <div 
        ref={canvasRef}
        className="relative flex-1 w-full h-full bg-[#070d18] overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Real-time Live Flow Breadcrumb HUD (Shows active trace clearly) */}
        {viewMode === 'GRAPHICAL' && (
          <div className="absolute top-3 left-4 z-20 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-750 backdrop-blur-md shadow-xl text-xs font-mono max-w-[85vw] overflow-x-auto">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold shrink-0">
              <Globe className="h-3.5 w-3.5" />
              <span>Gateway</span>
            </span>
            <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
            <button
              onClick={() => {
                setSelectedServiceFilter('ALL');
                handleFitToScreen();
              }}
              className={`flex items-center gap-1.5 font-bold cursor-pointer transition-colors shrink-0 ${selectedServiceFilter !== 'ALL' ? 'text-indigo-300 hover:text-white' : 'text-slate-300'}`}
              title={selectedServiceFilter !== 'ALL' ? "Click to view all API services together in 1 image" : ""}
            >
              <Server className="h-3.5 w-3.5" />
              <span>{selectedServiceFilter !== 'ALL' ? selectedServiceFilter : `All ${flowGraph.stageApis.length} API Trees`}</span>
              {selectedServiceFilter !== 'ALL' && <span className="text-[10px] text-cyan-400 font-sans ml-1 underline">(Show All)</span>}
            </button>
            {activeEndpointNode && (
              <>
                {activeEndpointNode.branchKey && (
                  <>
                    <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
                    <span className="text-slate-400 font-mono text-[11px] shrink-0">
                      {activeEndpointNode.branchKey}
                    </span>
                  </>
                )}
                <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                  <span>{activeEndpointNode.method} {activeEndpointNode.path}</span>
                </span>
                {activeEndpointNode.downstreamTargets?.length > 0 && (
                  <>
                    <ArrowRight className="h-3 w-3 text-purple-400 shrink-0" />
                    <span className="flex items-center gap-1 text-purple-300 font-medium bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/30 max-w-xs truncate shrink-0">
                      <span>➔ {activeEndpointNode.downstreamTargets[0].target.method} {activeEndpointNode.downstreamTargets[0].target.path}</span>
                      <span className="text-[10px] text-purple-400/80 font-sans hidden sm:inline">({activeEndpointNode.downstreamTargets[0].label.split('➔')[0].trim()})</span>
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Unified Architecture 1-Image HUD & Communication Legend */}
        {viewMode === 'GRAPHICAL' && (
          <div className="absolute top-3 right-4 z-20 pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-750 backdrop-blur-md shadow-xl text-xs font-mono">
            <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full bg-slate-500 inline-block"></span>
                <span className="text-slate-400">Tree Branch</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full bg-cyan-400 inline-block"></span>
                <span className="text-cyan-300">Auth Token</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full bg-emerald-400 inline-block"></span>
                <span className="text-emerald-300">State Handoff</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full bg-purple-400 inline-block"></span>
                <span className="text-purple-300">DB Entity</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full bg-rose-400 inline-block"></span>
                <span className="text-rose-300">Async Event</span>
              </span>
            </div>
            <div className="xl:border-l xl:border-slate-800 xl:pl-2 flex items-center gap-1">
              <button
                onClick={handleFitToScreen}
                className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-sans font-semibold transition-all cursor-pointer flex items-center gap-1"
                title="Fit entire multi-service architecture into view"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Fit 1-Image</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW MODE 1: VISUAL GRAPH (SVG MESH) */}
        {viewMode === 'GRAPHICAL' && (
          flowGraph.nodes.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
                <Workflow className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">No API Endpoints Detected</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                Scan a backend repository, OpenAPI specification, or crawl a web application to visualize its inter-service communication flow and architecture.
              </p>
            </div>
          ) : (
            <div
              className="relative overflow-visible"
              style={{
                width: `${flowGraph.canvasWidth}px`,
                height: `${flowGraph.canvasHeight}px`,
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
                willChange: 'transform'
              }}
            >
              <svg
                width={flowGraph.canvasWidth}
                height={flowGraph.canvasHeight}
                className="absolute inset-0 pointer-events-auto"
              >
                <defs>
                  {/* Subtle Dot Matrix Pattern */}
                  <pattern id="dotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.2" fill="#1e293b" opacity="0.6" />
                  </pattern>

                  {/* Colored Arrowhead Markers for Each Service - Bold & High Visibility */}
                  <marker id="arrow-cyan" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#06b6d4" />
                  </marker>
                  <marker id="arrow-purple" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#c084fc" />
                  </marker>
                  <marker id="arrow-emerald" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#10b981" />
                  </marker>
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#f59e0b" />
                  </marker>
                  <marker id="arrow-blue" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#38bdf8" />
                  </marker>
                  <marker id="arrow-rose" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#f43f5e" />
                  </marker>
                  <marker id="arrow-indigo" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#6366f1" />
                  </marker>
                  <marker id="arrow-teal" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#14b8a6" />
                  </marker>
                  <marker id="arrow-violet" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#a855f7" />
                  </marker>
                  <marker id="arrow-pink" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 7 4.5 L 0 7.5 z" fill="#ec4899" />
                  </marker>
                  <marker id="arrow-active" viewBox="0 0 10 10" refX="7" refY="4.5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
                    <path d="M 0 1 L 8.5 4.5 L 0 8 z" fill="#38bdf8" />
                  </marker>
                </defs>

                {/* Background Dot Grid */}
                <rect width={flowGraph.canvasWidth} height={flowGraph.canvasHeight} fill="url(#dotGrid)" />

                {/* Stage Boundary Tiers & Headers */}
                {flowGraph.stages.map((stage) => (
                  <g key={stage.id}>
                    <rect
                      x={stage.x}
                      y={stage.y}
                      width={stage.width}
                      height={stage.height}
                      rx="16"
                      fill="#0b1329"
                      fillOpacity="0.25"
                      stroke="#1e293b"
                      strokeWidth="1.2"
                      strokeDasharray="5 5"
                    />
                    <text
                      x={stage.x + 20}
                      y={stage.y + 26}
                      fill="#94a3b8"
                      className="font-sans font-bold text-xs uppercase tracking-wider"
                    >
                      {stage.title}
                    </text>
                  </g>
                ))}

                {/* Visual Service Trees & Cluster Enclosure Boxes */}
                {(flowGraph.serviceClusters || []).map((cluster) => {
                  const s = cluster.sNode;
                  const isHovered = hoveredNodeId === s.id;
                  const isSelected = selectedServiceFilter === s.path;
                  const isDimmed = selectedServiceFilter !== 'ALL' && selectedServiceFilter !== s.path;

                  return (
                    <g 
                      key={cluster.id} 
                      opacity={isDimmed ? 0.35 : 1}
                      className="select-none"
                    >
                      {/* Cluster Background Container Enclosing API Root, Branches, and Endpoints */}
                      <rect
                        x={cluster.x}
                        y={cluster.y}
                        width={cluster.width}
                        height={cluster.height}
                        rx="16"
                        fill="#080e1c"
                        fillOpacity="0.75"
                        stroke={isSelected ? (s.theme?.stroke || '#06b6d4') : isHovered ? '#38bdf8' : '#1e293b'}
                        strokeWidth={isSelected ? 2 : 1.2}
                        strokeDasharray={isSelected ? 'none' : '6 4'}
                      />

                      {/* Cluster Header Tab */}
                      <g transform={`translate(${cluster.x + 16}, ${cluster.y + 24})`}>
                        <circle cx="6" cy="-4" r="5" fill={s.theme?.stroke || '#06b6d4'} />
                        <text
                          x="18"
                          y="0"
                          fill={isSelected ? '#38bdf8' : '#f8fafc'}
                          className="font-mono font-bold text-[12px] tracking-wide"
                        >
                          {s.path}
                        </text>
                        <text
                          x={cluster.width - 32}
                          y="0"
                          textAnchor="end"
                          fill="#94a3b8"
                          className="font-mono text-[10px]"
                        >
                          {cluster.endpointsCount} Endpoints • {cluster.branches?.length || 1} Resource Branches
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Structural Tree Hierarchy Guides (API Root -> Trunk Spine -> Resource Branches -> Branch Stems -> Endpoints) */}
                {(flowGraph.treeLines || []).map((tLine) => {
                  const isRelated = (!activeFocusedNode && !hoveredNodeId) ||
                    (activeFocusedNode && (activeFocusedNode.id === tLine.targetId || activeFocusedNode.id === tLine.sourceId || activeFocusedNode.apiService === tLine.serviceName || activeFocusedNode.parentBranchId === tLine.sourceId)) ||
                    (hoveredNodeId && (hoveredNodeId === tLine.targetId || hoveredNodeId === tLine.sourceId || hoveredNode?.apiService === tLine.serviceName || hoveredNode?.parentBranchId === tLine.sourceId));

                  return (
                    <g key={tLine.id} opacity={isRelated ? 1 : 0.22} className="pointer-events-none">
                      {/* Ambient Halo Underlay for Clear Visibility */}
                      <path
                        d={tLine.pathData}
                        fill="none"
                        stroke={tLine.color || '#38bdf8'}
                        strokeWidth={tLine.isTrunk ? "6.5" : tLine.isStem ? "5" : "3.8"}
                        strokeOpacity={isRelated ? 0.24 : 0.08}
                      />
                      {/* Main Sharp Hierarchy Conduit */}
                      <path
                        d={tLine.pathData}
                        fill="none"
                        stroke={tLine.color || '#38bdf8'}
                        strokeWidth={tLine.isTrunk ? "3" : tLine.isStem ? "2.5" : "2"}
                        strokeOpacity={isRelated ? (tLine.isTrunk ? 1 : 0.92) : 0.35}
                      />
                      {tLine.junction && (
                        <circle
                          cx={tLine.junction.x}
                          cy={tLine.junction.y}
                          r={tLine.isTrunk ? "4.2" : "3.2"}
                          fill={tLine.color || '#38bdf8'}
                          fillOpacity={isRelated ? 1 : 0.45}
                          stroke="#080e1c"
                          strokeWidth="1.2"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Resource Branch Nodes inside API Trees */}
                {(flowGraph.branchNodes || []).map((branch) => {
                  const isHovered = hoveredNodeId === branch.id;
                  const isFocused = activeFocusedNode && (activeFocusedNode.branchKey === branch.branchKey || activeFocusedNode.parentBranchId === branch.id) && activeFocusedNode.apiService === branch.serviceName;
                  const isDimmed = (activeFocusedNode || hoveredNodeId) && !isFocused && !isHovered && activeFocusedNode?.apiService !== branch.serviceName;

                  return (
                    <g
                      key={branch.id}
                      transform={`translate(${branch.x}, ${branch.y})`}
                      opacity={isDimmed ? 0.25 : 1}
                      className="select-none cursor-pointer"
                      onClick={() => {
                        const branchEp = flowGraph.visibleEndpoints.find(e => e.branchKey === branch.branchKey && e.apiService === branch.serviceName);
                        if (branchEp) {
                          setFocusedEndpoint(activeFocusedNode?.id === branchEp.id ? null : branchEp);
                        }
                      }}
                      onMouseEnter={() => setHoveredNodeId(branch.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      <rect
                        width={branch.width}
                        height={branch.height}
                        rx="8"
                        fill="#0b1426"
                        stroke={isFocused || isHovered ? (branch.theme?.stroke || '#06b6d4') : '#1e293b'}
                        strokeWidth={isFocused || isHovered ? 2 : 1}
                      />
                      {/* Branch indicator */}
                      <circle cx="16" cy="22" r="4.5" fill={branch.theme?.stroke || '#06b6d4'} fillOpacity="0.25" stroke={branch.theme?.stroke || '#06b6d4'} strokeWidth="1.2" />
                      <text
                        x="27"
                        y="26"
                        fill="#e2e8f0"
                        className="font-mono font-bold text-[11px]"
                      >
                        {branch.branchKey.length > 18 ? branch.branchKey.slice(0, 17) + '…' : branch.branchKey}
                      </text>
                      <rect
                        x={branch.width - 58}
                        y="12"
                        width="48"
                        height="20"
                        rx="5"
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="0.8"
                      />
                      <text
                        x={branch.width - 34}
                        y="25.5"
                        textAnchor="middle"
                        fill={branch.theme?.stroke || '#38bdf8'}
                        className="font-mono text-[9px] font-bold"
                      >
                        {branch.count} {branch.count === 1 ? 'route' : 'routes'}
                      </text>
                    </g>
                  );
                })}

                {/* Smooth, Dynamic Communication Flow Wires Between Endpoints */}
                {flowGraph.links.map((link) => {
                  const isSourceVisible = filteredNodes.some(n => n.id === link.sourceId);
                  const isTargetVisible = filteredNodes.some(n => n.id === link.targetId);
                  if (!isSourceVisible || !isTargetVisible) return null;

                  const sx = link.startAnchor ? link.startAnchor.x : link.source.outAnchor.x;
                  const sy = link.startAnchor ? link.startAnchor.y : link.source.outAnchor.y;
                  const tx = link.endAnchor ? link.endAnchor.x : link.target.inAnchor.x;
                  const ty = link.endAnchor ? link.endAnchor.y : link.target.inAnchor.y;

                  const isTrunk = link.type === 'GATEWAY_ROUTING';
                  const isHorizontalFlow = layoutOrientation === 'HORIZONTAL';
                  let pathData;
                  let midX, midY;

                  if (isTrunk) {
                    if (isHorizontalFlow) {
                      const spineGatewayX = 350;
                      const r = 8;
                      const isDown = ty >= sy;
                      if (Math.abs(ty - sy) <= r * 2) {
                        pathData = `M ${sx} ${sy} H ${tx}`;
                      } else if (isDown) {
                        pathData = `M ${sx} ${sy} H ${spineGatewayX - r} Q ${spineGatewayX} ${sy}, ${spineGatewayX} ${sy + r} V ${ty - r} Q ${spineGatewayX} ${ty}, ${spineGatewayX + r} ${ty} H ${tx}`;
                      } else {
                        pathData = `M ${sx} ${sy} H ${spineGatewayX - r} Q ${spineGatewayX} ${sy}, ${spineGatewayX} ${sy - r} V ${ty + r} Q ${spineGatewayX} ${ty}, ${spineGatewayX + r} ${ty} H ${tx}`;
                      }
                    } else if (Math.abs(sx - tx) <= 4) {
                      pathData = `M ${sx} ${sy} V ${ty}`;
                    } else {
                      const dy = Math.max(30, (ty - sy) * 0.45);
                      pathData = `M ${sx} ${sy} C ${sx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`;
                    }
                    midX = (sx + tx) / 2;
                    midY = (sy + ty) / 2;
                  } else if (link.type === 'CROSS_SERVICE_CASCADE') {
                    const bypassOffset = isHorizontalFlow
                      ? (60 + ((link.laneIndex || 0) % 4) * 36)
                      : (48 + ((link.laneIndex || 0) % 3) * 24);
                    const bypassX = Math.max(sx, tx) + bypassOffset;
                    pathData = `M ${sx} ${sy} C ${bypassX} ${sy}, ${bypassX} ${ty}, ${tx} ${ty}`;
                    midX = bypassX;
                    midY = (sy + ty) / 2;
                  } else if (isHorizontalFlow) {
                    // Orthogonal rounded right-bracket conduit in dedicated right-gutter lanes
                    const lane = (link.laneIndex || 0) % 8;
                    const gutterX = Math.max(sx, tx) + 40 + lane * 24;
                    const r = 10;
                    const isDown = ty >= sy;
                    if (Math.abs(ty - sy) <= r * 2) {
                      pathData = `M ${sx} ${sy} C ${gutterX} ${sy}, ${gutterX} ${ty}, ${tx} ${ty}`;
                    } else if (isDown) {
                      pathData = `M ${sx} ${sy} H ${gutterX - r} Q ${gutterX} ${sy}, ${gutterX} ${sy + r} V ${ty - r} Q ${gutterX} ${ty}, ${gutterX - r} ${ty} H ${tx}`;
                    } else {
                      pathData = `M ${sx} ${sy} H ${gutterX - r} Q ${gutterX} ${sy}, ${gutterX} ${sy - r} V ${ty + r} Q ${gutterX} ${ty}, ${gutterX - r} ${ty} H ${tx}`;
                    }
                    midX = gutterX;
                    midY = (sy + ty) / 2;
                  } else if (Math.abs(sx - tx) <= 40 || Math.abs((link.source?.x || 0) - (link.target?.x || 0)) <= 30) {
                    // Vertical/Compact intra-column siblings: lateral loop on right flank
                    const laneOffset = 10 + ((link.laneIndex || 0) % 3) * 7;
                    const loopX = Math.max(sx, tx) + laneOffset;
                    pathData = `M ${sx} ${sy} C ${loopX} ${sy}, ${loopX} ${ty}, ${tx} ${ty}`;
                    midX = loopX;
                    midY = (sy + ty) / 2;
                  } else if (sx < tx) {
                    // Vertical cross-column forward
                    const dx = Math.max(24, (tx - sx) * 0.45);
                    pathData = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
                    midX = (sx + tx) / 2;
                    midY = (sy + ty) / 2;
                  } else {
                    // Vertical cross-column backward
                    const dx = Math.max(24, (sx - tx) * 0.45);
                    pathData = `M ${sx} ${sy} C ${sx - dx} ${sy}, ${tx + dx} ${ty}, ${tx} ${ty}`;
                    midX = (sx + tx) / 2;
                    midY = (sy + ty) / 2;
                  }

                  // Communication protocol filtering
                  const matchesCommFilter = commFilter === 'ALL' ||
                    (commFilter === 'AUTH' && link.type === 'AUTH_VALIDATION') ||
                    (commFilter === 'LIFECYCLE' && link.type === 'RESOURCE_LIFECYCLE') ||
                    (commFilter === 'DATABASE' && link.type === 'SHARED_ENTITY_BUS') ||
                    (commFilter === 'SUB' && link.type === 'SUB_RESOURCE_DELEGATION') ||
                    (commFilter === 'ASYNC' && link.type === 'ASYNC_EVENT_CALLBACK') ||
                    (commFilter === 'CASCADE' && link.type === 'CROSS_SERVICE_CASCADE') ||
                    (commFilter === 'WORKFLOW' && link.type === 'WORKFLOW_STEP');

                  const isDirectlyActive = (activeFocusedNode && (activeFocusedNode.id === link.sourceId || activeFocusedNode.id === link.targetId)) ||
                                           (hoveredNodeId && (hoveredNodeId === link.sourceId || hoveredNodeId === link.targetId));
                  const isServiceActive = (hoveredNodeId && (link.sourceId === hoveredNodeId || link.target?.apiService === hoveredNode?.path)) ||
                                          (activeFocusedNode && (link.sourceId === activeFocusedNode.id || link.target?.apiService === activeFocusedNode?.path));
                  const isHighlighted = isDirectlyActive || isServiceActive;
                  const isDimmed = !matchesCommFilter || ((activeFocusedNode || hoveredNodeId) && !isHighlighted && !isTrunk);

                  return (
                    <g key={link.id} opacity={isDimmed ? 0.16 : 1} className="pointer-events-none">
                      {/* Ambient Neon Glow Underlay (Guarantees every line is clearly visible against dark canvas) */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={link.color}
                        strokeWidth={isHighlighted ? 9 : isTrunk ? 6 : 4.8}
                        strokeOpacity={isHighlighted ? 0.45 : isTrunk ? 0.26 : 0.22}
                      />

                      {/* Main Connecting Communication Wire - Solid, Bold, Vibrant */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={isHighlighted ? '#38bdf8' : link.color}
                        strokeWidth={isHighlighted ? 3.8 : isTrunk ? 3 : 2.6}
                        strokeOpacity={isHighlighted ? 1 : isTrunk ? 0.95 : 0.92}
                        strokeDasharray={isHighlighted ? '8 5' : 'none'}
                        markerEnd={isHighlighted ? 'url(#arrow-active)' : `url(#arrow-${link.themeName || 'cyan'})`}
                        className={isTrafficSimulated && isHighlighted ? 'flow-dash-march' : ''}
                      />

                      {/* Floating Link Relationship Badge on Direct Selection / Hover */}
                      {(isHighlighted || (matchesCommFilter && commFilter !== 'ALL')) && link.label && link.type !== 'GATEWAY_ROUTING' && (
                        <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none select-none">
                          {/* Vector Shadow Underlay (Zero software rasterization overhead) */}
                          <rect
                            x="-77"
                            y="-12"
                            width="154"
                            height="24"
                            rx="8"
                            fill="#000000"
                            fillOpacity="0.65"
                          />
                          <rect
                            x="-75"
                            y="-11"
                            width="150"
                            height="22"
                            rx="6"
                            fill="#091124"
                            stroke={link.color || '#38bdf8'}
                            strokeWidth="1.4"
                          />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fill="#f8fafc"
                            className="font-mono text-[9px] font-bold"
                          >
                            {link.label.length > 24 ? link.label.slice(0, 22) + '…' : link.label}
                          </text>
                        </g>
                      )}

                      {/* Traffic Pulse Particle Simulation along Communication Paths (Focused & Throttled for 60 FPS) */}
                      {isTrafficSimulated && (isTrunk || isHighlighted) && !isDimmed && (
                        <circle r="3.5" fill="#ffffff" stroke={link.color} strokeWidth="1.5">
                          <animateMotion
                            dur={isHighlighted ? '1.4s' : '2.8s'}
                            repeatCount="indefinite"
                            path={pathData}
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Interactive Node Cards */}
                {flowGraph.nodes.map((node) => {
                  const isVisible = filteredNodes.some(n => n.id === node.id);
                  if (!isVisible) return null;

                  const isFocused = activeFocusedNode && activeFocusedNode.id === node.id;
                  const isConnected = activeFocusedNode && (
                    activeFocusedNode.downstreamTargets?.some(dt => dt.target.id === node.id) ||
                    activeFocusedNode.upstreamCallers?.some(uc => uc.caller.id === node.id)
                  );
                  const isHovered = hoveredNodeId === node.id;
                  const isDimmed = (activeFocusedNode && !isFocused && !isConnected) || (hoveredNodeId && !isHovered && !isConnected && !isFocused);

                  const methodBadge = getMethodBadge(node.method);
                  const isServiceNode = node.kind === 'API_SERVICE';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => {
                        if (isServiceNode) {
                          const newFilter = selectedServiceFilter === node.path ? 'ALL' : node.path;
                          setSelectedServiceFilter(newFilter);
                          if (newFilter !== 'ALL') {
                            const cluster = (flowGraph.serviceClusters || []).find(c => c.sNode.id === node.id);
                            if (cluster && canvasRef.current) {
                              const { clientHeight } = canvasRef.current;
                              const targetY = Math.max(20, Math.floor((clientHeight / 2) - (cluster.y + cluster.height / 2) * zoom));
                              setPanOffset(prev => ({ ...prev, y: targetY }));
                            }
                          } else {
                            handleFitToScreen();
                          }
                        } else {
                          setFocusedEndpoint(isFocused ? null : node);
                        }
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="cursor-pointer group select-none"
                      opacity={isDimmed ? 0.25 : 1}
                    >
                      {/* Card Background Rectangle */}
                      <rect
                        width={node.width}
                        height={node.height}
                        rx="12"
                        fill={isServiceNode ? '#0b162c' : '#0e172a'}
                        stroke={
                          isFocused 
                            ? '#06b6d4' 
                            : isHovered 
                            ? '#38bdf8' 
                            : isConnected 
                            ? '#a855f7' 
                            : isServiceNode 
                            ? (node.theme?.border || '#334155') 
                            : '#1e293b'
                        }
                        strokeWidth={isFocused || isHovered ? 2.4 : isConnected ? 2 : 1.2}
                      />

                      {/* Top Left: Method / Kind Pill */}
                      <rect
                        x="10"
                        y="8"
                        width={isServiceNode ? 88 : node.method === 'GATEWAY' ? 64 : 46}
                        height="17"
                        rx="4"
                        fill={isServiceNode ? '#1e1b4b' : methodBadge.bg}
                        stroke={isServiceNode ? '#6366f1' : methodBadge.border}
                        strokeWidth="1"
                      />
                      <text
                        x={isServiceNode ? 54 : node.method === 'GATEWAY' ? 42 : 33}
                        y="20.5"
                        textAnchor="middle"
                        fill={isServiceNode ? '#a5b4fc' : methodBadge.text}
                        className="font-mono font-bold text-[10px]"
                      >
                        {isServiceNode ? 'API ROOT' : node.method}
                      </text>

                      {/* Top Right: Endpoints Count or Domain Badge */}
                      <text
                        x={node.width - 12}
                        y="20.5"
                        textAnchor="end"
                        fill={isServiceNode ? (node.theme?.stroke || '#38bdf8') : (node.domainInfo?.stroke || '#06b6d4')}
                        className="font-sans font-semibold text-[10px]"
                      >
                        {isServiceNode ? `${node.totalEndpointsCount} Endpoints` : node.domainInfo?.label}
                      </text>

                      {/* Center: Title / Route Path */}
                      <text
                        x="12"
                        y={node.height <= 56 ? (node.height - 18) : (isServiceNode ? 46 : 38)}
                        fill={isServiceNode ? '#e0e7ff' : '#f8fafc'}
                        className={`font-mono font-bold ${isServiceNode ? 'text-sm' : 'text-xs'}`}
                      >
                        {(node.path || '').slice(0, 30) + ((node.path || '').length > 30 ? '…' : '')}
                      </text>

                      {/* Bottom Row: Callers and Downstream Count */}
                      <text
                        x="12"
                        y={node.height - 7}
                        fill={node.theme?.stroke || '#06b6d4'}
                        className="font-mono text-[9px] font-semibold"
                      >
                        {isServiceNode 
                          ? (flowGraph.isFilteredService ? '← Active Service (Click to see All)' : `⚡ Tree Root ➔ ${node.branchesCount || 1} Branches`) 
                          : `↓ ${node.upstreamCallers?.length || 0} in`}
                      </text>
                      {!isServiceNode && node.method !== 'GATEWAY' && (
                        <text
                          x="64"
                          y={node.height - 7}
                          fill="#a855f7"
                          className="font-mono text-[9px] font-semibold"
                        >
                          → {node.downstreamTargets?.length || 0} out
                        </text>
                      )}

                      {node.level && !isServiceNode && node.method !== 'GATEWAY' && (
                        <text
                          x={node.width - 12}
                          y={node.height - 7}
                          textAnchor="end"
                          fill={node.level === 'HIGH' ? '#c084fc' : node.level === 'LOW' ? '#34d399' : '#60a5fa'}
                          className="font-mono text-[9px] font-bold"
                        >
                          {node.level}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )
        )}

        {/* VIEW MODE 2: TIERED COLUMNS */}
        {viewMode === 'COLUMNS' && (
          <div
            className="w-full h-full p-8 overflow-auto flex items-start gap-8 select-auto"
            style={{ minWidth: '1200px' }}
          >
            {flowGraph.stages.map((stage) => {
              const stageNodes = flowGraph.nodes.filter(n => {
                if (stage.id === 'INGRESS') return n.kind === 'INGRESS';
                if (stage.id === 'APIS' || stage.id === 'API_ROOT') return n.kind === 'API_SERVICE';
                return n.kind !== 'INGRESS' && n.kind !== 'API_SERVICE';
              }).filter(n => filteredNodes.some(fn => fn.id === n.id));

              return (
                <div
                  key={stage.id}
                  className="flex-1 min-w-[280px] max-w-[340px] flex flex-col gap-3 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md shadow-xl"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {stage.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {stageNodes.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto pr-1">
                    {stageNodes.map((node) => {
                      const isFocused = activeFocusedNode && activeFocusedNode.id === node.id;
                      const isConnected = activeFocusedNode && (
                        activeFocusedNode.downstreamTargets.some(dt => dt.target.id === node.id) ||
                        activeFocusedNode.upstreamCallers.some(uc => uc.caller.id === node.id)
                      );
                      const isDimmed = activeFocusedNode && !isFocused && !isConnected;

                      return (
                        <div
                          key={node.id}
                          onClick={() => setFocusedEndpoint(isFocused ? null : node)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                            isFocused
                              ? 'bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg'
                              : isConnected
                              ? 'bg-purple-500/15 border-purple-500 ring-1 ring-purple-500/30'
                              : isDimmed
                              ? 'opacity-30 bg-slate-900 border-slate-800'
                              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-cyan-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getMethodBadge(node.method).class}`}>
                              {node.method}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${node.domainInfo?.color}`}>
                              {node.domainInfo?.label}
                            </span>
                          </div>
                          <div className="font-mono text-xs font-bold text-white break-all leading-tight">
                            {node.path}
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>↓ {node.upstreamCallers?.length || 0} callers</span>
                            <span>→ {node.downstreamTargets?.length || 0} downstream</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW MODE 3: MERMAID FLOWCHART */}
        {viewMode === 'MERMAID' && (
          <div className="w-full h-full p-8 flex items-center justify-center overflow-auto">
            {mermaidSvg ? (
              <div 
                className="max-w-full overflow-auto select-none"
                dangerouslySetInnerHTML={{ __html: mermaidSvg }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                <Workflow className="h-8 w-8 animate-spin text-cyan-500" />
                <span className="text-xs font-mono">Compiling Mermaid Architecture Graph...</span>
              </div>
            )}
          </div>
        )}

        {/* VIEW MODE 4: CALL MATRIX */}
        {viewMode === 'MATRIX' && (
          <div className="w-full h-full p-6 overflow-auto">
            <div className="rounded-xl border border-slate-800 bg-[#091124] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <tr>
                    <th className="p-3">Source Node (Caller)</th>
                    <th className="p-3">Communication Type</th>
                    <th className="p-3">Target Endpoint (Route)</th>
                    <th className="p-3">Data State Handoff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                  {flowGraph.links.map((link, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-white">
                          {link.source.method} {link.source.path}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                          {link.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-indigo-400">
                          {link.target.method} {link.target.path}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        {link.label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* HUD CONTROLS (BOTTOM-LEFT) */}
        {/* ===================================================================== */}
        <div className="absolute bottom-6 left-6 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-2xl z-10">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitToScreen}
            className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-mono font-bold text-cyan-400 transition-colors cursor-pointer"
            title="Fit to View"
          >
            Fit
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Reset Zoom to 100%"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-mono text-slate-400 font-bold border-l border-slate-800">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* ===================================================================== */}
        {/* NODE INSPECTOR DRAWER (RIGHT SLIDE-OVER) */}
        {/* ===================================================================== */}
        {activeFocusedNode && (
          <div className="absolute top-0 right-0 h-full w-80 sm:w-96 bg-[#091124] border-l border-slate-800 shadow-2xl p-5 flex flex-col justify-between z-20 backdrop-blur-xl animate-in slide-in-from-right duration-200 overflow-y-auto">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getMethodBadge(activeFocusedNode.method).class}`}>
                    {activeFocusedNode.method}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${activeFocusedNode.domainInfo?.color}`}>
                    {activeFocusedNode.domainInfo?.label}
                  </span>
                </div>
                <button
                  onClick={() => setFocusedEndpoint(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Endpoint Path Title */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Target Route
                </span>
                <h3 className="font-mono text-sm font-bold text-white break-all mt-0.5 leading-snug">
                  {activeFocusedNode.path}
                </h3>
                {activeFocusedNode.branchKey && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/25">
                    <FolderGit2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>Tree Branch: <strong>{activeFocusedNode.branchKey}</strong></span>
                  </div>
                )}
              </div>

              {/* Upstream Callers */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-cyan-400 rotate-180" />
                    <span>Inbound Invocations ({activeFocusedNode.upstreamCallers?.length || 0})</span>
                  </span>
                </div>
                {activeFocusedNode.upstreamCallers?.length > 0 ? (
                  <div className="space-y-1.5">
                    {activeFocusedNode.upstreamCallers.map((uc, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="font-mono font-bold text-white">
                          {uc.caller.method} {uc.caller.path}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-sans mt-0.5">
                          {uc.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 p-2 rounded-lg bg-slate-900 border border-slate-800">
                    Direct public ingress route.
                  </div>
                )}
              </div>

              {/* Downstream Targets */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-purple-400" />
                    <span>Downstream Handoffs ({activeFocusedNode.downstreamTargets?.length || 0})</span>
                  </span>
                </div>
                {activeFocusedNode.downstreamTargets?.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeFocusedNode.downstreamTargets.map((dt, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                        <div className="font-mono font-bold text-white">
                          {dt.target.method} {dt.target.path}
                        </div>
                        <div className="text-[10px] text-purple-400 font-sans mt-0.5">
                          {dt.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 p-2 rounded-lg bg-slate-900 border border-slate-800">
                    Terminal execution endpoint (renders response or handles state).
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2 shrink-0">
              <button
                onClick={() => {
                  const curl = `curl -X ${activeFocusedNode.method} "http://localhost:3000${activeFocusedNode.path}"`;
                  navigator.clipboard.writeText(curl);
                  setCopiedCurl(true);
                  setTimeout(() => setCopiedCurl(false), 2000);
                }}
                className="w-full py-2 px-3 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedCurl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied cURL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copy cURL Command</span>
                  </>
                )}
              </button>

              {onSelectForImpact && (
                <button
                  onClick={() => {
                    onSelectForImpact(activeFocusedNode.path, 'endpoint');
                    onClose();
                  }}
                  className="w-full py-2 px-3 text-xs rounded-xl btn-primary font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Simulate Blast Radius</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
