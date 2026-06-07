import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { SHORTCUTS, ShortcutGroup } from '../../lib/shortcuts';

export function ShortcutsModal() {
  const theme = useUIStore((s) => s.theme);
  const showShortcutsModal = useUIStore((s) => s.showShortcutsModal);
  const hideModal = useUIStore((s) => s.hideModal);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape
  useEffect(() => {
    if (!showShortcutsModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideModal('shortcuts');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showShortcutsModal, hideModal]);

  if (!showShortcutsModal) return null;

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const tabActiveBg = theme === 'dark' ? '#3a4a57' : '#f0f0f0';

  const currentGroup = SHORTCUTS[activeTab];
  const filtered = currentGroup.shortcuts.filter(
    (s) =>
      s.keys.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      onClick={() => hideModal('shortcuts')}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: textColor, fontSize: '18px' }}>Keyboard Shortcuts</h2>
          <button
            onClick={() => hideModal('shortcuts')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: labelColor,
            }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}` }}>
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: `1px solid ${borderColor}`,
              borderRadius: '4px',
              backgroundColor: theme === 'dark' ? '#1e2530' : '#ffffff',
              color: textColor,
              fontSize: '12px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${borderColor}`,
            overflow: 'auto',
          }}
        >
          {SHORTCUTS.map((group, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: activeTab === idx ? tabActiveBg : 'transparent',
                border: 'none',
                color: textColor,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === idx ? '600' : '400',
                whiteSpace: 'nowrap',
              }}
            >
              {group.category}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {filtered.length === 0 ? (
            <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>
              No shortcuts matching "{searchTerm}"
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {filtered.map((shortcut, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px',
                    backgroundColor: theme === 'dark' ? '#1e2530' : '#f9f9f9',
                    borderRadius: '4px',
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#4d8dff', marginBottom: '4px' }}>
                    {shortcut.keys}
                  </div>
                  <div style={{ fontSize: '12px', color: textColor }}>
                    {shortcut.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${borderColor}`,
            fontSize: '10px',
            color: labelColor,
            textAlign: 'center',
          }}
        >
          Press Esc to close
        </div>
      </div>
    </div>
  );
}
