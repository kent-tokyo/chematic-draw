import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { Icon, IconName } from '../common/Icon';
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
import type { BatchResultSummary } from '../../store/uiStore';

export function Sidebar({ onRetryBatch }: { onRetryBatch?: (result: BatchResultSummary) => Promise<void> | void }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const activeSidebarPanel = useUIStore((s) => s.activeSidebarPanel);
  const setActiveSidebarPanel = useUIStore((s) => s.setActiveSidebarPanel);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const batchResults = useUIStore((s) => s.batchResults);

  if (!sidebarOpen) return null;

  interface SidebarTab {
    id: string;
    shortLabel: string;
    accessibleLabel: string;
    icon: IconName;
    badge?: number;
  }

  const tabs: SidebarTab[] = [
    { id: 'inspector', shortLabel: language === 'ja' ? '検査' : 'Inspector', accessibleLabel: language === 'ja' ? 'インスペクター' : 'Inspector', icon: 'search' },
    { id: 'templates', shortLabel: language === 'ja' ? 'テンプレート' : 'Templates', accessibleLabel: language === 'ja' ? 'テンプレート' : 'Templates', icon: 'templates' },
    { id: 'reactions', shortLabel: language === 'ja' ? '反応' : 'Reactions', accessibleLabel: language === 'ja' ? '反応' : 'Reactions', icon: 'reactions' },
    { id: 'batch-results', shortLabel: language === 'ja' ? '一括' : 'Batch', accessibleLabel: language === 'ja' ? '一括処理結果' : 'Batch results', icon: 'batch', badge: batchResults.length > 0 ? batchResults.length : undefined },
    { id: 'stereoisomers', shortLabel: language === 'ja' ? '立体' : 'Stereo', accessibleLabel: language === 'ja' ? '立体化学' : 'Stereochemistry', icon: 'stereoisomers' },
    { id: 'lipinski', shortLabel: 'Lipinski', accessibleLabel: language === 'ja' ? 'Lipinskiルール' : 'Lipinski rules', icon: 'lipinski' },
    { id: 'properties', shortLabel: language === 'ja' ? '物性' : 'Props', accessibleLabel: language === 'ja' ? '物性予測' : 'Property prediction', icon: 'properties' },
    { id: 'mechanism', shortLabel: language === 'ja' ? '機構' : 'Mech', accessibleLabel: language === 'ja' ? '反応機構' : 'Reaction mechanism', icon: 'mechanism' },
    { id: '3d', shortLabel: '3D', accessibleLabel: language === 'ja' ? '3Dビューア' : '3D viewer', icon: 'database' },
    { id: 'database', shortLabel: language === 'ja' ? 'DB検索' : 'DB', accessibleLabel: language === 'ja' ? 'データベース検索' : 'Database search', icon: 'database' },
    { id: 'research', shortLabel: language === 'ja' ? '識別子' : 'Research', accessibleLabel: language === 'ja' ? '研究用識別子' : 'Research identifiers', icon: 'research' },
    { id: 'chat', shortLabel: language === 'ja' ? '相談' : 'Chat', accessibleLabel: language === 'ja' ? 'アシスタントチャット' : 'Assistant chat', icon: 'chat' },
  ];
  const tabGroups = [
    { label: language === 'ja' ? '編集' : 'Edit', ids: ['inspector', 'templates', 'reactions'] },
    { label: language === 'ja' ? '解析' : 'Analyze', ids: ['batch-results', 'stereoisomers', 'lipinski', 'properties', 'mechanism', '3d'] },
    { label: language === 'ja' ? '連携' : 'Connect', ids: ['database', 'research', 'chat'] },
  ];

  const bgColor = theme === 'dark' ? '#21252c' : '#f3f5f8';
  const borderColor = theme === 'dark' ? '#3a3a3a' : '#e0e0e0';
  const tabActiveBg = theme === 'dark' ? '#2f3a47' : '#e4e9f1';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const tabIds = tabs.map((tab) => tab.id);
  const moveTab = (currentId: string, offset: number) => {
    const currentIndex = tabIds.indexOf(currentId);
    const nextIndex = (currentIndex + offset + tabIds.length) % tabIds.length;
    const nextId = tabIds[nextIndex];
    setActiveSidebarPanel(nextId as Parameters<typeof setActiveSidebarPanel>[0]);
    document.getElementById(`sidebar-tab-${nextId}`)?.focus();
  };

  return (
    <div
      data-testid="sidebar"
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
        role="tablist"
        aria-label={language === 'ja' ? 'サイドバーパネル' : 'Sidebar panels'}
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderBottom: `1px solid ${borderColor}`,
          padding: '4px',
          gap: '2px',
        }}
      >
        {tabGroups.map((group) => (
          <div key={group.label} style={{ minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <span style={{ width: '100%', padding: '3px 4px 1px', color: textColor, opacity: 0.55, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</span>
            {group.ids.map((id) => {
              const tab = tabs.find((candidate) => candidate.id === id)!;
              return (
                <button
                  key={tab.id}
                  data-testid={`sidebar-tab-${tab.id}`}
                  id={`sidebar-tab-${tab.id}`}
                  role="tab"
                  aria-selected={activeSidebarPanel === tab.id}
                  aria-controls={`sidebar-panel-${tab.id}`}
                  aria-label={tab.accessibleLabel}
                  tabIndex={activeSidebarPanel === tab.id ? 0 : -1}
                  onClick={() => setActiveSidebarPanel(tab.id as Parameters<typeof setActiveSidebarPanel>[0])}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      moveTab(tab.id, 1);
                    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      moveTab(tab.id, -1);
                    }
                  }}
                  style={{ flex: '1 1 0', minWidth: '72px', padding: '7px 4px', fontSize: '11px', border: 'none', backgroundColor: activeSidebarPanel === tab.id ? tabActiveBg : 'transparent', color: textColor, cursor: 'pointer', borderRadius: '3px', transition: 'background-color 0.2s', position: 'relative' }}
                  title={tab.accessibleLabel}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <Icon name={tab.icon} size={20} color={textColor} />
                    <span aria-hidden="true">{tab.shortLabel}</span>
                  </div>
                  {tab.badge && <span style={{ position: 'absolute', top: 2, right: 2, backgroundColor: '#4d8dff', color: 'white', fontSize: '9px', borderRadius: '50%', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
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
      <div
        data-testid={`sidebar-panel-${activeSidebarPanel}`}
        id={`sidebar-panel-${activeSidebarPanel}`}
        role="tabpanel"
        aria-labelledby={`sidebar-tab-${activeSidebarPanel}`}
        style={{ flex: 1, overflow: 'auto', padding: '12px' }}
      >
        {activeSidebarPanel === 'inspector' && <InspectorPanel />}
        {activeSidebarPanel === 'templates' && <TemplatesPanel />}
        {activeSidebarPanel === 'reactions' && <ReactionPanel />}
        {activeSidebarPanel === 'batch-results' && <BatchResultPanel results={batchResults} onRetry={onRetryBatch} />}
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
