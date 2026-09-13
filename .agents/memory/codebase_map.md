# Comprehensive Codebase Map

This document maps all directories, modules, and significant files across BendLens.

## Root Directory
- `package.json`: Project manifest (Next.js 16, React 18, Tailwind CSS 3, Electron 43, electron-builder 26).
- `run.bat` / `run.js`: 1-Click Windows development launcher.
- `BendLens.bat` / `BendLens.exe`: Windows desktop launcher wrapper.
- `next.config.js`: Next.js configuration.
- `tailwind.config.js`: Tailwind theme styling configuration.
- `sample_project/`: Built-in sample multi-tier application (Flask, schema.sql, docker-compose.yml) used for quick demonstration and fallback analysis.

---

## `src/lib/` (Core Analytical Engines)
- **`analyzer.js`**: `ProjectAnalyzer` coordinator class. Orchestrates folder scanning, parsing, graph creation, and diagram generation.
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
- **`UpdateIndicator.jsx` / `UpdateShowcaseModal.jsx`**: In-app updater indicators and changelog modal.
- **`views/`**:
  - `DeveloperView.jsx`: Developer engineering console with AST symbol tree, API endpoint table, breaking change warnings, and schema table inspectors.
  - `ManagerView.jsx`: Engineering Manager view displaying architecture risk score, module coupling index, tech debt hotspots, and sprint risk matrix.
  - `BusinessView.jsx`: Business Owner view displaying business capabilities, customer user journeys, and plain-English architectural summaries.

---

## `src/app/` (Next.js App Router)
- **`page.jsx`**: Landing page with project selection options (folder path input, drag-and-drop ZIP upload, SQL paste modal, sample project loader).
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
- **`electron/main.js`**: Electron main process. Enforces single instance lock, opens native window, displays instant splash screen (`splash.html`), spawns or connects to the background Next.js server.
- **`electron/splash.html`**: Ultra-fast (<50ms) CSS animated splash screen.
- **`scripts/launch-desktop.js`**: Starts Electron desktop app natively.
- **`scripts/build-installer.js`**: Generates production Windows NSIS installers and executables.
- **`scripts/generate-icons.js`**: Generates brand icons for Windows (`.ico`) and web (`.png`/`.svg`).
