# Comprehensive Codebase Map

This document maps all directories, modules, and significant files across BendLens.

## Root Directory
- `package.json`: Project manifest (Next.js 16, React 18, Tailwind CSS 3, Electron 43, electron-builder 26).
- `pnpm-lock.yaml`: Primary lockfile for fast, deterministic dependency resolution via `pnpm`.
- `.npmrc`: Configured with `shamefully-hoist=true` and `auto-install-peers=true` for Next.js and Electron flat resolution.
- `run.bat` / `run.js`: 1-Click Windows development launcher (auto-detects `pnpm`).
- `BendLens.bat` / `BendLens.exe`: Windows desktop launcher wrapper (auto-detects `pnpm`).
- `next.config.js`: Next.js configuration.
- `tailwind.config.js`: Tailwind theme styling configuration.
- `sample_project/`: Built-in sample multi-tier application (Flask, schema.sql, docker-compose.yml) used for quick demonstration and fallback analysis.

---

## `src/lib/` (Core Analytical Engines)
- **`analyzer.js`**: `ProjectAnalyzer` coordinator class. Orchestrates folder scanning, parsing, graph creation, and diagram generation.
- **`appPaths.js`**: Packaged-aware root resolution (`getAppRoot()` via `BENDLENS_APP_DIR` → `<resources>/app` → `process.cwd()`; `getSampleProjectPath()` with resource-mirror probes). Used by all `process.cwd()`-dependent API routes so downloaded Electron installs resolve `sample_project`/`package.json` correctly.
- **`serverCache.js`**: In-memory server-side storage for the latest analysis payload, bypassing browser storage limitations.
- **`parsers/`**:
  - `schemaParser.js`: SQL DDL parser (Postgres, MySQL, MariaDB, SQLite, SQL Server, Oracle), SQLite binary files, Prisma, Mongoose, TypeORM, SQLAlchemy, Django ORM, and sample data value extraction.
  - `polyglotParser.js`: AST & pattern parser for JavaScript, TypeScript, Python, Java, Go, and C#. Extracts functions, classes, API routes, and DB access points.
  - `infraParser.js`: Dockerfile, Docker Compose, OpenAPI/Swagger, and package manifest parser.
- **`graph/`**:
  - `knowledgeGraph.js`: Bi-directional in-memory graph holding nodes (`table`, `endpoint`, `service`, `class`, `function`) and edges (`FK_REFERENCES`, `CALLS`, `WRITES_TO`, etc.).
- **`generators/`**:
  - `diagramGenerator.js`: Produces sanitized Mermaid code for ERD, HLD (C4 containers), LLD (call graph), and Sequence diagrams.
  - `impactAnalyzer.js`: Calculates blast radius, ripple nodes, risk scores (0-100), and automated mitigation checklists.
  - `personaMapper.js`: Maps raw system data into Developer, Manager, and Business persona dashboards.

---

## `src/components/` (Frontend React Components)
- **`BlastRadiusSimulator.jsx`**: Interactive "What-If" simulator interface with target selector, change type picker (rename/drop table, column, key), risk meter, affected files, and mitigation checklist.
- **`DiagramCanvas.jsx`**: Mermaid rendering canvas with infinite pan, zoom controls, export to PNG/SVG/Mermaid code, and reset viewport.
- **`DatabaseSchemaDiagram.jsx`**: Interactive spreadsheet data viewer displaying sample data rows and column types for detected tables.
- **`PersonaSwitcher.jsx`**: Segmented control for toggling between Developer, Manager, and Business views.
- **`Header.jsx`**: Main navigation bar with project path display, theme toggle, export trigger, and desktop indicator.
- **`ThemeToggle.jsx`**: Dark/Light mode switcher persisting preference in `localStorage`.
- **`ExportModal.jsx`**: Export dialog for downloading architecture reports (JSON, Markdown, Mermaid).
- **`UpdateIndicator.jsx` / `UpdateShowcaseModal.jsx`**: Desktop-only updater UI (gated by `useIsDesktop()` → `window.bendlensDesktop.isDesktop` from `electron/preload.js`; renders null on web since web auto-updates) with navbar pill, floating notification, and changelog modal.
- **`useIsDesktop.js`** (`src/lib/`): shared hook — true only inside the downloaded Electron app.
- **`views/`**:
  - `DeveloperView.jsx`: Developer engineering console with AST symbol tree, API endpoint table, breaking change warnings, and schema table inspectors.
  - `ManagerView.jsx`: Engineering Manager view displaying architecture risk score, module coupling index, tech debt hotspots, and sprint risk matrix.
  - `BusinessView.jsx`: Business Owner view displaying business capabilities, customer user journeys, and plain-English architectural summaries.

---

## `src/app/` (Next.js App Router)
- **`page.jsx`**: Landing page with project selection options (folder path input + **Analyze Input** button, disabled until a path is entered, drag-and-drop ZIP upload, SQL paste modal, sample project loader).
- **`layout.jsx`**: Root HTML layout and font configurations.
- **`globals.css`**: Global styles, Tailwind base, and diagram canvas animations.
- **`lens/page.jsx`**: Core dashboard housing the diagram canvas, persona tabs, and blast radius simulator.
- **`api/` (API Route Handlers)**:
  - `analyze/route.js`: Ingests and analyzes a local project directory.
  - `upload/route.js`: Handles ZIP file uploads, resilient extraction, and immediate analysis.
  - `paste/route.js`: Analyzes raw pasted SQL or code snippets in memory.
  - `impact/route.js`: Calculates real-time blast radius for a specified table, column, or key modification.
  - `current/route.js`: Retrieves the active analysis from `serverCache`.
  - `sample/route.js`: Loads and analyzes the built-in sample project.
  - `history/route.js`: Returns recent project analysis history.
  - `updates/check/route.js`: Checks version and update availability.
  - `git-clone/route.js`: Clones and analyzes a remote git repository locally.
  - `download-app/route.js`: Provides download links for the packaged desktop app.

---

## `electron/` & `scripts/` (Desktop & Tooling)
- **`electron/main.js`**: Packaged-aware Electron main process — single instance lock (second launch restores/shows/raises the existing window, never a second engine), instant splash, `resolveAppDir()` (resources/app vs repo root, version-guarded asar extraction via `extracted-app.version`), sets `BENDLENS_APP_DIR` + `chdir(projectDir)` before engine boot, version-aware `resolvePort()` (reuses a live engine only on version match) with BendLens identity probe (`/api/updates/check`), `detectDuplicateInstalls()` (NSIS/legacy/portable copies → once-per-version "Already Installed" dialog), embedded production server via Electron's Node in packaged mode (no npm needed), native error dialogs instead of dead URLs.
- **`electron/splash.html`**: Ultra-fast (<50ms) CSS animated splash screen.
- **`scripts/BendLensLauncher.cs` → `BendLens.exe`**: Native launcher; single-instance mutex ("Already Installed & Running" notice on double-launch); resolves installed runtime (exe dir → `%LOCALAPPDATA%\Programs\BendLens` NSIS → `%LOCALAPPDATA%\BendLens` legacy → `%ProgramFiles%\BendLens`, no dev-path fallback); Electron fast path or verified `npm run start` + browser-on-success; `MessageBox` guidance on failure.
- **`scripts/installer.nsh`**: NSIS include (`customInstall` clears legacy payload dir + stale `extracted-app` cache on reinstall; `customUnInstall` wipes `%APPDATA%\BendLens`, legacy dirs, temp history, shortcuts — uninstall deletes all app data). Wired via `package.json` `build.nsis` (`deleteAppDataOnUninstall`, `uninstallDisplayName`, `runAfterFinish`, start-menu shortcut).
- **`scripts/launch-desktop.js`**: Starts Electron desktop app natively.
- **`scripts/build-installer.js`**: Generates `public/downloads/BendLens-Setup.cmd` (detects existing installs, stops running BendLens before overwriting, writes a full-cleanup `Uninstall-BendLens.cmd` into the install dir) and `public/downloads/Uninstall-BendLens.cmd` (wipes install dirs + `%APPDATA%\BendLens` + temp history + shortcuts).
- **`scripts/generate-icons.js`**: Generates brand icons for Windows (`.ico`) and web (`.png`/`.svg`).

---

## Enterprise Design System (UI-only, no logic changes)
- **Tokens**: `src/app/globals.css` holds light/dark CSS vars (`--background`, `--surface*`, `--border*`, `--subtext`, `--accent-primary`); `tailwind.config.js` maps them to `bg-background`, `bg-surface*`, `border`, `text-muted`, `bg-brand` (+ extended `brand` 50–900 ramp, `ink` scale, `shadow-card/lift/dropdown/modal/glow`, `animate-rise`).
- **Buttons**: `.btn-primary` (gradient indigo, ring, lift on hover), `.btn-secondary` (quiet bordered), `.btn-ghost`, `.btn-danger`, `.primary-action` legacy alias — all defined in `globals.css`. All call sites in `src/app/page.jsx`, `src/app/lens/page.jsx`, `Header.jsx`, `BlastRadiusSimulator.jsx`, `DeveloperView.jsx`, `BusinessView.jsx`, `ExportModal.jsx`, `DownloadModal.jsx` reuse these classes.
- **Helpers**: `.chip` (pill status), `.section-label` (uppercase micro-label), `.kpi-rail`, `.card-hover`, `.canvas-viewport` (radial glow + dot grid), `.animate-rise` + `.stagger-*` entrance motion, `.no-scrollbar`.
- **Header (`Header.jsx`)**: Sticky chrome bar with brand + engine status, path input + Rescan/Sample/Export actions, always-visible Download Desktop App button (when `onDownloadApp` is passed), UpdateIndicator + ThemeToggle. `UpdateIndicator` pill/notification use `dark:` variants for light-mode contrast. Conditional stats bar when analysis exists (chips for project name, file/table/API/node counts, synced timestamp + project path). Responsive: brand cluster stays visible, path input flexes, buttons collapse to icons on mobile. Accepts `isLocalApp` and `onDownloadApp` props.
- **`DownloadModal.jsx`**: Large (`max-w-4xl`) dialog with gradient hero header, why-desktop checklist + spec strip, 3-step guide, big download CTA; closes via X, ESC key, or backdrop click; locks body scroll while open (`role="dialog" aria-modal`). Same `isOpen/onClose/reason` API and `/api/download-app` link.
- **Landing header (`page.jsx` nav)**: always shows Download Desktop App (opens `DownloadModal` → `/api/download-app` serves root `BendLens.exe`); the "Desktop · Local & Private" badge is supplementary on `lg+` screens only.
- **Web PATH guard**: on non-local hosts (`!isLocalApp`), Local Path mode shows a prominent Desktop-required panel (headline, Desktop path example, 3-step mini guide, download CTA + ZIP/paste alternatives); clicking Analyze on a desktop-like path additionally surfaces the error banner and opens `DownloadModal` (existing `handleScanPath` guard, unchanged).
- **Landing page (`page.jsx`)**: All scan handlers (PATH, UPLOAD, PASTE, GIT, SAMPLE) now auto-navigate to `/lens` via `handleOpenLens('DEVELOPER')` after analysis completes.
- **Footer (landing page only, `page.jsx`)**: Three-column grid — brand/positioning with trust badges, Product nav (Studio, Simulator, ERD, Call Graph), Platform links (Desktop .exe, Web, Git Clone, ZIP/Paste). Bottom bar with version, philosophy tagline, and compliance chips. No cards, pure typography + subtle icon buttons.
- **Correctness notes (Tailwind v3)**:
  - `shadow-xs` and `brand.foreground` are defined in `tailwind.config.js` (`boxShadow.xs`, `brand.foreground: #fff`) — `shadow-xs` and `text-brand-foreground` are valid.
  - Opacity modifiers do NOT work on `var()`-based colors (`bg-surface/80`, `hover:bg-surface-raised/40`, `border-border/40`, …) — they compile to invalid CSS and are silently dropped. Use solid tokens or the color-mix helpers instead.
  - `.chrome-bar` (sticky nav/canvas header/footer: 84% surface + blur), `.overlay-card` (floating hints: 92% surface-card + blur), `.field-label` + `.field-hint` (form labels with helper copy).
- **Simulator**: `BlastRadiusSimulator.jsx` renders a Generated-statement preview from the existing `simulatedSQL` + `handleCopySql` state (display-only, nothing executes).
- **Dark system (`globals.css` `.dark`)**: deep base `#060a13`, blue-tinted elevations, slate borders, `#f1f5fb`/`#93a1b9` text, sheen card shadows, brighter accent, stronger glows; Mermaid dark canvas `#0b1120`. Dead `var()`-opacity classes (`placeholder:text-muted/60`, `divide-border/60`…) replaced with solid tokens app-wide.
- **Landing motion & editorial**: `src/app/page.jsx` hero rotates 4 outcome phrases (`HERO_PHRASES`, 3.2s interval, `.hero-word` blur-rise animation, `aria-live="polite"`); Why BendLens is a box-free editorial (numbered 01–03 rows, hairline dividers, alternating open visuals: outline SVG FK-topology with `.flow-line` dash-flow + `.node-ping`, divider persona list, large blast metric with `.risk-cycle` bar + `.soft-pulse`).
- **Landing canvas**: content widened to `max-w-6xl`; landing-only split sprinkle (`.sprinkle-top`: indigo→cyan wash on the right of the first half; `.sprinkle-bottom`: wash on the left of the second half; dot-free, dark + mobile variants) in an `aria-hidden` absolute layer inside `src/app/page.jsx` `main`.
- **ThemeToggle**: sliding pill dark position `translate-x-6` (aligned to moon segment). **DiagramCanvas**: plain wheel scrolls the page; Ctrl/Cmd+wheel zooms via native non-passive listener (`viewportRef`).
