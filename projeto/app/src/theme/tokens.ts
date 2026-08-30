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
    dark: '#1A1A1A',
  },
  // Label colors for accent-tinted surfaces (accent at 15% over bg.primary/bg.surface).
  // The raw accents fail WCAG AA there, so pink and purple are lightened; green and
  // amber already clear 4.5:1 and stay at their palette value.
  onTone: {
    primary: '#FF6FA0',
    purple: '#B08CF7',
    success: '#10B981',
    warning: '#F5A623',
  },
  // Light "paper" theme of the ticket. Replaces the literals currently inlined in the
  // ticket screens: ink -> INK '#1A1A1A', inkSoft -> INK_SOFT '#6B6572',
  // divider -> DIVIDER '#ECE9F1', surface -> the '#FFFFFF' card backgrounds.
  ticket: {
    surface: '#FFFFFF',
    ink: '#1A1A1A',
    inkSoft: '#6B6572',
    divider: '#ECE9F1',
  },
  // Scrim behind modal sheets. Replaces 'rgba(11, 8, 16, 0.72)'.
  overlay: {
    scrim: 'rgba(11, 8, 16, 0.72)',
  },
  // 1px separators. Replaces 'rgba(255, 255, 255, 0.16)'.
  hairline: {
    onDark: 'rgba(255, 255, 255, 0.16)',
  },
  // Skeleton placeholder blocks. Replaces SKELETON_BONE 'rgba(255, 255, 255, 0.08)'
  // on dark screens and BONE '#EEEBF2' on the light ticket.
  bone: {
    onDark: 'rgba(255, 255, 255, 0.08)',
    onLight: '#EEEBF2',
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
