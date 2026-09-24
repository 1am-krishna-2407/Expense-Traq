---
name: RupeeFlow Design System
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-metric:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  numeric-table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes an ultra-reliable, high-density financial interface optimized for continuous numerical tracking, ledger auditing, and cashflow monitoring. Tailored for analytical professionals, finance operators, and discerning personal finance trackers, the interface projects precision, uncompromised stability, and calm authority.

The design movement combines **Corporate Modern** with **Technical Minimalism**:
- Dark-mode-first architecture leveraging deep slate and navy tones to minimize optical fatigue over extended sessions.
- Strict rectangular discipline with subtle, controlled radii to optimize structural layout and maximum data density.
- Zero decorative embellishment: visual interest is achieved strictly through sharp typography, crisp borders, and purposeful semantic status accents.

## Colors

The palette is engineered around dark slate surfaces calibrated for high-contrast legible data structures.

- **Primary (`#2563EB`)**: Royal blue accentuating primary actions, interactive focus rings, active tab states, and system-level KPIs. A lighter tint (`#3B82F6`) serves as the hover state.
- **Secondary (`#10B981`)**: Emerald green signaling positive cashflow, budget surpluses, investment gains, and validated reconciliations. Paired with `#34D399` for micro-indicators.
- **Tertiary (`#F59E0B`)**: Vivid amber reserved for warning thresholds, budget limits nearing exhaustion (80-99%), and pending settlement workflows. Paired with `#FBBF24`.
- **Negative / Alert (`#EF4444`)**: Crimson red strictly highlighting budget overruns, transaction failures, negative burn rates, and deletions. Paired with `#F87171`.
- **Surfaces & Layers**:
  - Base Canvas: `#0B0F17`
  - Layer 1 Surface (Cards, Navbars): `#0F172A`
  - Layer 2 Surface (Nested Cards, Modals, Table Headers): `#1E293B`
  - Elevated Hover State: `#1A2234`
- **Text & Borders**:
  - Primary Text (Headers, Primary Metrics): `#F8FAFC`
  - Secondary Text (Data Tables, Body): `#CBD5E1`
  - Muted Text (Metadata, Field Labels, Timestamps): `#94A3B8`
  - Structural Hairlines & Borders: `#1E293B` (Base), `#334155` (Elevated/Hover)

## Typography

The type hierarchy relies entirely on `Inter` to take advantage of its neutral geometric structure, tall x-height, and robust OpenType tabular features.

- **Tabular Numerals**: Apply `font-feature-settings: "tnum" 1` across all balance outputs, ledger values, currency fields, and data tables to preserve strict vertical column alignment.
- **Metric Scaling**: Large numeric aggregates use `numeric-metric` with tight letter-spacing to command immediate visual focus without consuming excessive vertical padding.
- **Micro-labels**: Field labels and table headers utilize `label-sm` in all-caps or medium-weight formatting with `letterSpacing: 0.04em` to delineate structure from dense numerical data.

## Layout & Spacing

The layout is built on a tight, compact 4px base unit grid, engineered specifically for high information density dashboards.

- **Grid Architecture**:
  - **Desktop (1024px+)**: 12-column responsive grid with `1.5rem` canvas margins and `1rem` column gutters. Ledger tables and chart panes sit in nested 4- or 8-column spans.
  - **Tablet (768px - 1023px)**: 8-column layout with `1rem` margins and `1rem` gutters. Metric cards wrap into 2x2 configurations.
  - **Mobile (<768px)**: 4-column layout with `1rem` margins and `0.75rem` gutters. Tabular ledgers degrade into stacked list rows.
- **Density Philosophy**:
  - Keep intra-component padding compact (`space-sm` to `space-md`) to ensure critical expense, balance, and categorization details remain visible within the default viewport.
  - Form field rows and data grid rows adhere to a strict 36px to 40px height envelope.

## Elevation & Depth

In keeping with a technical dark-mode fintech aesthetic, depth is rendered primarily via **tonal layering** and **crisp 1px hairlines**, avoiding wide diffuse shadows which reduce edge clarity in dense charts.

- **Layer 0 (Canvas)**: `#0B0F17` background.
- **Layer 1 (Card & Module Surfaces)**: `#0F172A` with a 1px solid perimeter of `#1E293B`.
- **Layer 2 (In-Card Highlights & Dropdowns)**: `#1E293B` with border `#334155`.
- **Layer 3 (Modals & Float Panels)**: `#131C2E` surrounded by a dual boundary: `1px solid #334155` complemented by an ambient, low-spread drop shadow: `0 10px 25px -5px rgba(0, 0, 0, 0.6)`.
- **Focus & Interaction Cues**: Elevated elements do not rise on the Z-axis; instead, their borders shift from `#1E293B` to `#3B82F6` or `#334155` on hover/focus.

## Shapes

The interface embraces a disciplined, soft rectangular geometry (`roundedness: 1`).

- **Base Radius (`0.25rem` / `4px`)**: Buttons, text input fields, table selection boxes, status pills, and dropdown menu items.
- **Container Radius (`0.5rem` / `8px`)**: Data cards, metric containers, sidebars, modal overlays, and analytical chart panels.
- **Pill Exceptions**: Standalone numerical micro-badges (such as category indicators or "+2.4%" delta tags) may use fully rounded capsules (`9999px`) to immediately distinguish contextual tags from actionable modular components.

## Components

### Buttons
- **Primary**: Solid background `#2563EB`, text `#F8FAFC`, hover `#3B82F6`. Focused state renders a 2px offset ring in `#2563EB`. Height: 36px (compact) or 32px (dense table inline).
- **Secondary / Ghost**: Background `#1E293B`, border `1px solid #334155`, text `#CBD5E1`. Hover background `#1A2234`, text `#F8FAFC`.
- **Danger**: Solid `#EF4444` or ghost with `#EF4444` text and `1px solid rgba(239, 68, 68, 0.3)`.

### Inputs & Form Fields
- Background `#0B0F17`, border `1px solid #1E293B`, border-radius `4px`, text `#F8FAFC`, placeholder `#94A3B8`.
- Focus state shifts border color to `#2563EB` with `box-shadow: 0 0 0 1px #2563EB`.
- Prefix currency adornment (e.g., "₹") fixed in `#94A3B8` with right-aligned tabular numbers for monetary entry.

### Chips & Semantic Status Badges
- **Credit / Surplus**: Background `rgba(16, 185, 129, 0.12)`, border `1px solid rgba(16, 185, 129, 0.25)`, text `#34D399`.
- **Warning / At-Limit**: Background `rgba(245, 158, 11, 0.12)`, border `1px solid rgba(245, 158, 11, 0.25)`, text `#FBBF24`.
- **Debit / Overrun**: Background `rgba(239, 68, 68, 0.12)`, border `1px solid rgba(239, 68, 68, 0.25)`, text `#F87171`.

### Data Tables & Transaction Ledgers
- Row heights locked to 40px. Zebra striping omitted in favor of a subtle `1px solid #1E293B` bottom border.
- Header row styled with background `#0F172A`, text `#94A3B8`, uppercase `11px`, letter spacing `0.04em`.
- Row hover triggers an immediate surface transition to `#1A2234`.

### Cards & Ledger Modules
- Base structure: `#0F172A` background, `1px solid #1E293B` border, `8px` corner radius.
- Padding structured as `space-md` (`12px`) or `space-lg` (`16px`) to ensure high density without visual crowding.