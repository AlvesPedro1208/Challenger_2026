export const colors = {
  bg: {
    primary: '#17121F',
    surface: '#221B2E',
  },
  accent: {
    primary: '#E6135A',
    purple: '#7C3AED',
    success: '#10B981',
    warning: '#F5A623',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B9B3C4',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} as const;

export type AccentColor = keyof typeof colors.accent;
