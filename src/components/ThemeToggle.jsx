'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Enterprise-grade segmented theme toggle switch.
 * Features an animated sliding indicator, luminous ambient glow,
 * micro-interactions on hover, and full accessibility.
 *
 * @param {Object} props
 * @param {'dark' | 'light'} [props.theme='dark'] - The currently active theme
 * @param {Function} [props.onToggle] - Callback when toggle is clicked
 * @param {Function} [props.onChange] - Callback when a specific theme ('dark' | 'light') is selected
 * @param {string} [props.className] - Additional wrapper styling classes
 */
export default function ThemeToggle({
  theme = 'dark',
  onToggle,
  onChange,
  className = ''
}) {
  const isDark = theme === 'dark';

  const handleSelect = (targetMode) => {
    if (targetMode === theme) {
      // If clicking the already-active mode, toggle to the opposite mode
      const nextMode = isDark ? 'light' : 'dark';
      if (onChange) onChange(nextMode);
      else if (onToggle) onToggle();
      return;
    }

    if (onChange) {
      onChange(targetMode);
    } else if (onToggle) {
      onToggle();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const nextMode = isDark ? 'light' : 'dark';
      if (onChange) onChange(nextMode);
      else if (onToggle) onToggle();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleSelect('dark');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      handleSelect('light');
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color theme switcher"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      title={isDark ? 'Current: Dark theme • Click to switch to Light' : 'Current: Light theme • Click to switch to Dark'}
      className={`relative inline-flex items-center p-1 rounded-full bg-slate-200/60 dark:bg-[#0b101c] border border-slate-300/80 dark:border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] backdrop-blur-sm select-none transition-all hover:border-slate-400/80 dark:hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background cursor-pointer ${className}`}
    >
      {/* Animated Sliding Highlight Pill */}
      <div
        className={`absolute left-1 top-1 w-6 h-6 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
          isDark
            ? 'translate-x-7 bg-[#162035] border border-sky-400/40 shadow-[0_2px_8px_-1px_rgba(56,189,248,0.35),0_1px_2px_rgba(0,0,0,0.5)]'
            : 'translate-x-0 bg-white border border-amber-300/70 shadow-[0_2px_8px_-1px_rgba(245,158,11,0.28),0_1px_2px_rgba(0,0,0,0.06)]'
        }`}
      />

      {/* Light (Sun) Segment */}
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          handleSelect('light');
        }}
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 group cursor-pointer focus:outline-none ${
          !isDark
            ? 'text-amber-500'
            : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title={!isDark ? "Light Mode Active" : "Switch to Light Mode"}
        aria-label="Switch to light theme"
      >
        <Sun
          className={`h-3.5 w-3.5 transition-all duration-300 ${
            !isDark
              ? 'scale-105 fill-amber-400/25 rotate-0 stroke-[2.2]'
              : 'scale-90 rotate-[-20deg] stroke-[1.8] group-hover:rotate-0 group-hover:scale-100'
          }`}
        />
      </button>

      {/* Dark (Moon) Segment */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          handleSelect('dark');
        }}
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 group cursor-pointer focus:outline-none ${
          isDark
            ? 'text-sky-400'
            : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title={isDark ? "Dark Mode Active" : "Switch to Dark Mode"}
        aria-label="Switch to dark theme"
      >
        <Moon
          className={`h-3.5 w-3.5 transition-all duration-300 ${
            isDark
              ? 'scale-105 fill-sky-400/25 rotate-0 stroke-[2.2]'
              : 'scale-90 rotate-[20deg] stroke-[1.8] group-hover:rotate-0 group-hover:scale-100'
          }`}
        />
      </button>
    </div>
  );
}
