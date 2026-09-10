const { test, expect } = require('@playwright/test');

test.describe('BendLens Studio & Architecture Lens (/lens)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to /lens (auto-loads sample project if cache is empty)
    await page.goto('/lens');
    // Wait for the dashboard content to finish loading
    await expect(page.getByRole('button', { name: /Developer View/i })).toBeVisible({ timeout: 20000 });
  });

  test('should render header controls, repository indicator, and breadcrumb navigation', async ({ page }) => {
    // Verify brand logo and breadcrumb
    const breadcrumb = page.getByRole('button', { name: /Ingestion Portal \/ New Scan/i });
    await expect(breadcrumb).toBeVisible();

    // Verify header action buttons
    await expect(page.locator('header').getByRole('button', { name: /Rescan/i })).toBeVisible();
    await expect(page.locator('header').getByRole('button', { name: /Sample/i })).toBeVisible();
    await expect(page.locator('header').getByRole('button', { name: /Export/i })).toBeVisible();

    // Test clicking breadcrumb navigates back to /
    await breadcrumb.click();
    await expect(page).toHaveURL('/');
  });

  test('should switch across Diagram Canvas tabs (ERD, HLD, LLD, Sequence)', async ({ page }) => {
    // Verify all 4 diagram tabs are present
    const erdTab = page.getByRole('button', { name: /Database ERD/i });
    const hldTab = page.getByRole('button', { name: /High-Level C4/i });
    const lldTab = page.getByRole('button', { name: /Low-Level Call Graph/i });
    const seqTab = page.getByRole('button', { name: /Execution Sequence/i });

    await expect(erdTab).toBeVisible();
    await expect(hldTab).toBeVisible();
    await expect(lldTab).toBeVisible();
    await expect(seqTab).toBeVisible();

    // Switch to High-Level C4
    await hldTab.click();
    // Search input should still be accessible
    const searchInput = page.getByPlaceholder(/Search nodes or tables/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Service');
    await searchInput.clear();

    // Switch to Low-Level Call Graph
    await lldTab.click();

    // Switch to Execution Sequence
    await seqTab.click();

    // Return to Database ERD
    await erdTab.click();
  });

  test('should switch between all 4 Persona intelligence views', async ({ page }) => {
    // 1. Developer View (Default or clicked)
    const devTab = page.getByRole('button', { name: /Developer View/i });
    await devTab.click();
    await expect(page.getByText('Database Tables').first()).toBeVisible();
    await expect(page.getByText('API Endpoints').first()).toBeVisible();

    // 2. Engineering Manager View
    const mgrTab = page.getByRole('button', { name: /Engineering Manager/i });
    await expect(mgrTab).toBeVisible();
    await mgrTab.click();
    await expect(page.getByText(/Sprint Risk/i)).toBeVisible();
    await expect(page.getByText(/Module Coupling Index/i)).toBeVisible();

    // 3. Business Owner View
    const bizTab = page.getByRole('button', { name: /Business Owner/i });
    await expect(bizTab).toBeVisible();
    await bizTab.click();
    await expect(page.getByText(/Core Business Engines/i)).toBeVisible();

    // 4. What-If Impact Simulator
    const simTab = page.getByRole('button', { name: /What-If Impact Simulator/i });
    await expect(simTab).toBeVisible();
    await simTab.click();
    await expect(page.getByText(/Live "What-If" Modification Blast-Radius Simulator/i)).toBeVisible();
  });

  test('should interact with the What-If Blast Radius Simulator', async ({ page }) => {
    // Navigate to simulator tab
    const simTab = page.getByRole('button', { name: /What-If Impact Simulator/i });
    await simTab.click();

    // Verify selector elements
    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible();

    // Change target selector if options exist
    const targetSelect = selects.nth(1);
    const optionsCount = await targetSelect.locator('option').count();
    if (optionsCount > 1) {
      await targetSelect.selectOption({ index: 1 });
    }

    // Verify risk assessment is displayed
    await expect(page.getByText(/Computed Blast Severity/i)).toBeVisible();
    await expect(page.getByText(/Total Ripple Nodes/i)).toBeVisible();
  });

  test('should simulate table_name, column_name, and key modification with impact percentages', async ({ page }) => {
    // Navigate to simulator tab
    const simTab = page.getByRole('button', { name: /What-If Impact Simulator/i });
    await simTab.click();

    // Verify Impacted Database Tables view and Impacted Code view are visible
    await expect(page.getByText(/Impacted Database Tables/i)).toBeVisible();
    await expect(page.getByText(/Impacted Code, Handlers & APIs/i)).toBeVisible();

    // Verify percentage meters are displayed
    await expect(page.getByText(/% IMPACT/i).first()).toBeVisible();

    // Change Value to Change to column_name
    const changeTypeSelect = page.locator('select').nth(1);
    await changeTypeSelect.selectOption('column_name');

    // Verify column dropdown appears and select a column
    const columnSelect = page.locator('select').nth(2);
    await expect(columnSelect).toBeVisible();
    await columnSelect.selectOption({ index: 1 });

    // Click Recalculate Blast
    const recalcBtn = page.getByRole('button', { name: /Recalculate Blast/i });
    await recalcBtn.click();

    // Verify recalculation updated results
    await expect(page.getByText(/Computed Blast Severity/i)).toBeVisible();
    await expect(page.getByText(/% IMPACT/i).first()).toBeVisible();
  });

  test('should open, toggle formats, and close the Export Report modal', async ({ page }) => {
    const exportBtn = page.locator('header').getByRole('button', { name: /Export/i });
    await exportBtn.click();

    // Verify modal appeared
    await expect(page.getByText(/Export Architecture & Impact Report/i)).toBeVisible();

    // Toggle between formats
    const jsonBtn = page.getByRole('button', { name: /JSON \(\.json\)/i });
    await expect(jsonBtn).toBeVisible();
    await jsonBtn.click();

    const mdBtn = page.getByRole('button', { name: /Markdown \(\.md\)/i });
    await expect(mdBtn).toBeVisible();
    await mdBtn.click();

    // Close the modal
    const closeBtn = page.locator('.fixed').locator('button').first();
    await closeBtn.click();

    // Verify modal is dismissed
    await expect(page.getByText(/Export Architecture & Impact Report/i)).not.toBeVisible();
  });
});
