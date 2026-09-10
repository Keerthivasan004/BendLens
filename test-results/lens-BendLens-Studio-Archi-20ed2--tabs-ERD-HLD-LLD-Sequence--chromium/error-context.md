# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lens.spec.js >> BendLens Studio & Architecture Lens (/lens) >> should switch across Diagram Canvas tabs (ERD, HLD, LLD, Sequence)
- Location: tests\lens.spec.js:27:3

# Error details

```
Test timeout of 60000ms exceeded while running "beforeEach" hook.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /Developer View/i })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: /Developer View/i }) with timeout 20000ms
  - waiting for getByRole('button', { name: /Developer View/i })

```

```yaml
- img
- heading "This page couldn’t load" [level=1]
- paragraph: Reload to try again, or go back.
- button "Reload"
- button "Back"
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | 
  3   | test.describe('BendLens Studio & Architecture Lens (/lens)', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Navigate directly to /lens (auto-loads sample project if cache is empty)
  6   |     await page.goto('/lens');
  7   |     // Wait for the dashboard content to finish loading
> 8   |     await expect(page.getByRole('button', { name: /Developer View/i })).toBeVisible({ timeout: 20000 });
      |                                                                         ^ Error: expect(locator).toBeVisible() failed
  9   |     await expect(page.getByRole('button', { name: /Database ERD/i })).toBeVisible({ timeout: 25000 });
  10  |   });
  11  | 
  12  |   test('should render header controls, repository indicator, and breadcrumb navigation', async ({ page }) => {
  13  |     // Verify brand logo and breadcrumb
  14  |     const breadcrumb = page.getByRole('button', { name: /Ingestion Portal \/ New Scan/i });
  15  |     await expect(breadcrumb).toBeVisible();
  16  | 
  17  |     // Verify header action buttons
  18  |     await expect(page.locator('header').getByRole('button', { name: /Rescan/i })).toBeVisible();
  19  |     await expect(page.locator('header').getByRole('button', { name: /Sample/i })).toBeVisible();
  20  |     await expect(page.locator('header').getByRole('button', { name: /Export/i })).toBeVisible();
  21  | 
  22  |     // Test clicking breadcrumb navigates back to /
  23  |     await breadcrumb.click();
  24  |     await expect(page).toHaveURL('/');
  25  |   });
  26  | 
  27  |   test('should switch across Diagram Canvas tabs (ERD, HLD, LLD, Sequence)', async ({ page }) => {
  28  |     // Verify all 4 diagram tabs are present
  29  |     const erdTab = page.getByRole('button', { name: /Database ERD/i });
  30  |     const hldTab = page.getByRole('button', { name: /High-Level C4/i });
  31  |     const lldTab = page.getByRole('button', { name: /Low-Level Call Graph/i });
  32  |     const seqTab = page.getByRole('button', { name: /Execution Sequence/i });
  33  | 
  34  |     await expect(erdTab).toBeVisible();
  35  |     await expect(hldTab).toBeVisible();
  36  |     await expect(lldTab).toBeVisible();
  37  |     await expect(seqTab).toBeVisible();
  38  | 
  39  |     // Switch to High-Level C4
  40  |     await hldTab.click();
  41  |     // Search input should still be accessible
  42  |     const searchInput = page.getByPlaceholder(/Search nodes or tables/i);
  43  |     await expect(searchInput).toBeVisible();
  44  |     await searchInput.fill('Service');
  45  |     await searchInput.clear();
  46  | 
  47  |     // Switch to Low-Level Call Graph
  48  |     await lldTab.click();
  49  | 
  50  |     // Switch to Execution Sequence
  51  |     await seqTab.click();
  52  | 
  53  |     // Return to Database ERD
  54  |     await erdTab.click();
  55  |   });
  56  | 
  57  |   test('should switch between all 4 Persona intelligence views', async ({ page }) => {
  58  |     // 1. Developer View (Default or clicked)
  59  |     const devTab = page.getByRole('button', { name: /Developer View/i });
  60  |     await devTab.click();
  61  |     await expect(page.getByText('Database Tables').first()).toBeVisible();
  62  |     await expect(page.getByText('API Endpoints').first()).toBeVisible();
  63  | 
  64  |     // 2. Engineering Manager View
  65  |     const mgrTab = page.getByRole('button', { name: /Engineering Manager/i });
  66  |     await expect(mgrTab).toBeVisible();
  67  |     await mgrTab.click();
  68  |     await expect(page.getByText(/Sprint Risk/i)).toBeVisible();
  69  |     await expect(page.getByText(/Module Coupling Index/i)).toBeVisible();
  70  | 
  71  |     // 3. Business Owner View
  72  |     const bizTab = page.getByRole('button', { name: /Business Owner/i });
  73  |     await expect(bizTab).toBeVisible();
  74  |     await bizTab.click();
  75  |     await expect(page.getByText(/Core Business Engines/i)).toBeVisible();
  76  | 
  77  |     // 4. What-If Impact Simulator
  78  |     const simTab = page.getByRole('button', { name: /What-If Impact Simulator/i });
  79  |     await expect(simTab).toBeVisible();
  80  |     await simTab.click();
  81  |     await expect(page.getByText(/Live "What-If" Modification Blast-Radius Simulator/i)).toBeVisible();
  82  |   });
  83  | 
  84  |   test('should interact with the What-If Blast Radius Simulator', async ({ page }) => {
  85  |     // Navigate to simulator tab
  86  |     const simTab = page.getByRole('button', { name: /What-If Impact Simulator/i });
  87  |     await simTab.click();
  88  | 
  89  |     // Verify selector elements
  90  |     const selects = page.locator('select');
  91  |     await expect(selects.first()).toBeVisible();
  92  | 
  93  |     // Change target selector if options exist
  94  |     const targetSelect = selects.nth(1);
  95  |     const optionsCount = await targetSelect.locator('option').count();
  96  |     if (optionsCount > 1) {
  97  |       await targetSelect.selectOption({ index: 1 });
  98  |     }
  99  | 
  100 |     // Verify risk assessment is displayed
  101 |     await expect(page.getByText(/Computed Blast Severity/i)).toBeVisible();
  102 |     await expect(page.getByText(/Total Ripple Nodes/i)).toBeVisible();
  103 |   });
  104 | 
  105 |   test('should simulate table_name, column_name, and key modification with impact percentages', async ({ page }) => {
  106 |     // Navigate to simulator tab
  107 |     const simTab = page.getByRole('button', { name: /What-If Impact Simulator/i });
  108 |     await simTab.click();
```