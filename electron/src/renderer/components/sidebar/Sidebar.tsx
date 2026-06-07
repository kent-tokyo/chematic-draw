import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { InspectorPanel } from './InspectorPanel';
import { TemplatesPanel } from './TemplatesPanel';
import { ResearchPanel } from './ResearchPanel';
import { ChatPanel } from './ChatPanel';

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const activeSidebarPanel = useUIStore((s) => s.activeSidebarPanel);
  const setActiveSidebarPanel = useUIStore((s) => s.setActiveSidebarPanel);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const theme = useUIStore((s) => s.theme);

  if (!sidebarOpen) return null;

  const tabs = [
    { id: 'inspector', label: '🔍 Inspector' },
    { id: 'templates', label: '🧪 Templates' },
    { id: 'research', label: '📊 Research' },
    { id: 'chat', label: '💬 Chat' },
  ] as const;

  const bgColor = theme === 'dark' ? '#21252c' : '#f3f5f8';
  const borderColor = theme === 'dark' ? '#3a3a3a' : '#e0e0e0';
  const tabActiveBg = theme === 'dark' ? '#2f3a47' : '#e4e9f1';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';

  return (
    <div
      style={{
        width: `${sidebarWidth}px`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: bgColor,
        borderRight: `1px solid ${borderColor}`,
        overflow: 'hidden',
      }}
    >
      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${borderColor}`,
          padding: '0 4px',
          gap: '4px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSidebarPanel(tab.id as any)}
            style={{
              flex: 1,
              padding: '8px 6px',
              fontSize: '11px',
              border: 'none',
              backgroundColor: activeSidebarPanel === tab.id ? tabActiveBg : 'transparent',
              color: textColor,
              cursor: 'pointer',
              borderRadius: '3px',
              transition: 'background-color 0.2s',
            }}
            title={tab.label}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            padding: '4px 6px',
            fontSize: '14px',
            border: 'none',
            backgroundColor: 'transparent',
            color: textColor,
            cursor: 'pointer',
            opacity: 0.6,
          }}
          title="Close sidebar"
        >
          ✕
        </button>
      </div>

      {/* Content Panel */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {activeSidebarPanel === 'inspector' && <InspectorPanel />}
        {activeSidebarPanel === 'templates' && <TemplatesPanel />}
        {activeSidebarPanel === 'research' && <ResearchPanel />}
        {activeSidebarPanel === 'chat' && <ChatPanel />}
      </div>
    </div>
  );
}
