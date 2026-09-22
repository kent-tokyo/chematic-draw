import React from 'react';
import { Tool } from '../store/types';

type Language = 'en' | 'ja' | 'zh' | string;

interface MainToolsPaletteProps {
  activeTool: string;
  language: Language;
  onSelectTool: (tool: Tool) => void;
  onOpenTemplates: () => void;
}

interface GeneralToolbarProps {
  language: Language;
  theme: string;
  sidebarOpen: boolean;
  mainToolsOpen: boolean;
  undoCount: number;
  redoCount: number;
  selectedAtomCount: number;
  atomCount: number;
  bondCount: number;
  zoom: number;
  primaryModifier: string;
  documentActions?: React.ReactNode;
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onClean: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAlignHorizontal: () => void;
  onAlignVertical: () => void;
  onRotate: () => void;
  onFit: () => void;
  onShowSidebar: () => void;
  onShowMainTools: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onToggleLanguage: () => void;
  onOpenShortcuts: () => void;
}

const translate = (language: Language, english: string, japanese: string, chinese: string) =>
  language === 'ja' ? japanese : language === 'zh' ? chinese : english;

const mainTools = (language: Language) => [
  {
    group: 'selection', tool: Tool.Select, glyph: '↖', label: translate(language, 'Select', '選択', '选择'),
    key: 'ESC', ariaLabel: translate(language, 'Select tool', '選択ツール', '选择工具'),
  },
  {
    group: 'bonds', tool: Tool.Bond_Single, glyph: '─', label: '─',
    key: '1', ariaLabel: translate(language, 'Single bond', '単結合', '单键'),
  },
  {
    group: 'bonds', tool: Tool.Bond_Double, glyph: '═', label: '═',
    key: '2', ariaLabel: translate(language, 'Double bond', '二重結合', '双键'),
  },
  {
    group: 'bonds', tool: Tool.Bond_Triple, glyph: '≡', label: '≡',
    key: '3', ariaLabel: translate(language, 'Triple bond', '三重結合', '三键'),
  },
  {
    group: 'bonds', tool: Tool.Bond_Aromatic, glyph: '◯', label: '◯',
    key: '4', ariaLabel: translate(language, 'Aromatic bond', '芳香族結合', '芳香键'),
  },
  {
    group: 'bonds', tool: Tool.Bond_Wedge, glyph: '◀', label: translate(language, 'Wedge', '実線くさび', '实楔键'),
    key: '', ariaLabel: translate(language, 'Solid wedge bond', '実線くさび結合', '实楔键'),
  },
  {
    group: 'bonds', tool: Tool.Bond_Dash, glyph: '◁', label: translate(language, 'Dash', '破線くさび', '虚楔键'),
    key: '', ariaLabel: translate(language, 'Hashed wedge bond', '破線くさび結合', '虚楔键'),
  },
  {
    group: 'rings', tool: Tool.Ring_5, glyph: '⬠', label: translate(language, '5-ring', '五員環', '五元环'),
    key: '5', ariaLabel: translate(language, 'Five-membered ring', '五員環', '五元环'),
  },
  {
    group: 'rings', tool: Tool.Ring_6, glyph: '⬡', label: translate(language, '6-ring', '六員環', '六元环'),
    key: '6', ariaLabel: translate(language, 'Six-membered ring', '六員環', '六元环'),
  },
  {
    group: 'rings', tool: Tool.Ring_Aromatic, glyph: '⌬', label: translate(language, 'Aromatic ring', '芳香環', '芳香环'),
    key: '', ariaLabel: translate(language, 'Aromatic six-membered ring', '芳香族六員環', '芳香六元环'),
  },
  {
    group: 'atoms', tool: Tool.Atom_C, glyph: 'C', label: 'C', key: 'C',
    ariaLabel: translate(language, 'Carbon atom', '炭素原子', '碳原子'),
  },
  {
    group: 'atoms', tool: Tool.Atom_N, glyph: 'N', label: 'N', key: 'N',
    ariaLabel: translate(language, 'Nitrogen atom', '窒素原子', '氮原子'),
  },
  {
    group: 'atoms', tool: Tool.Atom_O, glyph: 'O', label: 'O', key: 'O',
    ariaLabel: translate(language, 'Oxygen atom', '酸素原子', '氧原子'),
  },
  {
    group: 'atoms', tool: Tool.Atom_S, glyph: 'S', label: 'S', key: 'S',
    ariaLabel: translate(language, 'Sulfur atom', '硫黄原子', '硫原子'),
  },
  {
    group: 'atoms', tool: Tool.Atom_P, glyph: 'P', label: 'P', key: 'P',
    ariaLabel: translate(language, 'Phosphorus atom', 'リン原子', '磷原子'),
  },
  {
    group: 'atoms', tool: Tool.Atom_Label, glyph: 'A', label: translate(language, 'Element', '元素', '元素'), key: '',
    ariaLabel: translate(language, 'Other element label', 'その他の元素ラベル', '其他元素标签'),
  },
  {
    group: 'annotations', tool: Tool.Reaction_Arrow, glyph: '→', label: translate(language, 'Arrow', '反応矢印', '反应箭头'), key: '',
    ariaLabel: translate(language, 'Reaction arrow', '反応矢印', '反应箭头'),
  },
  {
    group: 'annotations', tool: Tool.Text, glyph: 'T', label: translate(language, 'Text', 'テキスト', '文本'), key: '',
    ariaLabel: translate(language, 'Text annotation', 'テキスト注釈', '文本注释'),
  },
  {
    group: 'annotations', tool: Tool.Bracket, glyph: '[ ]', label: translate(language, 'Bracket', '括弧', '括号'), key: '',
    ariaLabel: translate(language, 'Bracket', '括弧', '括号'),
  },
];

export function MainToolsPalette({ activeTool, language, onSelectTool, onOpenTemplates }: MainToolsPaletteProps) {
  const tools = mainTools(language);

  return (
    <div
      className="main-tools-palette"
      role="toolbar"
      aria-orientation="vertical"
      aria-label={translate(language, 'Drawing tools', '描画ツール', '绘图工具')}
      data-testid="main-tools-palette"
    >
      <div className="main-tools-title" aria-hidden="true">
        {translate(language, 'Tools', 'ツール', '工具')}
      </div>
      {tools.map((item, index) => {
        const startsGroup = index > 0 && tools[index - 1].group !== item.group;
        return (
          <React.Fragment key={item.tool}>
            {startsGroup && <span className="main-tools-separator" aria-hidden="true" />}
            <button
              type="button"
              className="main-tool-button"
              onClick={() => onSelectTool(item.tool)}
              aria-label={item.ariaLabel}
              aria-pressed={activeTool === item.tool}
              title={`${language === 'en' ? item.label : item.ariaLabel} [${item.key}]`}
            >
              {item.glyph}
            </button>
            {item.tool === Tool.Ring_Aromatic && (
              <>
                <span className="main-tools-separator" aria-hidden="true" />
                <button
                  type="button"
                  className="main-tool-button"
                  data-testid="templates-tool"
                  onClick={onOpenTemplates}
                  aria-label={translate(language, 'Templates', 'テンプレート', '模板')}
                  title={translate(language, 'Open Templates panel', 'テンプレートパネルを開く', '打开模板面板')}
                >▦</button>
              </>
            )}
          </React.Fragment>
        );
      })}
      <span className="main-tools-separator" aria-hidden="true" />
      <button
        type="button"
        className="main-tool-button"
        onClick={() => onSelectTool(Tool.Eraser)}
        aria-label={translate(language, 'Eraser', '消しゴム', '橡皮擦')}
        aria-pressed={activeTool === Tool.Eraser}
        title={`${translate(language, 'Eraser', '消しゴム', '橡皮擦')} [DEL]`}
      >⌫</button>
    </div>
  );
}

export function GeneralToolbar({
  language,
  theme,
  sidebarOpen,
  mainToolsOpen,
  undoCount,
  redoCount,
  selectedAtomCount,
  atomCount,
  bondCount,
  zoom,
  primaryModifier,
  documentActions,
  onNew,
  onOpen,
  onSave,
  onClean,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
  onAlignHorizontal,
  onAlignVertical,
  onRotate,
  onFit,
  onShowSidebar,
  onShowMainTools,
  onToggleTheme,
  onOpenSettings,
  onToggleLanguage,
  onOpenShortcuts,
}: GeneralToolbarProps) {
  const tr = (english: string, japanese: string, chinese: string) => translate(language, english, japanese, chinese);
  const selectionDisabled = selectedAtomCount < 2;

  return (
    <div
      className="app-toolbar general-toolbar"
      role="toolbar"
      aria-label={tr('General toolbar', '一般ツールバー', '常用工具栏')}
      data-testid="general-toolbar"
    >
      <div className="app-brand" aria-label="Chematic Draw">
        <span className="app-brand-mark" aria-hidden="true">⌬</span>
        <span>Chematic Draw</span>
      </div>

      {documentActions}
      {!documentActions && onNew && onOpen && onSave && (
        <div className="toolbar-cluster" role="group" aria-label={tr('Document', '文書', '文档')}>
          <button type="button" className="toolbar-icon-button" onClick={onNew} aria-label={tr('New document', '新規文書', '新建文档')} title={`${tr('New', '新規', '新建')} [${primaryModifier}+N]`}>＋</button>
          <button type="button" className="toolbar-icon-button" onClick={onOpen} aria-label={tr('Open document', '文書を開く', '打开文档')} title={`${tr('Open', '開く', '打开')} [${primaryModifier}+O]`}>⌁</button>
          <button type="button" className="toolbar-icon-button" onClick={onSave} aria-label={tr('Save document', '文書を保存', '保存文档')} title={`${tr('Save', '保存', '保存')} [${primaryModifier}+S]`}>▣</button>
        </div>
      )}

      <span className="toolbar-separator" aria-hidden="true" />
      <div className="toolbar-cluster" role="group" aria-label={tr('History', '履歴', '历史')}>
        <button
          type="button"
          className="toolbar-icon-button"
          data-testid="undo-button"
          onClick={onUndo}
          disabled={undoCount === 0}
          aria-label={tr('Undo last edit', '直前の編集を元に戻す', '撤销上一步编辑')}
          title={`${tr('Undo last edit', '直前の編集を元に戻す', '撤销上一步编辑')} [${primaryModifier}+Z]`}
        >↶</button>
        <button
          type="button"
          className="toolbar-icon-button"
          data-testid="redo-button"
          onClick={onRedo}
          disabled={redoCount === 0}
          aria-label={tr('Redo last edit', '直前の編集をやり直す', '重做上一步编辑')}
          title={`${tr('Redo last edit', '直前の編集をやり直す', '重做上一步编辑')} [${primaryModifier}+Shift+Z]`}
        >↷</button>
      </div>

      <span className="toolbar-separator" aria-hidden="true" />
      <div className="toolbar-cluster" role="group" aria-label={tr('Object arrangement', 'オブジェクト配置', '对象排列')}>
        <button type="button" className="toolbar-icon-button" data-testid="clean-structure-button" onClick={onClean} disabled={atomCount === 0} aria-label={tr('Clean Up Structure', '構造を整形', '整理结构')} title={tr('Clean Up Structure', '構造を整形', '整理结构')}>◇</button>
        <button
          type="button"
          className="toolbar-icon-button"
          data-testid="align-horizontal-button"
          onClick={onAlignHorizontal}
          disabled={selectionDisabled}
          aria-label={tr('Align selected atoms horizontally', '選択した原子を横方向に整列', '水平对齐选中的原子')}
          title={tr('Align selected atoms horizontally', '選択した原子を横方向に整列', '水平对齐选中的原子')}
        >↔</button>
        <button
          type="button"
          className="toolbar-icon-button"
          data-testid="align-vertical-button"
          onClick={onAlignVertical}
          disabled={selectionDisabled}
          aria-label={tr('Align selected atoms vertically', '選択した原子を縦方向に整列', '垂直对齐选中的原子')}
          title={tr('Align selected atoms vertically', '選択した原子を縦方向に整列', '垂直对齐选中的原子')}
        >↕</button>
        <button
          type="button"
          className="toolbar-icon-button"
          data-testid="rotate-selection-button"
          onClick={onRotate}
          disabled={selectionDisabled}
          aria-label={tr('Rotate selected atoms 90 degrees', '選択した原子を90度回転', '将选中的原子旋转90度')}
          title={tr('Rotate selected atoms 90 degrees', '選択した原子を90度回転', '将选中的原子旋转90度')}
        >⟳</button>
      </div>

      <div className="toolbar-spacer" />

      {!sidebarOpen && (
        <button
          type="button"
          className="toolbar-text-button"
          data-testid="show-sidebar"
          onClick={onShowSidebar}
          aria-label={tr('Show sidebar', 'サイドバーを表示', '显示侧栏')}
          title={tr('Show sidebar', 'サイドバーを表示', '显示侧栏')}
        >{tr('Panel', 'パネル', '面板')}</button>
      )}
      {!mainToolsOpen && (
        <button
          type="button"
          className="toolbar-text-button"
          data-testid="show-main-tools"
          onClick={onShowMainTools}
          aria-label={tr('Show Main Tools', 'メインツールを表示', '显示主工具')}
          title={tr('Show Main Tools', 'メインツールを表示', '显示主工具')}
        >{tr('Tools', 'ツール', '工具')}</button>
      )}
      <button
        type="button"
        className="toolbar-text-button"
        data-testid="fit-view"
        onClick={onFit}
        disabled={atomCount === 0}
        aria-label={tr('Fit structure to canvas', '構造をキャンバスに収める', '将结构适配到画布')}
        title={tr('Fit structure to canvas', '構造をキャンバスに収める', '将结构适配到画布')}
      >{tr('Fit', '全体表示', '适配')}</button>
      <div className="toolbar-cluster" role="group" aria-label={tr('Zoom', 'ズーム', '缩放')}>
        <button type="button" className="toolbar-icon-button" onClick={onZoomOut} aria-label={tr('Zoom out', '縮小', '缩小')}>−</button>
        <button type="button" className="toolbar-icon-button" onClick={onZoomReset} aria-label={tr('Reset zoom', 'ズームをリセット', '重置缩放')}>{Math.round(zoom * 100)}%</button>
        <button type="button" className="toolbar-icon-button" onClick={onZoomIn} aria-label={tr('Zoom in', '拡大', '放大')}>＋</button>
      </div>
      <button
        type="button"
        className="toolbar-icon-button"
        onClick={onToggleTheme}
        aria-label={tr(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', theme === 'dark' ? 'ライトテーマに切り替える' : 'ダークテーマに切り替える', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题')}
        title={tr('Toggle theme', 'テーマを切り替える', '切换主题')}
      >{theme === 'dark' ? '☀' : '◐'}</button>
      <button
        type="button"
        className="toolbar-icon-button"
        data-testid="settings-button"
        onClick={onOpenSettings}
        aria-label={tr('Open settings', '環境設定を開く', '打开设置')}
        title={tr('Settings', '環境設定', '设置')}
      >⚙</button>
      <button
        type="button"
        className="toolbar-text-button language-button"
        data-testid="language-toggle"
        onClick={onToggleLanguage}
        aria-label={language === 'ja' ? '英語に切り替える' : language === 'zh' ? '切换到英语' : '日本語に切り替える'}
        title={language === 'ja' ? '英語に切り替える' : language === 'zh' ? '切换到英语' : '日本語に切り替える'}
      >{language === 'ja' || language === 'zh' ? 'EN' : '日本語'}</button>
      <button
        type="button"
        className="toolbar-icon-button"
        data-testid="shortcuts-help"
        onClick={onOpenShortcuts}
        aria-label={tr('Show keyboard shortcuts', 'キーボードショートカットを表示', '显示键盘快捷键')}
        title={tr('Show keyboard shortcuts', 'キーボードショートカットを表示', '显示键盘快捷键')}
      >?</button>
      <div
        className="toolbar-summary"
        data-testid="toolbar-summary"
        aria-label={tr('Structure summary', '構造の概要', '结构摘要')}
      >
        {atomCount}a • {bondCount}b • {(zoom * 100).toFixed(0)}%
      </div>
    </div>
  );
}
