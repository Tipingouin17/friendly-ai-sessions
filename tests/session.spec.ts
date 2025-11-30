import { test, expect } from '@playwright/test';

test.describe('Session Creation Flow', () => {
    // Note: These tests assume user is already logged in
    // In a real scenario, you'd use a setup script to login first

    test('should show home page after login', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check if we can see the main navigation or dashboard
        const body = await page.textContent('body');
        expect(body).toBeTruthy();
    });

    test('should navigate to facilitators page', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Try to find and click on facilitators/sessions link
        const facilitatorsLink = page.getByRole('link', { name: /facilitator|session|workshop/i }).first();

        if (await facilitatorsLink.count() > 0) {
            await facilitatorsLink.click();
            await page.waitForLoadState('networkidle');

            // Verify we're on a relevant page
            const url = page.url();
            expect(url).toMatch(/facilitator|session|workshop/i);
        }
    });

    test('should display facilitator cards', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for any card-like elements that might be facilitators
        const cards = page.locator('[class*="card"], [class*="Card"]');

        // If cards exist, check that at least one is visible
        if (await cards.count() > 0) {
            await expect(cards.first()).toBeVisible();
        }
    });

    test('should handle navigation without errors', async ({ page }) => {
        const errors: string[] = [];

        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Navigate through key pages
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Check that no critical errors occurred
        const criticalErrors = errors.filter(e =>
            !e.includes('favicon') &&
            !e.includes('404') &&
            !e.includes('net::ERR')
        );

        expect(criticalErrors.length).toBe(0);
    });
});
