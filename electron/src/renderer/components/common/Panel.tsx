import React from 'react';
import { getTheme } from '../../lib/theme';

export interface PanelProps {
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}

export interface SectionProps {
  title?: string;
  isDark: boolean;
  children: React.ReactNode;
}

export function Panel({ title, isDark, children }: PanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: getTheme(isDark).text }}>
        {title}
      </h3>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
  );
}

export function Section({ title, isDark, children }: SectionProps) {
  const theme = getTheme(isDark);
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: theme.bgSection,
        borderRadius: '4px',
        border: `1px solid ${theme.border}`,
      }}
    >
      {title && <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: theme.text }}>{title}</h4>}
      {children}
    </div>
  );
}
