import React from 'react';

export type IconName =
  | 'search' | 'templates' | 'reactions' | 'batch' | 'stereoisomers'
  | 'lipinski' | 'properties' | 'mechanism' | 'database' | 'research' | 'chat'
  | 'check' | 'cross' | 'warning' | 'info' | 'settings' | 'menu' | 'close'
  | 'chevron-down' | 'chevron-up' | 'plus' | 'minus' | 'copy' | 'paste'
  | 'play' | 'pause' | 'download' | 'upload' | 'trash' | 'edit';

export interface IconProps {
  name: IconName;
  size?: 16 | 20 | 24 | 32;
  color?: string;
  className?: string;
}

// Safe SVG icon components (no dangerouslySetInnerHTML)
const Icons: Record<IconName, React.FC<{ color: string }>> = {
  search: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  templates: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  reactions: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="9" cy="9" r="1.5" fill={color} />
      <circle cx="15" cy="9" r="1.5" fill={color} />
      <path d="M8 15c1 1 2 1.5 4 1.5s3-.5 4-1.5" />
    </svg>
  ),
  batch: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <rect x="3" y="3" width="4" height="4" />
      <rect x="9" y="3" width="4" height="4" />
      <rect x="15" y="3" width="4" height="4" />
      <rect x="3" y="9" width="4" height="4" />
      <rect x="9" y="9" width="4" height="4" />
      <rect x="15" y="9" width="4" height="4" />
    </svg>
  ),
  stereoisomers: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M12 3l8 4v8l-8 4-8-4v-8l8-4" />
      <path d="M4 7l8 4 8-4" />
      <path d="M4 15l8 4 8-4" />
    </svg>
  ),
  lipinski: ({ color }) => (
    <svg viewBox="0 0 24 24" fill={color}>
      <path d="M3 13h2v8H3v-2m4-8h2v16H7V7m4-2h2v18h-2V5m4-2h2v20h-2V3m4 4h2v16h-2v-16z" />
    </svg>
  ),
  properties: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <line x1="3" y1="6" x2="3" y2="20" strokeWidth="3" />
      <line x1="8" y1="6" x2="8" y2="20" strokeWidth="3" />
      <line x1="13" y1="6" x2="13" y2="20" strokeWidth="3" />
      <line x1="18" y1="6" x2="18" y2="20" strokeWidth="3" />
    </svg>
  ),
  mechanism: ({ color }) => (
    <svg viewBox="0 0 24 24" fill={color}>
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  ),
  database: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <line x1="4" y1="12" x2="4" y2="17" />
      <line x1="20" y1="12" x2="20" y2="17" />
      <ellipse cx="12" cy="19" rx="8" ry="3" />
    </svg>
  ),
  research: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <circle cx="11" cy="11" r="4" fill="none" />
    </svg>
  ),
  chat: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  ),
  check: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  cross: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: ({ color }) => (
    <svg viewBox="0 0 24 24" fill={color}>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  ),
  info: ({ color }) => (
    <svg viewBox="0 0 24 24" fill={color}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" stroke="white" strokeWidth={2} fill="none" />
    </svg>
  ),
  settings: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m3.08-3.08l4.24-4.24M19.78 19.78l-4.24-4.24M19.78 4.22l-4.24 4.24" />
    </svg>
  ),
  menu: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  'chevron-down': ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  'chevron-up': ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  plus: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  minus: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  copy: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  paste: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  play: ({ color }) => (
    <svg viewBox="0 0 24 24" fill={color}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  pause: ({ color }) => (
    <svg viewBox="0 0 24 24" fill={color}>
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  download: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  upload: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  trash: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  edit: ({ color }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
};

export function Icon({ name, size = 24, color = 'currentColor', className }: IconProps) {
  const IconComponent = Icons[name];
  if (!IconComponent) return null;

  return (
    <div style={{ display: 'inline-flex', width: size, height: size }}>
      <IconComponent color={color} />
    </div>
  );
}
