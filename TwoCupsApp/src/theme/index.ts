export const colors = {
  // Primary colors
  primary: '#8B5CF6',      // Purple
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',

  // Background colors (dark theme)
  background: '#0F0F0F',
  surface: '#1A1A1A',
  card: '#242424',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  textOnPrimary: '#FFFFFF',

  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',

  // Additional color variants for History redesign
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  emerald400: '#34D399',
  emerald500: '#10B981',
  backgroundDeep: '#0a0a0f',

  // Cup colors
  cupEmpty: '#333333',
  cupFilled: '#FFD700',
  gem: '#A855F7',

  // Border colors
  border: '#333333',
  borderLight: '#2A2A2A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font family constants
export const fonts = {
  regular: 'OpenDyslexic-Regular',
  bold: 'OpenDyslexic-Bold',
  italic: 'OpenDyslexic-Italic',
  boldItalic: 'OpenDyslexic-BoldItalic',
};

// Helper to get font family based on weight
// Use this instead of fontWeight when working with custom fonts
export const getFontFamily = (weight: '300' | '400' | '500' | '600' | '700' | 'normal' | 'bold' = '400') => {
  switch (weight) {
    case '600':
    case '700':
    case 'bold':
      return fonts.bold;
    case '300':
    case '400':
    case '500':
    case 'normal':
    default:
      return fonts.regular;
  }
};

// Base typography values (at scale 1.0)
const baseTypography = {
  h1: { fontSize: 32, fontFamily: fonts.bold, lineHeight: 40 },
  h2: { fontSize: 24, fontFamily: fonts.bold, lineHeight: 32 },
  h3: { fontSize: 20, fontFamily: fonts.bold, lineHeight: 28 },
  body: { fontSize: 16, fontFamily: fonts.regular, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontFamily: fonts.regular, lineHeight: 20 },
  caption: { fontSize: 12, fontFamily: fonts.regular, lineHeight: 16 },
  button: { fontSize: 16, fontFamily: fonts.bold, lineHeight: 24 },
};

// Default typography export (medium size)
export const typography = baseTypography;

// Function to get scaled typography
export const getScaledTypography = (scale: number) => ({
  h1: {
    fontSize: Math.round(baseTypography.h1.fontSize * scale),
    fontFamily: baseTypography.h1.fontFamily,
    lineHeight: Math.round(baseTypography.h1.lineHeight * scale),
  },
  h2: {
    fontSize: Math.round(baseTypography.h2.fontSize * scale),
    fontFamily: baseTypography.h2.fontFamily,
    lineHeight: Math.round(baseTypography.h2.lineHeight * scale),
  },
  h3: {
    fontSize: Math.round(baseTypography.h3.fontSize * scale),
    fontFamily: baseTypography.h3.fontFamily,
    lineHeight: Math.round(baseTypography.h3.lineHeight * scale),
  },
  body: {
    fontSize: Math.round(baseTypography.body.fontSize * scale),
    fontFamily: baseTypography.body.fontFamily,
    lineHeight: Math.round(baseTypography.body.lineHeight * scale),
  },
  bodySmall: {
    fontSize: Math.round(baseTypography.bodySmall.fontSize * scale),
    fontFamily: baseTypography.bodySmall.fontFamily,
    lineHeight: Math.round(baseTypography.bodySmall.lineHeight * scale),
  },
  caption: {
    fontSize: Math.round(baseTypography.caption.fontSize * scale),
    fontFamily: baseTypography.caption.fontFamily,
    lineHeight: Math.round(baseTypography.caption.lineHeight * scale),
  },
  button: {
    fontSize: Math.round(baseTypography.button.fontSize * scale),
    fontFamily: baseTypography.button.fontFamily,
    lineHeight: Math.round(baseTypography.button.lineHeight * scale),
  },
});

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
};

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  fonts,
};
