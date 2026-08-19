import { expect, test } from '@playwright/test';

/**
 * The shell's frame must survive whatever CSS a remote ships.
 *
 * Every app here builds its own Tailwind bundle, and a remote's stylesheet
 * loads after the host's. Utilities are global, single-class selectors, so a
 * plain `.flex-col` emitted by a remote wins the cascade over the host's
 * responsive `md:flex-row` — the host's sidebar silently collapses to a
 * stacked layout, on a page where nothing errored and every test that only
 * asserts visibility still passes.
 *
 * This is not hypothetical: it is what happened the day the shared UI package
 * was removed. Until then every remote happened to emit the host's responsive
 * utilities too, because they all scanned the same package source, so the
 * collision resolved in the host's favour by accident.
 *
 * These tests assert geometry rather than visibility, because that is the only
 * thing that catches it.
 */
test.describe('host chrome survives a remote stylesheet', () => {
  for (const route of ['/dashboard', '/admin']) {
    test(`the sidebar and the remote sit side by side at ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);

      // Wait for the remote to actually mount — its stylesheet is what could
      // break the frame, so measuring before it lands would prove nothing.
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();

      const sidebar = await page.locator('aside').boundingBox();
      const main = await page.getByRole('main').boundingBox();
      if (!sidebar || !main) throw new Error('sidebar or main is not laid out');

      // Side by side, not stacked.
      expect(main.x).toBeGreaterThanOrEqual(sidebar.x + sidebar.width);
      // The sidebar is a column, not a short block with the page below it.
      expect(sidebar.height).toBeGreaterThan(main.height / 2);
    });
  }

  test('the sidebar keeps its own width rather than the full viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await expect(page.getByRole('main')).toBeVisible();

    const sidebar = await page.locator('aside').boundingBox();
    if (!sidebar) throw new Error('sidebar is not laid out');
    expect(sidebar.width).toBeLessThan(400);
  });
});
