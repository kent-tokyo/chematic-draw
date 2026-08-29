import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test for a bug found while wiring up ESLint's react-hooks
// plugin (`/greenlane` autonomous work): InspectorPanel.tsx defined
// FunctionalGroupsSection/ValidationSection/SmartsSection as functions
// INSIDE InspectorPanel's own render body, giving each a fresh identity
// every render. Typing into the SMARTS input calls setSmartsPattern, which
// re-renders InspectorPanel, which redefines SmartsSection as a new
// function -> React treats <SmartsSection/> as an entirely new component
// type and unmounts+remounts the whole subtree, including the <input>
// itself -> the input lost focus after every single keystroke. Fixed by
// hoisting all three sections to module scope with explicit props.
test.describe('Inspector SMARTS search input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('typing a multi-character pattern does not lose focus mid-keystroke', async ({ page }) => {
    const smartsInput = page.getByPlaceholder('e.g., [#6]1:[#6]:[#6]:[#6]:[#6]:[#6]:1');
    await expect(smartsInput).toBeVisible();

    const pattern = '[#6]';
    await smartsInput.click();
    await smartsInput.pressSequentially(pattern, { delay: 20 });

    // If focus was lost after the first keystroke (the pre-fix bug), only
    // that first character would have landed in the live input before it
    // got replaced by a remount — every subsequent keystroke would go
    // nowhere. A full, correct value proves focus survived every keystroke.
    await expect(smartsInput).toHaveValue(pattern);
    await expect(smartsInput).toBeFocused();
  });
});
