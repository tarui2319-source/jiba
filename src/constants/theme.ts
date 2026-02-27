/**
 * JIBA — デザイントークン（常にダークモード固定）
 * MVP8-A: モダン&シンプル方針で全面刷新
 */

export const Colors = {
  // ── 背景 ──────────────────────────────────────────────
  bg: '#080c14',         // 深い青みがかった黒
  surface: '#0f1623',    // カード・パネル用
  surfaceHigh: '#192235', // 浮き上がったUI要素
  border: '#222d42',
  borderSubtle: '#1a2438',

  // ── BLUE ──────────────────────────────────────────────
  blue: '#4f8ef7',
  blueLight: '#93c5fd',
  blueDim: '#162048',
  blueTint: 'rgba(79,142,247,0.12)',

  // ── RED ───────────────────────────────────────────────
  red: '#f05252',
  redLight: '#fca5a5',
  redDim: '#4a1010',
  redTint: 'rgba(240,82,82,0.12)',

  // ── ニュートラル ───────────────────────────────────────
  neutral: '#2e3a52',
  neutralText: '#7a8aaa',

  // ── テキスト ───────────────────────────────────────────
  white: '#ffffff',
  textPrimary: '#e8edf8',
  textSecondary: '#7a8aaa',
  textMuted: '#4a5570',

  // ── 機能色 ────────────────────────────────────────────
  timerNormal: '#22d67a',
  timerWarning: '#f05252',
  selectedBorder: '#fbbf24',
  selectedGlow: 'rgba(251,191,36,0.25)',
  success: '#22d67a',
  error: '#f05252',
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  title: 42,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 36,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

/** タップ領域の最小サイズ（iOS HIG: 44pt） */
export const MIN_TAP = 44;
