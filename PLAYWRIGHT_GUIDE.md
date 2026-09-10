# 🎭 Playwright Testing Guide for BendLens

This guide explains everything you need to know to run, debug, view, and write Playwright tests for the **BendLens** project.

---

## 📌 Quick Summary of Scripts

We added convenient npm shortcuts directly to your `package.json`:

| Command | Purpose |
| :--- | :--- |
| `npm run test:e2e` | Runs all end-to-end and API tests headlessly in terminal |
| `npm run test:e2e:ui` | Opens the **Playwright Interactive UI Runner** (Recommended for dev) |
| `npm run test:e2e:headed` | Runs tests in a visible Chromium browser window |
| `npm run test:e2e:debug` | Opens the **Playwright Inspector** to step through tests line-by-line |
| `npm run test:e2e:report` | Opens the rich HTML test execution report |

---

## 🚀 How to Run Playwright Tests

### 1. Run All Tests (Standard Headless)
This runs all tests in the background using Chromium and displays a console summary:
```bash
npm run test:e2e
# or
npx playwright test
```

> **Note:** You do **not** need to manually start the Next.js dev server beforehand! Playwright is configured in `playwright.config.js` to automatically spin up `npm run dev` at `http://localhost:3000` before running tests and shut it down afterwards.

---

### 2. Interactive UI Mode (Best Developer Experience 🌟)
Playwright's UI mode provides a full GUI where you can watch tests execute live, inspect the DOM tree, pick selectors, jump between timeline snapshots, and reload tests on change:
```bash
npm run test:e2e:ui
# or
npx playwright test --ui
```

**Features in UI Mode:**
- Watch Mode: Automatically re-runs when you edit files.
- Time-Travel: Hover over each action step to see exactly what the browser looked like.
- Console logs & Network tab: Inspect network requests and API responses.

---

### 3. Run with Visible Browser (Headed Mode)
If you want to visually watch the browser clicking buttons and typing without opening the full UI runner:
```bash
npm run test:e2e:headed
# or
npx playwright test --headed
```

---

### 4. Run a Specific Test File
You can run only one file instead of the whole suite:
```bash
# Run only Landing page tests
npx playwright test tests/landing.spec.js

# Run only Lens Studio dashboard tests
npx playwright test tests/lens.spec.js

# Run only API endpoint tests
npx playwright test tests/api.spec.js
```

---

### 5. Run a Specific Test by Name (Filter)
Use the `-g` (grep) flag to run a specific test case matching a title:
```bash
npx playwright test -g "toggle light and dark"
npx playwright test -g "POST /api/paste"
```

---

### 6. Debugging Tests (Playwright Inspector)
Step through tests line-by-line with execution paused:
```bash
npm run test:e2e:debug
# or debug a specific test
npx playwright test tests/landing.spec.js --debug
```

In debug mode:
- A browser opens with the Playwright Inspector toolbar.
- Click **Resume (F8)** to continue or **Step Over (F10)** to go to the next line.
- You can edit selectors in the inspector to test them live.

---

### 7. View the HTML Test Report
After any test run, an HTML report is created in `playwright-report/`. Open it in your browser:
```bash
npm run test:e2e:report
# or
npx playwright show-report
```

---

### 8. Generate New Tests Automatically (Playwright Codegen)
Playwright can record your clicks, inputs, and navigation and generate test code automatically:
```bash
npx playwright codegen http://localhost:3000
```
Simply click around the BendLens UI and copy the generated JavaScript test code into your test file!

---

## 📁 Test Suite Structure

```
data-project/
├── playwright.config.js    # Playwright configuration (ports, webServer, browser)
├── tests/
│   ├── landing.spec.js     # Landing page UI, ingestion modes, themes, sample loader
│   ├── lens.spec.js        # Studio dashboard, ERD/HLD/LLD canvas, personas, blast simulator
│   └── api.spec.js         # Backend API routes (/api/sample, /api/current, /api/paste, /api/history)
└── playwright-report/      # Generated HTML reports
```

---

## 💡 Configuration Tips (`playwright.config.js`)

- **Automatic Dev Server**:
  ```javascript
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  }
  ```
  If you already have `npm run dev` running in another terminal, Playwright will reuse that running instance instead of starting a new one.

- **Trace on Failure**:
  Traces and screenshots are automatically captured when a test fails, helping you inspect the exact state of the failure.
