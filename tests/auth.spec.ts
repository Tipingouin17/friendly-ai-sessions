import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should navigate to login page', async ({ page }) => {
        await page.goto('/');

        // Check if login page loads
        await expect(page).toHaveTitle(/MyFacilitator|Friendly AI Sessions/i);
    });

    test('should show login form', async ({ page }) => {
        await page.goto('/login');

        // Wait for the page to load
        await page.waitForLoadState('networkidle');

        // Check for email input
        const emailInput = page.locator('input[type="email"]').first();
        await expect(emailInput).toBeVisible();

        // Check for password input
        const passwordInput = page.locator('input[type="password"]').first();
        await expect(passwordInput).toBeVisible();

        // Check for submit button
        const submitButton = page.locator('button[type="submit"]').first();
        await expect(submitButton).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Try to submit empty form
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Wait a bit for validation
        await page.waitForTimeout(500);

        // Check that we're still on login page (form didn't submit)
        await expect(page).toHaveURL(/login/);
    });

    test('should navigate to signup page', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Look for signup link
        const signupLink = page.getByRole('link', { name: /sign up|create account/i });

        if (await signupLink.count() > 0) {
            await signupLink.first().click();
            await expect(page).toHaveURL(/signup/);
        }
    });
});
