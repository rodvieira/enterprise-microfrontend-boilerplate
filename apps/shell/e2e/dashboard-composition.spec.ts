import { expect, test } from '@playwright/test';

/**
 * The first real end-to-end run in this project (research D6,
 * 003-dashboard-remote): the shell composing a real remote across a real
 * network boundary, not a simulated one (002-shell-host's research D7
 * deferred this exact scenario to this sprint).
 */
test.describe('dashboard composition', () => {
  test('the shell composes the dashboard remote at /dashboard (SC-001)', async ({ page }) => {
    await page.goto('/dashboard');

    // The shell's own chrome (built from @enterprise-mfe/ui, never simulated).
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();

    // The dashboard's own content, mounted inside the shell's frame.
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('registering the remote does not break the host route (US1 scenario 1)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
