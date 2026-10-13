# System Architecture & Data Flow

BendLens operates through a clean, sequential data pipeline coordinated by `ProjectAnalyzer` (`src/lib/analyzer.js`):

```mermaid
flowchart TD
    A[Input: Directory Path / Uploaded ZIP / Pasted SQL] --> B[ProjectAnalyzer.scanDirectory]
    B --> C1[SchemaParser]
    B --> C2[PolyglotParser]
    B --> C3[InfraParser]
    C1 --> D[KnowledgeGraph.build]
    C2 --> D
    C3 --> D
    D --> E1[DiagramGenerator: ERD, HLD, LLD, Sequence]
    D --> E2[ImpactAnalyzer: What-If Blast Radius]
    D --> E3[PersonaMapper: Developer, Manager, Business]
    E1 --> F[Response: fresh analysis JSON per request (no shared cache)]
    E2 --> F
    E3 --> F
    F --> G[Client Dashboard: /lens]
```

## Detailed Pipeline Phases

### Phase 1: Directory Ingestion & Guards (`scanDirectory` / `scanDirectoryAsync`)
- Filters ignored folders (`node_modules`, `.git`, `.next`, `dist`, `__pycache__`, `.gradle`, `.m2`, `Pods`, `site-packages`, `.yarn`, `.pnpm-store`, `cypress`, `edge_profile`, `chrome_profile`, `Default`, `Extensions`, `IndexedDB`, `GPUCache`, etc.).
- **Pre-Filtered Media & Binary Assets**: Bypasses `fs.statSync` on media, fonts, binaries, and compressed archives (`.png`, `.jpg`, `.woff`, `.zip`, `.dll`, `.exe`, `.bin`, `.svg`, `.css`, `.scss`, `.md`, `.html`, `.lock`, etc.) via `ProjectAnalyzer.IGNORED_EXTS` and `isRelevantFile`, as well as automated browser testing user data caches (`edge_profile*`, `Default/Extensions`, `IndexedDB`), drastically accelerating disk traversal on Windows file systems.
- **Targeted File Partitioning**: Automatically classifies scanned files into `schemaFiles`, `codeFiles`, and `infraFiles` before parsing, ensuring parsers only touch relevant files.
- No table/API ceilings: up to 100k files / 100k schema files, 5MB per code file, 500MB schema dumps (schema DDL is streamed in 4MB chunks via `parseLargeSQLFile`, never skipped). Single-file paths (e.g. a lone `.sql` dump) analyze directly. SQL-likes covered: `.sql/.ddl/.dump/.dmp/.pgsql/.psql/.mysql/.tsql/.mssql/.cql/.hql/.ora`.
- Collects an array of absolute file paths.

### Phase 2: Specialized AST & Schema Parsers (I/O Pre-Filtered & Fast-Pathed)
- **High-Speed File Pre-Filtering & Noise Rejection**:
  - Automatically bypasses `.d.ts`, `*.min.js`, `*.bundle.js`, and source maps across all parsers to prevent lockups on compiled bundles.
  - `InfraParser`: Checks filenames (`docker-compose.yml`, `dockerfile`, `openapi`, `package.json`, `requirements.txt`) before reading files from disk.
  - `PolyglotParser`: Validates supported extensions (`.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.java`, etc.) before calling `fs.readFileSync`, and uses fast keyword guards before running heavy route/DB regexes.
  - `SchemaParser`: Pre-filters candidate schema extensions (`.sql`, `.prisma`, `.json` seeds, model definitions) before disk reads.
- **CPU & Regex Lockup Guards**:
  - `isInComment`: Clamped to search only the preceding 2,000 characters rather than the entire file buffer, preventing catastrophic string allocations on long or single-line files.
  - `isInTripleStringDoc`: Uses bounded `indexOf` counting directly in the content string rather than allocating `substring` chunks.
  - `collectRawVars`: Guarded by strict `CREATE TABLE` statement regex (`/create\s+(?:or\s+replace\s+)?(?:(?:global\s+|local\s+)?(?:temp(?:orary)?|unlogged)\s+)?table/i`) and capped at 2,000 assignments, eliminating catastrophic regex looping across non-DDL and bundled files.
  - Dialect Fast-Paths: Pre-checks keywords before executing dialect regexes (`parseKnexTables`, `parseSequelizeTables`, `parseDrizzleTables`, `parseMongooseModels`, `parseTypeOrmTableObjects`, `parsePythonCodeTables`, `parseJavaEntities`, `parseCSharpTables`, `parseGoStructs`, `parseAlterTables`, `parseVariableExecutedDDL`, etc.).
1. **`SchemaParser` (`src/lib/parsers/schemaParser.js`)**:
   - Parses table definitions, column types, primary keys, foreign keys, unique constraints, and sample data fixtures from SQL files, SQLite databases, and ORM models.
   - Deduplicates tables via case/underscore/plural-insensitive `tableKey()` + `upsertTable()` merge (e.g. SQL `users` + Prisma `User` + `order_items`/`OrderItem` merge into one entry with a union of columns/FKs) so table counts stay consistent across Header, ERD, HLD, LLD, and persona views. Sample-data and INSERT lookups use the same normalized key.
   - Scans code files for code-created tables via `parseCodeDefinedTables()`: embedded `CREATE TABLE` (shared `buildTableFromBody()`, trusted only in migration-like files or query-executor calls), Knex `createTable`, Sequelize `define/init`, Drizzle `pgTable/mysqlTable/sqliteTable`, Mongoose `model()` aliases (+ implicit `_id`), TypeORM `EntitySchema` (balanced-brace `@Entity` bodies), Alembic `op.create_table` / `Table()`, Django `CreateModel`, JPA `@Entity`, EF Core `DbSet`, GORM structs (`TableName()`). `isInComment()` / docstring guards keep docs and UI demo strings out of the schema; FK targets resolve via `resolveTableRef()`.
   - Intra-file DDL data-flow (`collectDDLVariables()` + `parseVariableExecutedDDL()`): query text assigned to a variable (plain, `+`/implicit concat, interpolated, triple-quoted, parenthesized; identifiers resolved fixpoint through the file's literal assignments) and later passed to an executor (`query/execute/raw/run/...(var)`) is parsed as schema. Unresolvable dynamic table names hit the `ZZZDYNZZZ` sentinel and are never registered; assigned-but-never-executed strings are ignored via `isAssignmentRHS()`. String-opener matchers must list lone single- and double-quotes as their own alternation branches (a branch like quote-plus-quote never matches a lone quote).
   - Cross-file DDL data-flow (`indexFileForCrossFile()` per code file + `resolveCrossFileDDL()` driver after the scan): per-file export/import indexes (`collectFileExports` — ESM/CJS incl. `export *` barrels, Python modules, Java/C#/Go visibility; `parseFileImports` — named/default/namespace/require/from-import/static-import/using), path resolution (`resolveImportPath` — relative, `@/~/` aliases, bare/dotted suffix match), re-export chasing (`lookupExport`), class/package/module search (`findClassFile`/`findGoPackage`), dict/object member forms (`NS.X`, `Q['k']`). Executor args resolving to another file's DDL var are parsed with defining-file provenance. Only executor-reached constants register: never-imported, imported-but-unexecuted, and assigned-but-unexecuted strings all stay out.
   - ALTER TABLE (`parseAlterTables` + `applyAlterAction`, shared `buildColumnFromDef`): `ADD [COLUMN]`, `ADD CONSTRAINT ... PRIMARY KEY/FOREIGN KEY` merge into existing tables (or seed minimal entries) across `.sql`, embedded, variable-held and cross-file DDL. Python class models accept `Model`/`db_table`/`table_name`, Peewee/Django field forms incl. module-prefixed `sa.Column`, class-form `ForeignKey(Model)` and `'app.Model'` refs. C# Fluent API (`parseFluentAPI` + `resolveFluentAPI` driver over the global `_csClasses` index): `ToTable`/`HasKey`/`Property`+`IsRequired`/`HasColumnType`/`HasDefaultValue`/`HasOne`+`HasForeignKey`/`HasIndex`+`IsUnique`, typed from entity classes cross-file.
2. **`PolyglotParser` (`src/lib/parsers/polyglotParser.js`)**:
   - Regex- and AST-driven pattern scanner extracting classes, functions, imports, REST endpoints (`app.get`, `@app.route`, `@GetMapping`, Next.js, NestJS, FastAPI, Laravel, Gin, etc.), and database access calls across JS/TS, Python, Java, Go, C#, PHP, and Ruby.
   - Accurately captures multiline route handler declarations, arrays of paths (`["/route", "/api/route"]`), template literals, Express chained routes, Fastify/Hapi object routes, and WebSocket endpoints.
   - **Automated API Classification**: Classifies every endpoint by protocol kind (`REST`, `WEBSOCKET`, `AUTH`, `STORAGE`, `ADMIN`, `WEBHOOK`, `SYSTEM`, `GRAPHQL`) and architectural tier (`HIGH`, `MEDIUM`, `LOW`).
   - Fast route and DB keyword filters bypass unnecessary regex passes on generic files.
3. **`InfraParser` (`src/lib/parsers/infraParser.js`)**:
   - Extracts Docker containers, ports, environment bindings, Docker Compose services, and OpenAPI contracts (supporting both JSON and YAML OpenAPI specs).
   - Seamlessly merges OpenAPI-declared endpoints into `codeData.endpoints` during project analysis.

### Phase 3: Bi-Directional Knowledge Graph (`KnowledgeGraph`)
- In-memory directional graph constructed in `src/lib/graph/knowledgeGraph.js`.
- Maintains node sets and bi-directional adjacency maps (`adjacency` and `reverseAdjacency`).
- Connects disparate entities: Database tables <-> API routes <-> Services <-> Code modules.
- **Entity Connection Linking & Action Typing**:
  - Links endpoints directly to database tables (`READS_FROM`, `WRITES_TO`, `STREAMS_FROM`) using plural/singular variant token matching and controller module bindings.
  - Refines architectural tier (`HIGH` for multi-table mutations and composite workflows, `MEDIUM` for single-model CRUD, `LOW` for system utilities).
- **High-Scale Graph Optimization**:
  - Uses precomputed lowercase and clean table token mappings to eliminate redundant string allocations.
  - Caps function node injection at 500 (prioritizing table-linked functions) to eliminate $O(F \times T)$ bottlenecks across codebases with tens of thousands of functions while maintaining complete symbol telemetry.

### Phase 4: Downstream Generation Engines
1. **`DiagramGenerator` (`src/lib/generators/diagramGenerator.js`)**:
   - Compiles graph nodes and schemas into Mermaid diagram definitions (`erDiagram`, `flowchart TB`, `flowchart LR`, `sequenceDiagram`).
2. **`ImpactAnalyzer` (`src/lib/generators/impactAnalyzer.js`)**:
   - Evaluates consequences of renaming/deleting tables, columns, constraints, or endpoints. Calculates ripple nodes, affected code files, downstream FK failures, and risk scores.
3. **`PersonaMapper` (`src/lib/generators/personaMapper.js`)**:
   - Projects technical metrics into Developer, Engineering Manager, and Business Owner views.

### Phase 5: Storage & Presentation
- **Client Payload Optimization**: Analysis payload preserves exact file, table, endpoint, function, and module counts in `metrics` and `summary` while pruning raw auxiliary symbol lists (`functions` <= 500, `modules` <= 250) sent in JSON. Keeps payload size under 1MB, preventing browser 5MB `sessionStorage` quota overflow and avoiding redundant re-scans upon navigation to `/lens`.
- **No shared server cache (privacy fix)**: every API route (`analyze`, `current`, `upload`, `paste`, `sample`, `git-clone`, `impact`) runs a fresh `ProjectAnalyzer.analyze()` per request and returns it directly with `Cache-Control: no-store` (`analyze`/`current`/`sample` are `force-dynamic` + `revalidate: 0`). The former global `serverCache.js` singleton was deleted because it leaked one user's analysis to other users and served stale results on re-scans. The lens page restores the last path from per-browser `localStorage` (`bendlens-path`) and re-analyzes on load; rescan clears the displayed model first and fetches with `cache: no-store` + a timestamp query so the same old table/API counts can never flash back.
- **Real-Time Telemetry, Timers & Cancellation Support**: Both `/` (Landing/Ingestion) and `/lens` (Studio Workspace) integrate millisecond-accurate stopwatch telemetry (`scanElapsedTime` / `rescanElapsedTime`), streaming live elapsed time in progress HUDs and displaying final duration upon completion without artificial delays. Ingestion uses `AbortController` (`handleCancelScan`), allowing users to cancel in-flight requests at any stage without hanging UI state.
- **Client App (`src/app/lens/page.jsx`)**: Renders interactive diagram canvases with pan/zoom/export, persona views, data tables, and the blast radius simulator.
