// Brand palette — mirrors the irecharge-inspired web theme.
export const palette = {
  primary: '#28AA63',
  primaryDeep: '#26A560',
  primaryBright: '#36F07D',
  gradient: ['#26A560', '#36F07D'] as const,
  darkGreen: '#133425',
  background: '#F6F6F9',
  card: '#FFFFFF',
  border: '#E5E7EB',
  inputBg: '#F4F6F9',
  text: '#0B1220',
  textMuted: '#6B7280',
  gold: '#F5B546',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
  success: '#16A34A',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;