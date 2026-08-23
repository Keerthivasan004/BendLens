'use client';

import React from 'react';

/**
 * BendLens Brand Logo
 * Core Design Language:
 * 1. Database Architecture: Layered 3D relational database disk stack.
 * 2. Data Science & Knowledge Graph: Interconnected neural graph nodes and analytics flow vectors.
 * 3. Optical Lens: Magnifying inspection ring analyzing schema topology.
 */
export default function Logo({ size = 'md', withText = true, className = '' }) {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Custom Database & Data Science Vector Emblem */}
      <div className={`relative ${iconSizes[size] || iconSizes.md} shrink-0`}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full filter drop-shadow-md transition-transform hover:scale-105"
        >
          {/* Definitions for Gradients & Filters */}
          <defs>
            {/* Database Stack Gradient */}
            <linearGradient id="db-grad-top" x1="16" y1="12" x2="48" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.5" stopColor="#0284c7" />
              <stop offset="1" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="db-grad-mid" x1="16" y1="24" x2="48" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60a5fa" />
              <stop offset="0.5" stopColor="#2563eb" />
              <stop offset="1" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="db-grad-bot" x1="16" y1="36" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818cf8" />
              <stop offset="0.5" stopColor="#4f46e5" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>

            {/* Optical Lens Ring Gradient */}
            <linearGradient id="lens-ring-grad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38bdf8" />
              <stop offset="0.3" stopColor="#818cf8" />
              <stop offset="0.7" stopColor="#c084fc" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>

            {/* Neural Data Node Glow */}
            <radialGradient id="node-glow" cx="0.5" cy="0.5" r="0.5" fx="0.3" fy="0.3">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>
          </defs>

          {/* Outer Rounded Container */}
          <rect
            x="2"
            y="2"
            width="60"
            height="60"
            rx="16"
            className="fill-slate-900 dark:fill-black stroke-slate-700/60 dark:stroke-slate-800"
            strokeWidth="1.5"
          />

          {/* Data Science Graph Connecting Lines (Background Network) */}
          <g opacity="0.6">
            <line x1="12" y1="18" x2="32" y2="18" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="52" y1="18" x2="32" y2="18" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="12" y1="46" x2="32" y2="46" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="52" y1="46" x2="32" y2="46" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="12" y1="18" x2="12" y2="46" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="52" y1="18" x2="52" y2="46" stroke="#818cf8" strokeWidth="1.5" />
          </g>

          {/* 3D Relational Database Stack (3 Tier Cylinders) */}
          {/* Bottom Cylinder Disc */}
          <path
            d="M20 38 C20 35 44 35 44 38 L44 44 C44 47 20 47 20 44 Z"
            fill="url(#db-grad-bot)"
            stroke="#6366f1"
            strokeWidth="1"
          />
          <ellipse cx="32" cy="38" rx="12" ry="3.5" fill="#312e81" stroke="#818cf8" strokeWidth="1" />

          {/* Middle Cylinder Disc */}
          <path
            d="M20 28 C20 25 44 25 44 28 L44 34 C44 37 20 37 20 34 Z"
            fill="url(#db-grad-mid)"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          <ellipse cx="32" cy="28" rx="12" ry="3.5" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />

          {/* Top Cylinder Disc */}
          <path
            d="M20 18 C20 15 44 15 44 18 L44 24 C44 27 20 27 20 24 Z"
            fill="url(#db-grad-top)"
            stroke="#0284c7"
            strokeWidth="1"
          />
          <ellipse cx="32" cy="18" rx="12" ry="3.5" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.2" />

          {/* Optical Architecture Inspection Lens (Scanning Reticle) */}
          <circle
            cx="32"
            cy="31"
            r="19"
            stroke="url(#lens-ring-grad)"
            strokeWidth="2"
            strokeDasharray="14 4"
            className="origin-center"
          />

          {/* Data Science Neural & Feature Nodes (Orbiting Points) */}
          {/* Top-Left Cluster Node */}
          <circle cx="12" cy="18" r="3.5" fill="url(#node-glow)" stroke="#ffffff" strokeWidth="1" />
          {/* Top-Right Cluster Node */}
          <circle cx="52" cy="18" r="3.5" fill="url(#node-glow)" stroke="#ffffff" strokeWidth="1" />
          {/* Bottom-Left Cluster Node */}
          <circle cx="12" cy="46" r="3.5" fill="url(#node-glow)" stroke="#ffffff" strokeWidth="1" />
          {/* Bottom-Right Cluster Node */}
          <circle cx="52" cy="46" r="3.5" fill="url(#node-glow)" stroke="#ffffff" strokeWidth="1" />

          {/* Center Optical Focal Sparkle */}
          <circle cx="32" cy="31" r="3" fill="#38bdf8" />
          <circle cx="32" cy="31" r="1.5" fill="#ffffff" />
        </svg>
      </div>

      {/* Brand Typography */}
      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`${
                textSizes[size] || textSizes.md
              } font-black tracking-tight text-blue-950 dark:text-white leading-none`}
            >
              Bend<span className="text-blue-700 dark:text-blue-400">Lens</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Data Studio
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5">
            Database Architecture & Data Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
