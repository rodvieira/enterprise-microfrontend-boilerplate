import { expect, test } from '@playwright/test';

/**
 * The shell composing a third real remote (004-admin-remote) — proving the
 * mechanism 003-dashboard-remote built generalizes to more than one remote,
 * not just the specific case it was first proven against.
 */
test.describe('admin composition', () => {
  test('the shell composes the admin remote at /admin (SC-001)', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  });

  test('navigating between dashboard and admin leaves no state from the other (US1 scenario 2)', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).not.toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin' })).not.toBeVisible();
  });
});
