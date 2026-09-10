---
name: Modern Slate Stream
colors:
  surface: '#10131d'
  surface-dim: '#10131d'
  surface-bright: '#363944'
  surface-container-lowest: '#0b0e18'
  surface-container-low: '#181b25'
  surface-container: '#1c1f2a'
  surface-container-high: '#272a34'
  surface-container-highest: '#32343f'
  on-surface: '#e0e2f0'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e0e2f0'
  inverse-on-surface: '#2d303b'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#ffb0cd'
  on-secondary: '#640039'
  secondary-container: '#aa0266'
  on-secondary-container: '#ffbad3'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff516a'
  on-tertiary-container: '#5b0017'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#ffd9e4'
  secondary-fixed-dim: '#ffb0cd'
  on-secondary-fixed: '#3e0022'
  on-secondary-fixed-variant: '#8c0053'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#10131d'
  on-background: '#e0e2f0'
  surface-variant: '#32343f'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
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
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  gutter-mobile: 1rem
  gutter-tablet: 1.5rem
  dock-inset-bottom: 1.5rem
---

## Brand & Style
The design system targets an audience of avid manga, manhwa, and comic enthusiasts who value seamless reading continuity, meticulous library curation, and cinematic immersion. The brand balances the utilitarian speed of community-driven reading utilities with the polished, premium staging of modern entertainment streaming apps.

The aesthetic marries **dark minimalism** with **modern streaming glass accents**. It centers on deep obsidian surfaces, crisp structural typography, low-friction interactions, and vivid electric violet-to-crimson highlights. The emotional signature is immersive, focused, and high-performance—surfacing content artwork front-and-center while keeping reader chrome invisible until invoked.

## Colors
The palette is built around absolute dark-mode discipline to conserve OLED power, minimize eye fatigue during extended reading sessions, and make cover illustrations pop.

### Color Tokens
- **Backgrounds:**
  - `surface-canvas`: `#0B0D13` (Core viewport backdrop, reader frame)
  - `surface-base`: `#12151F` (Cards, drawers, navigation shells)
  - `surface-raised`: `#1A1E2E` (Modals, active tooltips, sheet headers)
  - `surface-elevated`: `#22273B` (Floating dock pills, overlay controls)
- **Borders & Dividers:**
  - `border-subtle`: `#282D42` (Dividers, container strokes)
  - `border-focus`: `rgba(139, 92, 246, 0.4)` (Input strokes, active outlines)
- **Accents:**
  - `accent-primary`: `#8B5CF6` (Electric violet; primary actions, progress tracks, active indicators)
  - `accent-secondary`: `#EC4899` (Electric magenta; gradient pairings, featured collections)
  - `accent-crimson`: `#F43F5E` (Hot crimson; unread badges, live drops, destructive highlights)
  - `accent-cyan`: `#06B6D4` (Downloaded indicators, offline sync statuses)
- **Typography & Icons:**
  - `text-primary`: `#F3F4F6` (Headlines, titles, active tabs)
  - `text-secondary`: `#9CA3AF` (Metadata, chapter numbers, timestamps)
  - `text-tertiary`: `#6B7280` (Disabled states, placeholder text)

### Application Rules
- Maintain pure dark canvas `#0B0D13` for reader views to eliminate letterbox distractions.
- Reserve `#8B5CF6` for interactive elements and primary completion vectors. Do not flood large surfaces with solid violet; rely on 1px subtle glow outlines or tonal tints (`rgba(139, 92, 246, 0.12)`).

## Typography
Typography is tuned for high structural legibility and dense information display on handheld OLED displays.

- **Plus Jakarta Sans** provides rounded, friendly geometric authority for featured manga titles, screen headers, and shelf banners.
- **Inter** handles reading lists, detailed chapter indices, translated metadata, toolbars, and system tags.
- Use tabular numerals for chapter numbers, page counters (`34 / 72`), and timestamps to maintain layout stability during scrubbing or dynamic page flips.

## Layout & Spacing
The layout follows a fluid-column approach anchored to mobile-first viewport constraints.

### Grid & Margins
- **Mobile (<640px):** 4-column layout with `16px` page margins and `12px` gutters. Two-to-three cover card columns depending on dense shelf preferences.
- **Tablet (640px - 1024px):** 8-column layout with `24px` margins and `16px` gutters. Responsive multi-column browsing with expandable side sheets for chapter drawers.
- **Desktop / Foldable Expanded (>1024px):** 12-column layout maxing out at `1280px` centered view, with fixed `380px` drawer panels for side-by-side reading metadata.

### System Spacing Rhythm
- Internal card elements (tags, badges, titles) follow a tight `4px` / `8px` increment.
- Content shelves and horizontal scroll rows use a `16px` lead margin aligning with the screen edge.
- Safe Area Insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`) are strictly padded with additional `8px` breathing room to prevent overlap with gesture navigation pills and hardware notches.

## Elevation & Depth
Depth is created through layered surface tonal shifts combined with subtle glassmorphism and ambient violet glows rather than heavy drop shadows.

### Surface Hierarchy
- **Level 0 (Canvas):** `#0B0D13` base substrate.
- **Level 1 (Card & Row Surface):** `#12151F` with a 1px border of `#282D42`.
- **Level 2 (Active Elements & Drawers):** `#1A1E2E` with a 1px border of `rgba(255, 255, 255, 0.08)`.
- **Level 3 (Floating Docks & Reader Chrome):** `rgba(18, 21, 31, 0.75)` with `backdrop-filter: blur(16px)` and a subtle rim highlight `1px solid rgba(255, 255, 255, 0.12)`.

### Accent Lighting
- Active navigation items and playing/reading states receive an electric violet ambient glow:
  `box-shadow: 0 0 16px rgba(139, 92, 246, 0.35)`.
- Unread indicator dots carry a crimson beacon glow:
  `box-shadow: 0 0 8px rgba(244, 63, 94, 0.5)`.

## Shapes
The shape strategy establishes a modern, approachable aesthetic with standard rounded geometries.

- **Base Corner Radius (`rounded-md`):** `8px` (0.5rem). Applied to manga cover cards, text inputs, dropdowns, and button elements.
- **Large Radius (`rounded-lg`):** `16px` (1rem). Applied to bottom sheets, modal dialogs, and reader setting panels.
- **Container Radius (`rounded-xl`):** `24px` (1.5rem). Applied to floating reader docks, toast pills, and hero banner carousels.
- **Pill Radius (`rounded-full`):** `9999px`. Reserved strictly for filter chips, chapter status badges, circular icon buttons, and floating bottom navigation docks.

## Components

### Cover Cards
- **Proportions:** Fixed aspect-ratio `[3/4]` for standard grid views, `[2/3]` for dense shelf layouts.
- **Structure:**
  - Base wrapper with `8px` corner radius, overflow hidden, and `1px solid #282D42`.
  - Poster artwork with a bottom 40% vertical gradient (`linear-gradient(to top, rgba(11, 13, 19, 0.95), transparent)`).
  - Top-right corner: Status badge (e.g., crimson pill for unread chapter count).
  - Bottom edge: Progress track (2px height, track `#282D42`, fill `#8B5CF6`).
  - Text block underneath or over gradient: `headline-sm` title (2-line clamp), `body-sm` author/update label in `#9CA3AF`.

### Chapter List Items
- **Structure:**
  - Surface: Transparent by default; active/hover turns `#1A1E2E`.
  - Height: `56px` touch target with `12px` horizontal padding.
  - Left: Read status circle (unfilled ring for unread, electric violet checkmark with 40% opacity text for completed).
  - Center: Chapter name (`body-md`, `#F3F4F6` if unread, `#6B7280` if read) stacked above relative release date (`label-sm`, `#9CA3AF`).
  - Right: Download status icon (cyan down-arrow inside circle if saved locally, hollow outline if cloud-only).

### Reader Chrome
- **Behavior:** Minimal immersive overlay appearing on center tap; slides smoothly away on page scroll.
- **Top Bar:** Frosted glass (`rgba(18, 21, 31, 0.8)`) with blur `16px`. Left: Back chevron. Center: Truncated title + chapter number. Right: Reading mode toggle (Webtoon / Single / Spread) and Bookmark icon.
- **Bottom Scrubber:** Frosted glass capsule floating `24px` above the bottom edge. Includes precise page slider track with `#8B5CF6` thumb, numeric badge (`45 / 120`), and left/right chapter jumps.

### Mobile Bottom Navigation Dock
- **Structure:** Detached floating pill navigation dock positioned `16px` above screen bottom.
- **Surfacing:** `rgba(18, 21, 31, 0.85)` fill, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255, 255, 255, 0.1)`.
- **Items:** 4 or 5 destinations (Library, Updates, Browse, History, Settings).
- **Active State:** Icon switches to solid, tinted with `#8B5CF6`, underlined by a 4px soft neon violet pip with ambient blur. Label changes to `#F3F4F6` with `label-sm` weight.

### Buttons & Chips
- **Primary Button:** Solid `#8B5CF6` fill, `#FFFFFF` text, `headline-sm` font, `8px` border radius, subtle hover glow.
- **Secondary Button:** Surface `#1A1E2E`, `1px solid #282D42`, text `#F3F4F6`.
- **Filter Chips:** Pill-shaped, background `rgba(26, 30, 46, 0.8)`, border `1px solid #282D42`, text `#9CA3AF`. Selected state swaps border to `transparent`, background to `#8B5CF6`, text to `#FFFFFF`.

### Input Fields
- **Container:** Background `#12151F`, border `1px solid #282D42`, radius `8px`, height `44px`.
- **States:** Focus reveals `1px solid #8B5CF6` with a soft `rgba(139, 92, 246, 0.2)` ring.
- **Affordances:** Left search icon (`#9CA3AF`), right clear button with smooth fade transition.