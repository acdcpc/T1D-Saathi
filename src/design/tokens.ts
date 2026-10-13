// Design tokens v2 — "Warm Dawn" (2026-10-06)
// Deep teal hero + coral dawn accents on warm parchment; AGP glucose status colors.
// Implementable with react-native-svg only (gradients via SVG, no extra libs).
import { FONT } from '../theme';

export const D2 = {
  bg: '#F7F1EB',
  bgAlt: '#F1E8DD',
  card: '#FFFFFF',
  ink: '#221C33',
  text2: '#5C5348',
  muted: '#7A6E65',
  faint: '#9A9086',
  border: '#EDE0D4',

  tealTint: '#E5F4F1',
  teal: '#0D9488',
  tealDeep: '#0B5E58',
  tealBright: '#2DD4BF',
  coralTint: '#FFEDE6',
  coral: '#F4684E',
  coralDeep: '#D9503A',
  marigold: '#F5A623',
  marigoldTint: '#FEF3DC',
  marigoldDeep: '#B45309',
  purple: '#7C3AED',
  purpleTint: '#F1EAFE',
  red: '#C0392B',
  redTint: '#FEE2E2',
} as const;

export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const RD = { sm: 12, md: 16, lg: 20, xl: 24, xxl: 28, pill: 999 } as const;

export const SH = {
  card: { shadowColor: '#221C33', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  raised: { shadowColor: '#221C33', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
  floating: { shadowColor: '#221C33', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
} as const;

export const heroGlow = (c: string) => ({
  shadowColor: c, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.30, shadowRadius: 22, elevation: 6,
});

// ── Hero surface (constant deep-teal gradient + dawn/mint radial glows) ──
export const HERO = {
  from: '#0B4F4A',
  mid: '#0E7C74',
  to: '#12A594',
  dawn: '#FF9E6B',
  mint: '#2DD4BF',
} as const;

// ── Coral gradient CTA ──
export const CTA = { from: '#FF7E5F', to: '#FF9E6B', pressed: '#D9503A' } as const;

// ── AGP glucose status map (single source of truth) ──
export type StatusKey = 'inRange' | 'high' | 'veryHigh' | 'low' | 'veryLow' | 'none';

export const STATUS: Record<StatusKey, {
  light: string; deep: string; onDark: string; tint: string;
  labelEn: string; labelNe: string;
}> = {
  inRange: { light: '#1F9D6B', deep: '#157A52', onDark: '#FFFFFF', tint: 'rgba(31,157,107,0.14)', labelEn: 'In range', labelNe: 'दायरामा' },
  high: { light: '#F59E0B', deep: '#B45309', onDark: '#FFD166', tint: 'rgba(245,158,11,0.16)', labelEn: 'High', labelNe: 'उच्च' },
  veryHigh: { light: '#EA580C', deep: '#C2410C', onDark: '#FF9E64', tint: 'rgba(234,88,12,0.14)', labelEn: 'Very high', labelNe: 'धेरै उच्च' },
  low: { light: '#C0392B', deep: '#A03024', onDark: '#FF8A80', tint: 'rgba(192,57,43,0.14)', labelEn: 'Low', labelNe: 'कम' },
  veryLow: { light: '#7F1D1D', deep: '#7F1D1D', onDark: '#FF6B6B', tint: 'rgba(127,29,29,0.12)', labelEn: 'Urgent low', labelNe: 'आपतकालीन कम' },
  none: { light: '#EEF1F4', deep: '#7A6E65', onDark: 'rgba(255,255,255,0.85)', tint: '#EEF1F4', labelEn: 'No data', labelNe: 'डाटा छैन' },
};

/** Map glucose (mg/dL) to an AGP status key. */
export function statusForMgdl(mgdl: number | null): StatusKey {
  if (mgdl === null || !Number.isFinite(mgdl)) return 'none';
  if (mgdl < 54) return 'veryLow';
  if (mgdl < 70) return 'low';
  if (mgdl <= 180) return 'inRange';
  if (mgdl <= 250) return 'high';
  return 'veryHigh';
}

// ── Type scale (Mukta family names are the weights) ──
export const TYPE = {
  hero: { fontFamily: FONT.extrabold, fontSize: 56, lineHeight: 60, letterSpacing: -1.2 },
  heroWide: { fontFamily: FONT.extrabold, fontSize: 64, lineHeight: 68, letterSpacing: -1.4 },
  metric: { fontFamily: FONT.extrabold, fontSize: 26, lineHeight: 29, letterSpacing: -0.4 },
  screenTitle: { fontFamily: FONT.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  section: { fontFamily: FONT.bold, fontSize: 12, lineHeight: 17, letterSpacing: 1.8 },
  cardTitle: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: FONT.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: FONT.medium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: FONT.medium, fontSize: 11, lineHeight: 16 },
} as const;

export const LAYOUT = { contentMaxWidth: 640 } as const;
