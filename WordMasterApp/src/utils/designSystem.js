/**
 * Design System
 * Consistent design tokens for spacing, colors, typography, and shadows
 */

// Spacing (8px grid system)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

// Colors
export const colors = {
  // Primary
  primary: '#3498DB',
  primaryDark: '#2980B9',
  primaryLight: '#5DADE2',
  
  // Secondary
  secondary: '#2ECC71',
  secondaryDark: '#27AE60',
  secondaryLight: '#58D68D',
  
  // Accent
  accent: '#E74C3C',
  accentDark: '#C0392B',
  accentLight: '#EC7063',
  
  // Warning
  warning: '#F39C12',
  warningDark: '#E67E22',
  warningLight: '#F8C471',
  
  // Success
  success: '#27AE60',
  successDark: '#229954',
  successLight: '#52BE80',
  
  // Error
  error: '#E74C3C',
  errorDark: '#C0392B',
  errorLight: '#EC7063',
  
  // Neutrals
  black: '#2C3E50',
  darkGray: '#34495E',
  gray: '#7F8C8D',
  lightGray: '#95A5A6',
  veryLightGray: '#BDC3C7',
  offWhite: '#ECF0F1',
  almostWhite: '#F5F7FA',
  white: '#FFFFFF',
  
  // Special
  streak: '#FF6B35',
  streakBg: '#FFF5E6',
  streakBorder: '#FFB84D',
  
  // Achievement Rarities
  common: '#95A5A6',
  uncommon: '#27AE60',
  rare: '#3498DB',
  epic: '#9B59B6',
  legendary: '#F39C12',
};

// Typography
export const typography = {
  // Font Sizes
  fontSize: {
    tiny: 10,
    small: 12,
    body: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
    huge: 28,
    massive: 32,
    hero: 36,
  },
  
  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

// Shadows
export const shadows = {
  // Small shadow (cards, buttons)
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Medium shadow (elevated cards)
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Large shadow (modals, popups)
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Colored shadows
  primary: {
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  
  success: {
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

// Border Radius
export const borderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 16,
  xxlarge: 20,
  round: 999,
};

// Opacity
export const opacity = {
  disabled: 0.5,
  overlay: 0.6,
  subtle: 0.8,
};

// Z-Index
export const zIndex = {
  base: 0,
  dropdown: 10,
  overlay: 100,
  modal: 1000,
  toast: 10000,
};

// Animation Durations
export const duration = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Card Styles (reusable)
export const cardStyles = {
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    ...shadows.small,
  },
  
  cardElevated: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.xl,
    ...shadows.medium,
  },
  
  cardHighlight: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xlarge,
    padding: spacing.xl,
    ...shadows.primary,
  },
};

// Button Styles (reusable)
export const buttonStyles = {
  primary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  
  secondary: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  
  success: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.success,
  },
  
  danger: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    alignItems: 'center',
  },
};

// Text Styles (reusable)
export const textStyles = {
  heading1: {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  
  heading2: {
    fontSize: typography.fontSize.huge,
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
  },
  
  heading3: {
    fontSize: typography.fontSize.xxlarge,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
  },
  
  body: {
    fontSize: typography.fontSize.medium,
    color: colors.darkGray,
    lineHeight: typography.fontSize.medium * typography.lineHeight.normal,
  },
  
  bodySmall: {
    fontSize: typography.fontSize.body,
    color: colors.gray,
    lineHeight: typography.fontSize.body * typography.lineHeight.normal,
  },
  
  caption: {
    fontSize: typography.fontSize.small,
    color: colors.lightGray,
  },
};

export default {
  spacing,
  colors,
  typography,
  shadows,
  borderRadius,
  opacity,
  zIndex,
  duration,
  cardStyles,
  buttonStyles,
  textStyles,
};
