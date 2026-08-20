import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
 *
 * The routes come from the registry rather than being written here, so this
 * keeps guarding the frame after `pnpm eject` replaces the example remotes
 * with the adopter's own.
 */
interface DevRegistry {
  remotes: { name: string; routePath: string }[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(
  readFileSync(join(HERE, '../src/internal/federation/remotes.dev.json'), 'utf8'),
) as DevRegistry;

const DESKTOP = { width: 1440, height: 900 };

test.describe('host chrome survives a remote stylesheet', () => {
  for (const remote of registry.remotes) {
    test(`the sidebar and the ${remote.name} remote sit side by side`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(remote.routePath);

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
      // And it keeps its own width rather than taking the whole viewport.
      expect(sidebar.width).toBeLessThan(DESKTOP.width / 3);
    });
  }

  test('the frame still stacks on a narrow viewport', async ({ page }) => {
    // The fix pins the frame's structure outside Tailwind's layers; this is
    // what proves it pinned the responsive behaviour rather than replacing it
    // with a layout that is always a row.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('navigation')).toBeVisible();

    const sidebar = await page.locator('aside').boundingBox();
    const main = await page.getByRole('main').boundingBox();
    if (!sidebar || !main) throw new Error('sidebar or main is not laid out');

    expect(main.y).toBeGreaterThanOrEqual(sidebar.y + sidebar.height);
  });
});
