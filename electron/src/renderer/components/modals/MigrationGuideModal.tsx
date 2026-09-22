import React from 'react';
import { Modal } from '../common/Modal';
import { useUIStore, AppLanguage } from '../../store/uiStore';

type GuideCopy = {
  title: string;
  intro: string;
  familiar: string;
  here: string;
  close: string;
  boundary: string;
  rows: Array<{ task: string; destination: string }>;
};

const copy: Record<AppLanguage, GuideCopy> = {
  en: {
    title: 'ChemDraw Migration Guide',
    intro: 'Chematic Draw uses a familiar command layout while keeping its own labels and icons.',
    familiar: 'Common ChemDraw task',
    here: 'In Chematic Draw',
    close: 'Close',
    boundary: 'Only supported, undoable commands are listed. Unsupported ChemDraw commands are intentionally not shown as placeholders.',
    rows: [
      { task: 'Draw bonds, rings, atoms, arrows, or text', destination: 'Left Drawing Tools' },
      { task: 'Create, open, save, export, or print', destination: 'File menu · top document controls' },
      { task: 'Undo, redo, copy, paste, or select all', destination: 'Edit menu · top history controls' },
      { task: 'Align, distribute, flip, or rotate a selection', destination: 'Object menu · top arrangement controls' },
      { task: 'Clean a structure, inspect properties, or edit stereo', destination: 'Structure menu · right Properties, Query, and Stereo panels' },
      { task: 'Find a database record, SMARTS match, or MCS', destination: 'Search menu · right Query panel' },
      { task: 'Open Templates, Reactions, 3D, or other panels', destination: 'Window menu · sidebar tabs' },
    ],
  },
  ja: {
    title: 'ChemDraw移行ガイド',
    intro: 'Chematic Drawは独自の名称とアイコンを保ちながら、慣れたコマンド配置を採用しています。',
    familiar: 'ChemDrawで行う操作',
    here: 'Chematic Drawでの場所',
    close: '閉じる',
    boundary: 'ここには、実際に動作しUndoできる操作だけを載せています。未対応のChemDraw機能を見せかけのメニューとしては表示しません。',
    rows: [
      { task: '結合・環・原子・反応矢印・テキストを描く', destination: '左側の描画ツール' },
      { task: '新規作成、開く、保存、書き出し、印刷', destination: 'Fileメニュー・上部の文書操作' },
      { task: 'Undo、Redo、コピー、貼り付け、全選択', destination: 'Editメニュー・上部の履歴操作' },
      { task: '選択範囲の整列、分布、反転、回転', destination: 'Objectメニュー・上部の配置操作' },
      { task: '構造整形、プロパティ確認、立体化学編集', destination: 'Structureメニュー・右側のProperties／Query／Stereo' },
      { task: 'データベース、SMARTS、MCSを検索', destination: 'Searchメニュー・右側のQueryパネル' },
      { task: 'Templates、Reactions、3Dなどを開く', destination: 'Windowメニュー・サイドバータブ' },
    ],
  },
  zh: {
    title: 'ChemDraw 迁移指南',
    intro: 'Chematic Draw 保持自己的术语和图标，同时采用熟悉的命令布局。',
    familiar: '常见 ChemDraw 操作',
    here: 'Chematic Draw 中的位置',
    close: '关闭',
    boundary: '这里只列出实际可用且可撤销的操作；未支持的 ChemDraw 功能不会以占位菜单出现。',
    rows: [
      { task: '绘制键、环、原子、反应箭头或文字', destination: '左侧绘图工具' },
      { task: '新建、打开、保存、导出或打印', destination: 'File 菜单和顶部文档控件' },
      { task: '撤销、重做、复制、粘贴或全选', destination: 'Edit 菜单和顶部历史控件' },
      { task: '对齐、分布、翻转或旋转选区', destination: 'Object 菜单和顶部排列控件' },
      { task: '整理结构、检查属性或编辑立体化学', destination: 'Structure 菜单和右侧 Properties、Query、Stereo 面板' },
      { task: '搜索数据库、SMARTS 或 MCS', destination: 'Search 菜单和右侧 Query 面板' },
      { task: '打开 Templates、Reactions、3D 等面板', destination: 'Window 菜单和侧边栏标签' },
    ],
  },
};

export function MigrationGuideModal() {
  const isOpen = useUIStore((state) => state.showMigrationModal);
  const language = useUIStore((state) => state.language);
  const theme = useUIStore((state) => state.theme);
  const hideModal = useUIStore((state) => state.hideModal);
  const text = copy[language];

  return (
    <Modal
      isOpen={isOpen}
      title={text.title}
      onClose={() => hideModal('migration')}
      isDark={theme === 'dark'}
      width={760}
      height={560}
      actions={[{ label: text.close, onClick: () => hideModal('migration'), variant: 'primary' }]}
    >
      <div style={{ display: 'grid', gap: '14px', fontSize: '13px', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>{text.intro}</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th scope="col" style={{ padding: '8px', borderBottom: '1px solid currentColor' }}>{text.familiar}</th>
                <th scope="col" style={{ padding: '8px', borderBottom: '1px solid currentColor' }}>{text.here}</th>
              </tr>
            </thead>
            <tbody>
              {text.rows.map((row) => (
                <tr key={row.task}>
                  <td style={{ padding: '8px', borderBottom: '1px solid rgba(127, 127, 127, 0.25)', verticalAlign: 'top' }}>{row.task}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid rgba(127, 127, 127, 0.25)', verticalAlign: 'top', fontWeight: 600 }}>{row.destination}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ margin: 0, opacity: 0.75 }}>{text.boundary}</p>
      </div>
    </Modal>
  );
}
