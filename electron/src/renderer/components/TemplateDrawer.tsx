import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';
import { TemplatesPanel } from './sidebar/TemplatesPanel';

export function TemplateDrawer() {
  const open = useUIStore((state) => state.templatePanelOpen);
  const width = useUIStore((state) => state.templatePanelWidth);
  const setOpen = useUIStore((state) => state.setTemplatePanelOpen);
  const setWidth = useUIStore((state) => state.setTemplatePanelWidth);
  const language = useUIStore((state) => state.language);
  const resizing = useRef(false);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!resizing.current) return;
      const drawer = document.querySelector<HTMLElement>('[data-testid="template-drawer"]');
      if (drawer) setWidth(event.clientX - drawer.getBoundingClientRect().left);
    };
    const up = () => { resizing.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [setWidth]);

  if (!open) return null;
  return (
    <aside className="template-drawer" data-testid="template-drawer" style={{ width }} aria-label={language === 'ja' ? 'テンプレート' : 'Templates'}>
      <header className="template-drawer-header">
        <strong>{language === 'ja' ? 'テンプレート' : 'Templates'}</strong>
        <button type="button" onClick={() => setOpen(false)} aria-label={language === 'ja' ? 'テンプレートを閉じる' : 'Close Templates'}>×</button>
      </header>
      <div className="template-drawer-content"><TemplatesPanel /></div>
      <div className="template-drawer-resizer" role="separator" aria-orientation="vertical" aria-label={language === 'ja' ? 'テンプレート幅を変更' : 'Resize Templates'} onMouseDown={() => { resizing.current = true; }} />
    </aside>
  );
}
