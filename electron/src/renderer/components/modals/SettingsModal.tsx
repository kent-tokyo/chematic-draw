import React from 'react';
import { Modal } from '../common/Modal';
import { useUIStore, AppLanguage } from '../../store/uiStore';

const copy: Record<AppLanguage, { title: string; language: string; hint: string; close: string; options: Record<AppLanguage, string> }> = {
  en: { title: 'Settings', language: 'Interface language', hint: 'Changes apply immediately and are saved for the next launch.', close: 'Close', options: { en: 'English', ja: '日本語', zh: '简体中文' } },
  ja: { title: '環境設定', language: '表示言語', hint: '変更はすぐに反映され、次回起動時にも保持されます。', close: '閉じる', options: { en: 'English', ja: '日本語', zh: '简体中文' } },
  zh: { title: '设置', language: '界面语言', hint: '更改会立即生效，并保存到下次启动。', close: '关闭', options: { en: 'English', ja: '日本語', zh: '简体中文' } },
};

export function SettingsModal() {
  const isOpen = useUIStore((s) => s.showSettingsModal);
  const language = useUIStore((s) => s.language);
  const theme = useUIStore((s) => s.theme);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const workspaceProfile = useUIStore((s) => s.workspaceProfile);
  const setWorkspaceProfile = useUIStore((s) => s.setWorkspaceProfile);
  const resetWorkspace = useUIStore((s) => s.resetWorkspace);
  const hideModal = useUIStore((s) => s.hideModal);
  const t = copy[language];

  return (
    <Modal
      isOpen={isOpen}
      title={t.title}
      onClose={() => hideModal('settings')}
      isDark={theme === 'dark'}
      width={440}
      height={370}
      actions={[{ label: t.close, onClick: () => hideModal('settings'), variant: 'primary' }]}
    >
      <div style={{ display: 'grid', gap: '10px' }}>
        <label htmlFor="language-select" style={{ fontWeight: 600, fontSize: '13px' }}>{t.language}</label>
        <select
          id="language-select"
          data-testid="language-select"
          aria-label={t.language}
          value={language}
          onChange={(event) => setLanguage(event.target.value as AppLanguage)}
          style={{ padding: '8px', borderRadius: '4px', fontSize: '13px' }}
        >
          {(Object.keys(t.options) as AppLanguage[]).map((option) => <option key={option} value={option}>{t.options[option]}</option>)}
        </select>
        <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>{t.hint}</p>
        <label htmlFor="workspace-profile" style={{ marginTop: '10px', fontWeight: 600, fontSize: '13px' }}>
          {language === 'ja' ? 'ワークスペース' : language === 'zh' ? '工作区' : 'Workspace'}
        </label>
        <select
          id="workspace-profile"
          data-testid="workspace-profile"
          aria-label={language === 'ja' ? 'ワークスペースプロファイル' : 'Workspace profile'}
          value={workspaceProfile}
          onChange={(event) => setWorkspaceProfile(event.target.value as 'chemdraw' | 'compact')}
          style={{ padding: '8px', borderRadius: '4px', fontSize: '13px' }}
        >
          <option value="chemdraw">ChemDraw familiar</option>
          <option value="compact">Compact</option>
        </select>
        <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
          {language === 'ja'
            ? 'ChemDraw familiar は左ツール、中央キャンバス、右プロパティの配置です。'
            : 'ChemDraw familiar keeps drawing tools left, the canvas centered, and properties right.'}
        </p>
        <button
          type="button"
          data-testid="reset-workspace"
          onClick={resetWorkspace}
          style={{ justifySelf: 'start', padding: '7px 10px' }}
        >
          {language === 'ja' ? 'ワークスペースを初期配置に戻す' : language === 'zh' ? '重置工作区' : 'Reset Workspace'}
        </button>
      </div>
    </Modal>
  );
}
