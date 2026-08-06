// src/theme.ts — Shared design tokens for T1D Saathi
// Aligned with Kapoori Ka design language (warm, earthy, accessible)
// Import as: import { T, card, pill, section, primBtn, input } from '../theme';

export const T = {
  // Primary palette — clinical but warm (Kapoori Ka aligned)
  blue: '#1a73e8',         // primary — clinical blue (replaces Kapoori's terracotta for medical context)
  blueLight: '#E6F4FE',    // light blue — info banners, secondary highlights
  teal: '#0D9488',         // success — healthy readings (replaces Kapoori's green)
  red: '#C0392B',          // danger — hypo/DKA alerts (matches Kapoori's red)
  orange: '#F59E0B',       // warning — borderline readings
  purple: '#7C3AED',       // accent — education/quiz
  
  // Surfacing (Kapoori Ka pattern)
  surface: '#FDF8F2',      // warm off-white card bg
  bg: '#F7F1EB',           // parchment screen bg (Kapoori Ka exact match)
  text: '#1A1A2E',         // near-black (Kapoori Ka exact match)
  muted: '#7A6E65',        // warm gray (Kapoori Ka exact match)
  border: '#EDE0D4',       // subtle border (Kapoori Ka exact match)
  shadow: '#C4956A',       // warm shadow color (Kapoori Ka exact match)
  
  // Semantic state backgrounds (Kapoori Ka pattern)
  greenLight: '#D1FAE5',
  greenDark: '#065F46',
  redLight: '#FEE2E2',
  redDark: '#991B1B',
  amberLight: '#FEF3C7',
  amberDark: '#92400E',
  blueLightBg: '#DBEAFE',
  blueDark: '#1E40AF',
};

// ── Core building blocks (mirroring Kapoori Ka) ──────────────────

export const card = {
  backgroundColor: T.surface,
  borderRadius: 16,
  padding: 16,
  shadowColor: T.shadow,
  shadowOpacity: 0.10,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
  marginBottom: 10,
};

export const pill = (bg: string, fg: string) => ({
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 4,
  backgroundColor: bg,
  color: fg,
  alignSelf: 'flex-start' as const,
});

export const section = {
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.2,
  color: T.muted,
  textTransform: 'uppercase' as const,
  marginBottom: 10,
  marginTop: 16,
};

export const primBtn = {
  backgroundColor: T.blue,
  borderRadius: 28,
  paddingVertical: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

export const input = {
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: T.border,
  backgroundColor: T.surface,
  padding: 14,
  fontSize: 15,
  color: T.text,
};

export const fab = {
  position: 'absolute' as const,
  bottom: 80,
  right: 20,
  width: 56,
  height: 56,
  borderRadius: 30,
  backgroundColor: T.blue,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  shadowColor: T.blue,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
};

export const navHeader = {
  backgroundColor: T.bg,
  headerStyle: { backgroundColor: T.bg },
  headerTintColor: T.text,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
};

export const avatar = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: T.blueLight,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  marginRight: 14,
};

// ── Component presets ────────────────────────────────────────────

export const glycemicBadge = (value: number, unit: 'mgdl' | 'mmol') => {
  const mgdl = unit === 'mmol' ? value * 18 : value;
  if (mgdl < 54) return { bg: T.redLight, fg: T.redDark, label: 'Severe Low' };
  if (mgdl < 70) return { bg: T.amberLight, fg: T.amberDark, label: 'Low' };
  if (mgdl <= 180) return { bg: T.greenLight, fg: T.greenDark, label: 'In Range' };
  if (mgdl <= 250) return { bg: T.amberLight, fg: T.amberDark, label: 'High' };
  return { bg: T.redLight, fg: T.redDark, label: 'Very High' };
};

// Backward compatibility (Kapoori Ka pattern)
export const theme = {
  colors: {
    primary: T.blue,
    secondary: T.teal,
    success: T.teal,
    danger: T.red,
    warning: T.orange,
    surface: T.surface,
    bg: T.bg,
    textPrimary: T.text,
    textSecondary: T.muted,
    border: T.border,
  },
  card: {
    borderRadius: 16,
    backgroundColor: T.surface,
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
  },
  pillBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  sectionHeader: section,
  primaryButton: {
    backgroundColor: T.blue,
    borderRadius: 28,
    paddingVertical: 14,
    width: '100%' as const,
  },
  warmShadow: {
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  input: input,
  outlineButton: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 28,
    paddingVertical: 13,
    backgroundColor: 'transparent' as const,
  },
};

export default theme;
