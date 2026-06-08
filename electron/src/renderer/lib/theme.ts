export const darkTheme = {
  bg: '#1e1e1e',
  bgPanel: '#21252c',
  bgSection: '#2f3a47',
  bgHover: '#3a4a57',
  bgActive: '#4d8dff',
  border: '#3a3a3a',
  text: '#d8deea',
  textMuted: '#9ca3af',
  divider: '#383838',
} as const;

export const lightTheme = {
  bg: '#ffffff',
  bgPanel: '#f3f5f8',
  bgSection: '#e4e9f1',
  bgHover: '#f0f0f0',
  bgActive: '#4d8dff',
  border: '#e0e0e0',
  text: '#1d2430',
  textMuted: '#6b7280',
  divider: '#f0f0f0',
} as const;

export const colors = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

export function getTheme(isDark: boolean) {
  return isDark ? darkTheme : lightTheme;
}
