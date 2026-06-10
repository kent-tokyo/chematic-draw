import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { Icon } from '../common/Icon';
import { InspectorPanel } from './InspectorPanel';
import { TemplatesPanel } from './TemplatesPanel';
import { ResearchPanel } from './ResearchPanel';
import { ChatPanel } from './ChatPanel';
import { ReactionPanel } from './ReactionPanel';
import { BatchResultPanel } from './BatchResultPanel';
import { StereoisomerPanel } from './StereoisomerPanel';
import { LipinskiPanel } from './LipinskiPanel';
import { PropertyPredictionPanel } from './PropertyPredictionPanel';
import { MechanismPanel } from './MechanismPanel';
import { DatabaseSearchPanel } from './DatabaseSearchPanel';
import { Viewer3DPanel } from './Viewer3DPanel';

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const activeSidebarPanel = useUIStore((s) => s.activeSidebarPanel);
  const setActiveSidebarPanel = useUIStore((s) => s.setActiveSidebarPanel);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const theme = useUIStore((s) => s.theme);

  if (!sidebarOpen) return null;

  const batchResults = useUIStore((s) => s.batchResults);

  const tabs = [
    { id: 'inspector', label: 'Inspector', icon: 'search' as const },
    { id: 'templates', label: 'Templates', icon: 'templates' as const },
    { id: 'reactions', label: 'Reactions', icon: 'reactions' as const },
    { id: 'batch-results', label: 'Batch', icon: 'batch' as const, badge: batchResults.length > 0 ? batchResults.length : undefined },
    { id: 'stereoisomers', label: 'Stereo', icon: 'stereoisomers' as const },
    { id: 'lipinski', label: 'Lipinski', icon: 'lipinski' as const },
    { id: 'properties', label: 'Props', icon: 'properties' as const },
    { id: 'mechanism', label: 'Mech', icon: 'mechanism' as const },
    { id: '3d', label: '3D', icon: 'database' as const },
    { id: 'database', label: 'DB', icon: 'database' as const },
    { id: 'research', label: 'Research', icon: 'research' as const },
    { id: 'chat', label: 'Chat', icon: 'chat' as const },
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
              position: 'relative',
            }}
            title={tab.label}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Icon name={tab.icon} size={20} color={textColor} />
              <span>{tab.label}</span>
            </div>
            {tab.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: '#4d8dff',
                  color: 'white',
                  fontSize: '9px',
                  borderRadius: '50%',
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            padding: '4px 6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: textColor,
            cursor: 'pointer',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close sidebar"
        >
          <Icon name="close" size={20} color={textColor} />
        </button>
      </div>

      {/* Content Panel */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {activeSidebarPanel === 'inspector' && <InspectorPanel />}
        {activeSidebarPanel === 'templates' && <TemplatesPanel />}
        {activeSidebarPanel === 'reactions' && <ReactionPanel />}
        {activeSidebarPanel === 'batch-results' && <BatchResultPanel results={batchResults} />}
        {activeSidebarPanel === 'stereoisomers' && <StereoisomerPanel />}
        {activeSidebarPanel === 'lipinski' && <LipinskiPanel />}
        {activeSidebarPanel === 'properties' && <PropertyPredictionPanel />}
        {activeSidebarPanel === 'mechanism' && <MechanismPanel />}
        {activeSidebarPanel === '3d' && <Viewer3DPanel />}
        {activeSidebarPanel === 'database' && <DatabaseSearchPanel />}
        {activeSidebarPanel === 'research' && <ResearchPanel />}
        {activeSidebarPanel === 'chat' && <ChatPanel />}
      </div>
    </div>
  );
}
