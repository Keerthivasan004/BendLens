/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--subtext)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        "surface-card": "var(--surface-card)",
        "surface-subtle": "var(--surface-subtle)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        brand: {
          50: '#eef4ff',
          100: '#dfe9ff',
          200: '#bfd4fe',
          300: '#93b4fd',
          400: '#608dfa',
          500: '#3b63f6',
          600: '#2547eb',
          700: '#1d37d8',
          800: '#1e30af',
          900: '#1e2f8a',
          DEFAULT: '#2547eb',
          foreground: '#ffffff',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'display': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        'title': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.022em', fontWeight: '750' }],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(15, 23, 42, 0.06)',
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'card': '0 1px 2px 0 rgba(15, 23, 42, 0.05), 0 4px 16px -8px rgba(15, 23, 42, 0.10)',
        'lift': '0 8px 24px -8px rgba(15, 23, 42, 0.16), 0 2px 6px -2px rgba(15, 23, 42, 0.08)',
        'dropdown': '0 12px 32px -8px rgba(15, 23, 42, 0.18), 0 4px 8px -4px rgba(15, 23, 42, 0.08)',
        'modal': '0 24px 64px -12px rgba(15, 23, 42, 0.28), 0 8px 16px -8px rgba(15, 23, 42, 0.12)',
        'glow': '0 0 0 1px rgba(59, 99, 246, 0.35), 0 8px 24px -6px rgba(59, 99, 246, 0.45)',
        'card-dark': '0 1px 2px 0 rgba(0, 0, 0, 0.5), 0 8px 28px -12px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        'xl2': '1rem',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'rise': 'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
