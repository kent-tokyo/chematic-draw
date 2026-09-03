import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Japanese UI accessibility contracts', () => {
  test('language toggle updates accessible panel groups and modal controls', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    const languageToggle = page.getByTestId('language-toggle');
    await expect(languageToggle).toHaveAccessibleName('日本語に切り替える');
    await languageToggle.click();

    await expect(languageToggle).toHaveAccessibleName('英語に切り替える');
    await expect(page.getByRole('toolbar', { name: '描画ツール' })).toBeVisible();
    await expect(page.getByTestId('shortcuts-help')).toHaveAccessibleName('キーボードショートカットを表示');
    await expect(page.getByTestId('toolbar-summary')).toHaveAccessibleName('構造の概要');
    await expect(page.getByRole('group', { name: '描画ステータスとショートカット' })).toBeVisible();
    await expect(page.getByRole('group', { name: '編集' })).toBeVisible();
    await expect(page.getByRole('group', { name: '解析' })).toBeVisible();
    await expect(page.getByRole('group', { name: '連携' })).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-reactions')).toHaveAccessibleName('反応');

    await page.keyboard.press('F1');
    const dialog = page.getByRole('dialog', { name: 'キーボードショートカット' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: '閉じる', exact: true })).toBeFocused();
    await expect(dialog.getByPlaceholder('ショートカットを検索…')).toBeVisible();
    await expect(dialog.getByRole('tablist', { name: 'ショートカットカテゴリ' })).toBeVisible();
    await expect(dialog.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'shortcut-tab-0');

    await page.keyboard.press('Escape');
    await page.getByTestId('sidebar-tab-reactions').click();
    await expect(page.getByPlaceholder('反応の説明…')).toBeVisible();
  });

  test('sidebar tabs retain roving keyboard focus in Japanese mode', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('language-toggle').click();

    const inspector = page.getByTestId('sidebar-tab-inspector');
    await inspector.focus();
    await page.keyboard.press('End');
    await expect(page.getByTestId('sidebar-tab-chat')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(inspector).toBeFocused();
    await expect(inspector).toHaveAttribute('tabindex', '0');
    await expect(page.getByTestId('sidebar-tab-chat')).toHaveAttribute('tabindex', '-1');
  });

  test('remaining Chat and Viewer3D labels follow the Japanese mode', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('language-toggle').click();

    await page.getByTestId('sidebar-tab-chat').click();
    await expect(page.getByPlaceholder('構造について質問…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'メッセージを送信', exact: true })).toBeVisible();
    await expect(page.getByRole('log', { name: '分子相談のメッセージ' })).toBeVisible();
    await page.getByPlaceholder('構造について質問…').fill('この分子について教えて');
    await page.getByRole('button', { name: 'メッセージを送信', exact: true }).click();
    await expect(page.getByRole('log', { name: '分子相談のメッセージ' })).toContainText('AIチャット連携は今後対応予定です…');

    await page.getByTestId('sidebar-tab-3d').click();
    await expect(page.getByRole('button', { name: '3D 生成', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'XYZを出力', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /3D分子ビューア/ })).toBeVisible();
  });

  test('Reaction template selection keeps a localized accessible name', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('language-toggle').click();
    await page.getByTestId('sidebar-tab-reactions').click();

    const template = page.getByRole('combobox', { name: '反応テンプレート' });
    await expect(template).toBeVisible();
    await expect(template.locator('option').first()).toHaveText('カルボン酸 → アミド');
    await template.selectOption('custom');
    await expect(page.getByPlaceholder(/\[C:1\]/)).toHaveValue('');
    await expect(page.getByText('SMIRKSパターン', { exact: true })).toBeVisible();
  });

  test('Undo timeline keeps localized dialog and range semantics', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('language-toggle').click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Control+z' : 'Control+Alt+z');

    const dialog = page.getByRole('dialog', { name: '元に戻す／やり直す履歴' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: '閉じる', exact: true })).toBeVisible();
    await expect(dialog.getByRole('slider', { name: '履歴上の位置' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
