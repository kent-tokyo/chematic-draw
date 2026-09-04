import React from 'react';
import { Icon } from './Icon';
import { getTheme } from '../../lib/theme';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  isDark: boolean;
  width?: number;
  height?: number;
  actions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' }[];
}

export function Modal({ isOpen, title, onClose, children, isDark, width = 600, height = 400, actions }: ModalProps) {
  if (!isOpen) return null;

  const theme = getTheme(isDark);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          backgroundColor: theme.bgPanel,
          borderRadius: '8px',
          boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          width: `${width}px`,
          height: `${height}px`,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <h2 id="modal-title" style={{ margin: 0, color: theme.text, fontSize: '14px', fontWeight: 600 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Icon name="close" size={20} color={theme.text} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', color: theme.text }}>
          {children}
        </div>

        {/* Footer (Actions) */}
        {actions && actions.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 16px',
              borderTop: `1px solid ${theme.border}`,
              justifyContent: 'flex-end',
            }}
          >
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor:
                    action.variant === 'primary'
                      ? theme.bgActive
                      : action.variant === 'danger'
                        ? '#ef4444'
                        : theme.bgHover,
                  color: action.variant === 'primary' || action.variant === 'danger' ? 'white' : theme.text,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.opacity = '0.8')}
                onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.opacity = '1')}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
