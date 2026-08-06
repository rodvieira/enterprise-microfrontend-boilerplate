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

  test("the dashboard's own data-fetch failure is contained to its region (FR-018, US2 scenario 4)", async ({
    page,
  }) => {
    await page.goto('/dashboard?forceOverviewFailure=1');

    // Contained: the KPI cards show their own error state...
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByText('Unavailable').first()).toBeVisible();

    // ...but the shell's chrome and navigation are unaffected, and the rest
    // of the application keeps working — the same guarantee sprint 3 proved
    // against simulated remotes (002-shell-host US3), now exercised against
    // a real one for the first time.
    await expect(page.getByRole('navigation')).toBeVisible();
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test("the activity chart doesn't affect the shell's chrome (SC-003)", async ({ page }) => {
    await page.goto('/');
    const navBefore = await page.getByRole('navigation').evaluate((el) => el.outerHTML);
    const bannerBefore = await page.getByRole('banner').evaluate((el) => el.outerHTML);

    await page.goto('/dashboard');
    // Wait for the real chart (not the loading placeholder) to mount.
    await expect(page.locator('.recharts-wrapper')).toBeVisible();

    const navAfter = await page.getByRole('navigation').evaluate((el) => el.outerHTML);
    const bannerAfter = await page.getByRole('banner').evaluate((el) => el.outerHTML);
    expect(navAfter).toBe(navBefore);
    expect(bannerAfter).toBe(bannerBefore);

    // Navigate away and back: no leaked chart resources from the previous mount (FR-011).
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('.recharts-wrapper')).toHaveCount(1);
  });
});
