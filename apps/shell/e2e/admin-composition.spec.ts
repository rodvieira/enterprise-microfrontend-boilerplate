import { expect, test } from '@playwright/test';

/**
 * The shell composing a second real remote — proving the mechanism
 * generalizes to more than one,
 * not just the specific case it was first proven against.
 */
test.describe('admin composition', () => {
  test('the shell composes the admin remote at /admin (SC-001)', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  });

  test('navigating between dashboard and admin leaves no state from the other', async ({
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

/**
 * The headline proof: a role change in
 * admin updates the dashboard's "active users" KPI live, with no reload,
 * across two genuinely separate browser tabs — exactly what the shell's
 * BroadcastChannel relay (apps/shell/src/internal/bus/) exists for. Two
 * pages in the same browser context share an origin, which is what
 * BroadcastChannel requires; they do not share any JS memory, which is what
 * makes this a real test of the relay rather than of same-module delivery.
 */
test.describe('live cross-remote update', () => {
  test("a role change in admin updates the dashboard's KPI live, across two tabs (SC-005)", async ({
    context,
  }) => {
    const dashboardPage = await context.newPage();
    const adminPage = await context.newPage();

    await dashboardPage.goto('/dashboard');
    await expect(dashboardPage.getByText('1,204')).toBeVisible();

    await adminPage.goto('/admin');
    // The auth stub starts signed out on every page independently (no
    // persistence) — the invite/edit trigger is correctly absent until
    // signed in.
    await adminPage.getByRole('button', { name: /sign in/i }).click();
    await adminPage.getByRole('button', { name: /invite or edit user/i }).click();
    await adminPage.getByLabel(/change an existing user's role/i).click();
    await adminPage.getByLabel('New role').selectOption('editor');
    await adminPage.getByRole('button', { name: /^submit$/i }).click();

    await expect(dashboardPage.getByText('1,205')).toBeVisible();
  });

  test('a dashboard opened after the role change shows fresh state, not a replay', async ({
    context,
  }) => {
    const adminPage = await context.newPage();
    await adminPage.goto('/admin');
    await adminPage.getByRole('button', { name: /sign in/i }).click();
    await adminPage.getByRole('button', { name: /invite or edit user/i }).click();
    await adminPage.getByLabel(/change an existing user's role/i).click();
    await adminPage.getByLabel('New role').selectOption('editor');
    await adminPage.getByRole('button', { name: /^submit$/i }).click();
    await adminPage.waitForTimeout(200); // let the event actually publish before the next page opens

    const dashboardPage = await context.newPage();
    await dashboardPage.goto('/dashboard');
    await expect(dashboardPage.getByText('1,204')).toBeVisible();
  });
});
