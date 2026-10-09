# UI Design v2 — "Warm Dawn"

**Date:** 2026-10-06 · **Branch:** `agent/features-batch1` · **Scope:** Dashboard, Home, Login, Log Glucose, tab bar
**Evidence:** `docs/screenshots/2026-10-06/` (after) vs `docs/screenshots/2026-10-05/` (before)

## Overview

Round 5 of the UI refresh replaces the last remnants of the generic look (flat cards, Google-blue
accents, plain tab bar) with a warm, calm identity built around a **deep-teal "dawn" gradient** and
**coral CTAs** — designed to read well for families, at a glance, in both English and Nepali.

## Palette & tokens (`src/design/tokens.ts`)

| Token | Value | Use |
|---|---|---|
| `HERO.from → mid → to` | `#0B4F4A → #0E7C74 → #12A594` | Glucose hero gradient |
| `CTA.from → to` | `#FF7E5F → #FF9E6B` | Primary CTAs (coral) |
| `D2.teal / tealDeep / tealTint` | `#0D9488 / #0B5E58 / #E6F7F4` | Brand accents (icons, chips, active states) |
| Parchment bg | `#F7F1EB` | App background |
| `STATUS` (AGP) | in-range mint · high amber · low coral | Value/chip/dot colors on the hero |

Spacing `SP` (4–32), radii `RD` (12/16/20/26/999), shadows `SH` (card/raised/floating), `TYPE` scale
(hero 56→64), layout column 640px. Legacy blue `#1a73e8` is retired from brand surfaces; it remains
only on secondary screens not yet migrated (progressive rollout).

## Surfaces

- **GlucoseHero** (`src/components/GlucoseHero.tsx`): gradient card with dawn/mint radial glows,
  giant value (white = in range, AGP colors otherwise), status chip, "No readings yet" ghost state,
  IOB pill, "Log now" mini CTA.
- **GradientButton** (`src/components/GradientButton.tsx`): coral pill CTA, `useId()`-unique
  gradient ids (web-safe), disabled/loading/pressed states, glow shadow.
- **QuickActions**: Log / Food / Sick Day / Insulin tiles with color-coded discs (teal/coral/marigold/purple).
- **InsightCard**: derived insight from last-14-days stats (streak, % in range) — warm, actionable copy.
- **FloatingTabBar** (`src/components/FloatingTabBar.tsx`): rounded floating bar, teal active pill,
  Learn route retained but hidden; `useTabBarSpace()` keeps content clear of the bar (+128/104/112).

## Rendering rules (hard requirements)

1. Gradients are drawn with `react-native-svg` only (no expo-linear-gradient/blur/reanimated).
2. Rounded corners via `<Rect rx>` — never parent `overflow: clip` (Android).
3. Decorative SVG layers: `pointerEvents="none"`. Gradient ids must be unique per instance (`useId`).

## Accessibility

- Hero value contrast: white on `#0E7C74` ≈ 5.3:1 (AA for large text); chip text on translucent
  white ≥ 4.5:1 at 12px semibold.
- Mini CTA 34px visual height + `hitSlop 8` ≈ 50px effective target; tab items 54px; quick tiles 84px.
- `maxFontSizeMultiplier` capped on hero numerals; reduced-motion not applicable (transform-only pressed states).

## Verification

- `npx tsc --noEmit` clean · `npm run validate` pass · 43/43 Jest unaffected.
- Headless-Chrome screenshots at 1360×900 and 390×844 (see evidence folder); QA on a seeded test
  account; adversarial review findings fixed (see notes below).

## Review notes (2026-10-06)

Findings fixed this round: duplicate gradient-id risk in GradientButton (now `useId`), hero
no-data state (ghost chip), mini-CTA hit target, CTA width on Home empty state, leftover blue
accents on Dashboard/Home/Login/Log. Backlog (minor): fully migrate remaining screens off legacy
blue; verify 11px Devanagari labels on low-DPI Android at next build; insight copy localization
plurals.
