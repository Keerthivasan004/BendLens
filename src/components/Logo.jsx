'use client';

import React from 'react';

/**
 * BendLens Brand Logo — Enterprise refinement.
 * Same props API (size, withText, className). Visual-only upgrade:
 * quiet squircle, single premium gradient, crisp lens reticle.
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
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative ${iconSizes[size] || iconSizes.md} shrink-0`}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full transition-transform duration-200 hover:scale-[1.04]"
          role="img"
          aria-label="BendLens logo"
        >
          <defs>
            <linearGradient id="bl-squircle" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#5b80ff" />
              <stop offset="0.55" stopColor="#2547eb" />
              <stop offset="1" stopColor="#0f1e5e" />
            </linearGradient>
            <linearGradient id="bl-disc" x1="18" y1="14" x2="46" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="#93b4fd" />
              <stop offset="0.5" stopColor="#3b63f6" />
              <stop offset="1" stopColor="#1e30af" />
            </linearGradient>
            <linearGradient id="bl-ring" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7dd3fc" />
              <stop offset="0.5" stopColor="#818cf8" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
            <radialGradient id="bl-glow" cx="0.5" cy="0.42" r="0.65">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#93b4fd" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2547eb" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#bl-squircle)" />
          <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="16" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />
          <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#bl-glow)" />

          {/* Stacked schema discs */}
          <g>
            <path d="M21 37.5 C21 34.8 43 34.8 43 37.5 L43 42.5 C43 45.2 21 45.2 21 42.5 Z" fill="#16265e" fillOpacity="0.85" stroke="#818cf8" strokeWidth="1" />
            <ellipse cx="32" cy="37.5" rx="11" ry="3.2" fill="#2b3fa8" stroke="#a5b4fc" strokeWidth="1" />
            <path d="M21 28.5 C21 25.8 43 25.8 43 28.5 L43 33.5 C43 36.2 21 36.2 21 33.5 Z" fill="url(#bl-disc)" stroke="#93b4fd" strokeWidth="1" />
            <ellipse cx="32" cy="28.5" rx="11" ry="3.2" fill="#1d37d8" stroke="#bfdbfe" strokeWidth="1" />
            <path d="M21 19.5 C21 16.8 43 16.8 43 19.5 L43 24.5 C43 27.2 21 27.2 21 24.5 Z" fill="#dbe7ff" stroke="#ffffff" strokeWidth="1" />
            <ellipse cx="32" cy="19.5" rx="11" ry="3.2" fill="#f2f6ff" stroke="#ffffff" strokeWidth="1.2" />
          </g>

          {/* Lens reticle */}
          <circle cx="32" cy="31" r="18.5" stroke="url(#bl-ring)" strokeWidth="2" strokeDasharray="13 5" strokeLinecap="round" opacity="0.95" />
          <circle cx="50.5" cy="17.5" r="2.6" fill="#22d3ee" stroke="#ffffff" strokeWidth="1" />
          <circle cx="13.5" cy="46.5" r="2.6" fill="#818cf8" stroke="#ffffff" strokeWidth="1" />
          <circle cx="32" cy="31" r="2.6" fill="#ffffff" />
          <circle cx="32" cy="31" r="1.1" fill="#2547eb" />
        </svg>
      </div>

      {withText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`${textSizes[size] || textSizes.md} font-extrabold tracking-tight text-foreground`}>
              Bend<span className="bg-gradient-to-r from-[#4c71f7] to-[#22d3ee] bg-clip-text text-transparent">Lens</span>
            </span>
            <span className="text-[9px] uppercase font-mono tracking-[0.08em] font-semibold px-1.5 py-0.5 rounded-md bg-surface-raised text-muted border border-border">
              Studio
            </span>
          </div>
          <span className="text-[10px] text-muted font-medium tracking-tight mt-1">
            Architecture & Blast-Radius
          </span>
        </div>
      )}
    </div>
  );
}
