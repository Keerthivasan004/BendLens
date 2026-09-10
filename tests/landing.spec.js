const { test, expect } = require('@playwright/test');

test.describe('BendLens Landing & Ingestion Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the landing page with proper title and hero headline', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/BendLens/i);

    // Verify hero section elements
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Universal Backend Architecture & Blast Platform');

    // Verify security / air-gap badge
    await expect(page.getByText('Air-Gapped & Offline Architecture')).toBeVisible();
  });

  test('should toggle between all ingestion modes', async ({ page }) => {
    // Default mode: Local Path
    await expect(page.getByPlaceholder(/C:\/Projects/i)).toBeVisible();

    // Switch to ZIP / Files mode
    await page.getByRole('button', { name: /ZIP \/ Files/i }).click();
    await expect(page.getByText(/Upload Project \.ZIP Archive/i)).toBeVisible();

    // Switch to Paste Schema mode
    await page.getByRole('button', { name: /Paste Schema/i }).click();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Architecture & ERD from Schema/i })).toBeVisible();

    // Switch to Git / GitHub mode
    await page.getByRole('button', { name: /Git \/ GitHub/i }).click();
    await expect(page.getByPlaceholder(/github\.com/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Clone & Analyze/i })).toBeVisible();

    // Return to Local Path mode
    await page.getByRole('button', { name: /Local Path/i }).click();
    await expect(page.getByPlaceholder(/C:\/Projects/i)).toBeVisible();
  });

  test('should toggle light and dark themes', async ({ page }) => {
    // Locate the theme switcher button
    const themeBtn = page.locator('button[title*="Switch to"]');
    await expect(themeBtn).toBeVisible();

    // Read initial class on <html>
    const isInitiallyDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    // Click theme toggle
    await themeBtn.click();

    // Verify class has changed using Playwright auto-retry
    if (isInitiallyDark) {
      await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    } else {
      await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    }

    // Click again to restore
    await themeBtn.click();
    if (isInitiallyDark) {
      await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    } else {
      await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    }
  });

  test('should load interactive e-commerce sample architecture and navigate to Lens', async ({ page }) => {
    const sampleBtn = page.getByRole('button', { name: /Load Interactive E-Commerce Architecture/i });
    await expect(sampleBtn).toBeVisible();
    await sampleBtn.click();

    // Wait for AST pipeline to finish and analysis card to display
    const resultBanner = page.getByText('AST Architecture & Blast Radius Model Ready');
    await expect(resultBanner).toBeVisible({ timeout: 15000 });

    // Verify metrics cards are rendered
    await expect(page.getByText('Database Tables')).toBeVisible();
    await expect(page.getByText('API Endpoints')).toBeVisible();
    await expect(page.getByText('Graph Connections')).toBeVisible();
    await expect(page.getByText('Scanned Files')).toBeVisible();

    // Click "Show Lens" button to open studio
    const showLensBtn = page.getByRole('button', { name: /Show Lens/i });
    await expect(showLensBtn).toBeVisible();
    await showLensBtn.click();

    // Confirm navigation to /lens
    await expect(page).toHaveURL(/\/lens/);
    await expect(page.getByText(/Developer View/i)).toBeVisible();
  });

  test('should parse pasted SQL schema and display analysis summary', async ({ page }) => {
    // Select Paste Schema tab
    await page.getByRole('button', { name: /Paste Schema/i }).click();

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // Type a specific custom SQL DDL
    const customDDL = `
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'unpaid'
);
`;
    await textarea.fill(customDDL);

    // Trigger analysis
    const generateBtn = page.getByRole('button', { name: /Generate Architecture & ERD from Schema/i });
    await generateBtn.click();

    // Wait for result card
    await expect(page.getByText('AST Architecture & Blast Radius Model Ready')).toBeVisible({ timeout: 15000 });
  });
});
