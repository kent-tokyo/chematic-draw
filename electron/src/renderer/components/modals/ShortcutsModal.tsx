import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_SHORTCUT_BINDINGS, SHORTCUTS, displayShortcut, normalizeShortcut, validateShortcutBindings } from '../../lib/shortcuts';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export function ShortcutsModal() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const showShortcutsModal = useUIStore((s) => s.showShortcutsModal);
  const hideModal = useUIStore((s) => s.hideModal);
  const shortcutBindings = useUIStore((s) => s.shortcutBindings);
  const setShortcutBindings = useUIStore((s) => s.setShortcutBindings);
  const resetShortcutBindings = useUIStore((s) => s.resetShortcutBindings);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [draft, setDraft] = useState(shortcutBindings);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useFocusTrap(showShortcutsModal);

  useEffect(() => {
    if (showShortcutsModal) {
      const currentBindings = useUIStore.getState().shortcutBindings;
      // Opening the modal is the synchronization boundary; edits are not
      // overwritten by unrelated binding updates while it remains open.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(currentBindings);
      setError(null);
    }
  }, [showShortcutsModal]);

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
      (s.action ? displayShortcut(draft[s.action]) : s.keys).toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        tabIndex={-1}
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
          <h2 id="shortcuts-modal-title" style={{ margin: 0, color: textColor, fontSize: '18px' }}>{language === 'ja' ? 'キーボードショートカット' : 'Keyboard Shortcuts'}</h2>
          <button
            onClick={() => hideModal('shortcuts')}
            aria-label={language === 'ja' ? '閉じる' : 'Close'}
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
            placeholder={language === 'ja' ? 'ショートカットを検索…' : 'Search shortcuts...'}
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
          role="tablist"
          aria-label={language === 'ja' ? 'ショートカットカテゴリ' : 'Shortcut categories'}
          style={{
            display: 'flex',
            borderBottom: `1px solid ${borderColor}`,
            overflow: 'auto',
          }}
        >
          {SHORTCUTS.map((group, idx) => (
            <button
              key={idx}
              id={`shortcut-tab-${idx}`}
              role="tab"
              aria-selected={activeTab === idx}
              aria-controls={`shortcut-panel-${idx}`}
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
        <div
          id={`shortcut-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`shortcut-tab-${activeTab}`}
          style={{ flex: 1, overflow: 'auto', padding: '16px' }}
        >
          {filtered.length === 0 ? (
            <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>
              {language === 'ja' ? `「${searchTerm}」に一致するショートカットはありません` : `No shortcuts matching "${searchTerm}"`}
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
                    {shortcut.configurable && shortcut.action ? (
                      <input
                        aria-label={`${shortcut.description} shortcut`}
                        value={displayShortcut(draft[shortcut.action])}
                        onChange={(e) => setDraft({ ...draft, [shortcut.action!]: normalizeShortcut(e.target.value).replace(/^(ctrl|cmd)\+/, 'primary+') })}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '3px 5px', color: '#4d8dff', background: 'transparent', border: `1px solid ${borderColor}`, borderRadius: '3px', fontWeight: '600' }}
                      />
                    ) : shortcut.keys}
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
          <div style={{ minHeight: '16px', color: '#d9534f', marginBottom: '6px' }}>{error}</div>
        <button onClick={() => { resetShortcutBindings(); setDraft({ ...DEFAULT_SHORTCUT_BINDINGS }); setError(null); }} style={{ marginRight: '8px', padding: '5px 10px' }}>{language === 'ja' ? '初期設定に戻す' : 'Reset defaults'}</button>
        <button onClick={() => { const validation = validateShortcutBindings(draft); if (validation) { setError(validation); return; } setShortcutBindings(draft); setError(null); }} style={{ padding: '5px 10px' }}>{language === 'ja' ? 'ショートカットを保存' : 'Save shortcuts'}</button>
        <div style={{ marginTop: '8px' }}>{language === 'ja' ? 'Ctrl+Shift+S の形式で入力してください（macOSではCmdが自動的に使われます）。' : 'Enter shortcuts as Ctrl+Shift+S (Cmd is used automatically on macOS).'}</div>
        </div>
      </div>
    </div>
  );
}
