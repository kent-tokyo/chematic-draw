import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';

interface ArrowTypeDialogProps {
  onSelect: (type: 'forward' | 'retro' | 'resonance') => void;
  onCancel: () => void;
}

export function ArrowTypeDialog({ onSelect, onCancel }: ArrowTypeDialogProps) {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#2f3a47' : '#f5f5f5';
  const borderColor = isDark ? '#444' : '#ddd';
  const textColor = isDark ? '#d8deea' : '#333';
  const btnHoverBg = isDark ? '#3a4557' : '#e0e0e0';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '24px',
          minWidth: '300px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 'bold', color: textColor }}>
          Select Arrow Type
        </div>
        <div style={{ marginBottom: '16px', fontSize: '12px', color: textColor, opacity: 0.8 }}>
          What type of electron flow?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => onSelect('forward')}
            style={{
              padding: '10px',
              backgroundColor: '#4d8dff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#3d7de5';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#4d8dff';
            }}
          >
            → Forward (Standard mechanism)
          </button>

          <button
            onClick={() => onSelect('retro')}
            style={{
              padding: '10px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#e55555';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#ff6b6b';
            }}
          >
            ⇌ Retro (Reverse/equilibrium)
          </button>

          <button
            onClick={() => onSelect('resonance')}
            style={{
              padding: '10px',
              backgroundColor: '#51cf66',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#41b556';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#51cf66';
            }}
          >
            ↔ Resonance (Delocalization)
          </button>
        </div>

        <button
          onClick={onCancel}
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: 'transparent',
            color: textColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            width: '100%',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = btnHoverBg;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
