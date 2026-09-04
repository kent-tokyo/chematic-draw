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
  const hideModal = useUIStore((s) => s.hideModal);
  const t = copy[language];

  return (
    <Modal
      isOpen={isOpen}
      title={t.title}
      onClose={() => hideModal('settings')}
      isDark={theme === 'dark'}
      width={440}
      height={250}
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
      </div>
    </Modal>
  );
}
