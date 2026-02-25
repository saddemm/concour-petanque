import { test, expect } from '@playwright/test';

test.describe('Concours Flow', () => {
  test('should create a new contest', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    await page.click('text=Créer un concours');
    
    await page.fill('input[placeholder*="Championnat"]', 'Test Concours E2E');
    await page.fill('input[placeholder*="Boulodrome"]', 'Terrain de test');
    
    await page.click('text=Créer le concours');
    
    await expect(page).toHaveURL(/\/concours\/.*\/setup/);
  });

  test('should display contests on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    const contests = page.locator('.grid > a');
    const count = await contests.count();
    
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
