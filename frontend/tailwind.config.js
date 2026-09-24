/**
 * Semantic tokens backed by CSS variables (src/index.css). The light values come from the
 * SpendWise identity (ui/light) and the dark values from the RupeeFlow design system
 * (ui/dark), so every component uses one class name that is correct in both themes.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        hover: token('hover'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        muted: token('muted'),
        subtle: token('subtle'),
        primary: token('primary'),
        'primary-hover': token('primary-hover'),
        'primary-fg': token('primary-fg'),
        'primary-soft': token('primary-soft'),
        success: token('success'),
        'success-fg': token('success-fg'),
        warning: token('warning'),
        'warning-fg': token('warning-fg'),
        danger: token('danger'),
        'danger-fg': token('danger-fg'),
        track: token('track'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Shared type scale from both DESIGN.md files
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '500' }],
        'body-sm': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        'body-md': ['0.875rem', { lineHeight: '1.375rem' }],
        'headline-sm': ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-lg': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'currency-stat': ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em', fontWeight: '700' }],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      },
      spacing: {
        sidebar: '16rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'sheet-up': 'sheet-up 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
