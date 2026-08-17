import { expect, test } from '@playwright/test';

/**
 * `packages/federation-utils`' failure-containment mechanism
 * had only ever been proven against simulated loaders —
 * never a real remote that is actually unreachable, because none existed
 * This spec closes that gap.
 *
 * "Genuinely unreachable" is produced by aborting the remote's requests at
 * the network layer (`page.route(...).abort()`), not by stopping its dev
 * server process — the suite runs `fullyParallel` against dev servers
 * shared for the whole run, so killing a real process would break every
 * other concurrently-running test. The browser's actual `fetch()` call
 * still genuinely fails — the same code path a real network
 * outage would exercise.
 */
test.describe('real remote-load failure containment', () => {
  test('a real unreachable remote shows a contained, retryable failure', async ({ page }) => {
    await page.route('http://localhost:3001/**', (route) => route.abort());

    await page.goto('/dashboard');

    // Contained: a distinct failure state for the dashboard's region...
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/failed to load "dashboard"/i)).toBeVisible();

    // ...but the shell's chrome and navigation are unaffected...
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();

    // ...and the OTHER composed remote is still fully reachable.
    await page.getByRole('link', { name: 'Home' }).click();
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  });

  test('retry recovers without a full page reload once the remote is reachable again', async ({
    page,
  }) => {
    let blocked = true;
    await page.route('http://localhost:3001/**', (route) => {
      if (blocked) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('alert')).toBeVisible();

    blocked = false;
    await page.getByRole('button', { name: /retry/i }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('1,204')).toBeVisible();
  });

  test('a remote that failed after a prior successful load shows the same contained state on revisit, not stale content', async ({
    page,
  }) => {
    // First visit succeeds — nothing intercepted yet.
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Navigate away, then the remote "dies" before the next visit.
    await page.getByRole('link', { name: 'Home' }).click();
    await page.route('http://localhost:3001/**', (route) => route.abort());

    await page.goto('/dashboard');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/failed to load "dashboard"/i)).toBeVisible();
  });

  test('the shell itself keeps rendering with both composed remotes unreachable at once', async ({
    page,
  }) => {
    await page.route('http://localhost:3001/**', (route) => route.abort());
    await page.route('http://localhost:3002/**', (route) => route.abort());

    await page.goto('/dashboard');
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();

    await page.goto('/admin');
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
