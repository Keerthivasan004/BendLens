---
name: bendlens-parser-engineer
description: Guide and instructions for extending, modifying, or debugging BendLens AST parsers (SchemaParser, PolyglotParser, InfraParser) and the KnowledgeGraph builder.
---

# BendLens Parser Engineer Skill

Use this skill when you need to:
- Add support for a new database dialect (e.g., CockroachDB, ClickHouse, Cassandra).
- Add support for a new ORM (e.g., MikroORM, Drizzle variants, Peewee).
- Add AST pattern recognition for a new backend programming language (e.g., Rust, Kotlin, Ruby).
- Add support for new infrastructure definitions (e.g., Kubernetes manifests, Helm charts, Terraform).
- Fix parsing bugs or extract additional metadata into `KnowledgeGraph`.

---

## Architecture Overview

1. **`SchemaParser` (`src/lib/parsers/schemaParser.js`)**:
   - Parses SQL DDL (`CREATE TABLE`, `ALTER TABLE ADD CONSTRAINT`, foreign keys, data types).
   - Extracts sample values from SQL `INSERT INTO`, JSON fixtures, and CSV seeds.
   - Handles ORMs: Prisma schemas (`model ...`), Mongoose schemas, TypeORM entity decorators, SQLAlchemy classes.
   - Scans every code file for code-created tables (`parseCodeDefinedTables`): embedded DDL (migration-like paths or query-executor calls only), Knex/Sequelize/Drizzle builders, Mongoose `model()`, `EntitySchema`, Alembic/`Table()`, Django `CreateModel`, JPA `@Entity`, EF `DbSet`, GORM structs. Guards: `isInComment()` (+ `isInTripleStringDoc`, executor-context gate, `isAssignmentRHS`) so docs/demo strings never pollute counts; shared helpers `splitTopLevel()`, `extractBalanced()`, `makeCodeColumn()`, `registerCodeTable()`, `resolveTableRef()`.
   - Intra-file DDL data-flow (`collectDDLVariables()` + `parseVariableExecutedDDL()` with `parseOperandChain()`/`skipTrivia()`/`extractStringLiteral()`): `const ddl = "CREATE TABLE t (...)"; db.query(ddl)` (incl. concat, interpolation, triple-quoted, parenthesized) resolves identifiers fixpoint and re-parses trusted; dynamic table names become `ZZZDYNZZZ` and are skipped. Dicts/objects of queries via `collectDictDDLVars()` (`QUERIES['audits']`).
   - Cross-file DDL data-flow (`indexFileForCrossFile()` + `resolveCrossFileDDL()`): index every code file's exports/imports/declared types (`collectFileExports`, `parseFileImports`, `collectDeclaredTypes`), resolve specifiers (`resolveImportPath`), chase barrels (`lookupExport`), search classes/packages (`findClassFile`, `findGoPackage`), resolve executor args (`resolveCrossFileArg` — bare, `NS.X`, `Q['k']`, `NS.X['k']`) and parse with defining-file provenance. Rule: only executor-reached constants register.
   - ALTER TABLE (`parseAlterTables`/`applyAlterAction`, shared `buildColumnFromDef`): merge `ADD COLUMN`/`ADD CONSTRAINT` across all DDL paths. EF Fluent API (`parseFluentAPI`/`resolveFluentAPI` over `_csClasses`, `splitTopLevel(str, ';')` for statements). Python class models: `Model` base, `table_name`/`db_table`, module-prefixed fields, class-form and `'app.Model'` FKs.
2. **`PolyglotParser` (`src/lib/parsers/polyglotParser.js`)**:
   - Analyzes source code files across JS/TS, Python, Java, Go, C#, PHP, Ruby.
   - Extracts complete REST endpoints, WebSockets, database query access sites, function names, and class hierarchies.
   - Modern framework support:
     - Express / Fastify / Koa / Router: handles single paths, array of paths (e.g. `router.get(["/path1", "/api/path1"], ...)`), multiline handler declarations, chained routing (`router.route('/path').get(...).post(...)`), and object routes.
     - Next.js App Router (`app/**/route.ts` with `export async function GET` / `export const GET`) and Pages Router (`pages/api/**`).
     - NestJS: controller classes (`@Controller('prefix')`) combined with method mappings (`@Get`, `@Post`, etc.).
     - WebSockets: `WS_PATH`, `WebSocketServer`, upgrade paths.
     - Python: FastAPI (`@app.get`, `@router.api_route`), Flask (`@app.route`, `add_url_rule`), Django (`path()`, `re_path()`), DRF (`@api_view`, `@action`).
     - Java: Spring Boot (combining class-level `@RequestMapping` with method mappings) and JAX-RS (`@Path`, `@GET`).
     - Go: Gin, Fiber, Echo, Chi, Mux (`r.GET`, `r.Get`, `http.HandleFunc`).
     - C#: ASP.NET Core controllers (combining class-level `[Route]` with method `[HttpGet]`) and Minimal APIs (`app.MapGet`).
     - PHP: Laravel (`Route::get`, `Route::resource`) and Symfony (`#[Route]`).
     - Ruby: Rails and Sinatra (`get`, `post`, `resources`).
   - Normalizes paths and deduplicates identical endpoints within the same module/scope.
   - **Automated API Classification**:
     - `classifyApiKind(method, path, source)`: Categorizes endpoints into `REST`, `WEBSOCKET`, `AUTH`, `STORAGE`, `ADMIN`, `WEBHOOK`, `SYSTEM`, or `GRAPHQL`.
     - `classifyApiLevel(method, path, kind)`: Categorizes endpoints into `HIGH` (business orchestration, multi-table mutations), `MEDIUM` (domain CRUD), or `LOW` (system utilities).
3. **`InfraParser` (`src/lib/parsers/infraParser.js`)**:
   - Parses Dockerfiles, Docker Compose files, OpenAPI specs (both JSON and YAML formats with `basePath` resolution), and package manifests.
   - Discovered OpenAPI/Swagger endpoints merge seamlessly into `codeData.endpoints` during project analysis with automatic archetype and tier classification.
4. **`KnowledgeGraph` (`src/lib/graph/knowledgeGraph.js`)**:
   - Ingests parsed output and builds nodes and bi-directional edges (`adjacency` / `reverseAdjacency`).
   - Maps endpoints to connected database tables (`READS_FROM`, `WRITES_TO`, `STREAMS_FROM`) using plural/singular variant token matching and controller module bindings.
   - Populates `ep.connectedTables = [ { name, action, type, isDirect }, ... ]` on every endpoint and refines `ep.level` dynamically.

---

## Step-by-Step Implementation Workflow

### Step 1: Updating SchemaParser
When adding a new SQL dialect or ORM:
1. Open `src/lib/parsers/schemaParser.js`.
2. Locate the dialect-specific regex patterns or method (e.g., `parsePostgres`, `parseMySQL`, `parsePrisma`).
3. Ensure table names, column names, data types, primary keys (`isPrimaryKey: true`), and foreign keys (`isForeignKey: true`, `referencesTable`, `referencesColumn`) are captured accurately.
4. Normalize data types to lowercase alphanumeric tokens (e.g., `uuid`, `varchar`, `int`, `timestamp`) to prevent Mermaid rendering failures.
5. Always register tables via `upsertTable(name, entry)` (never `this.tables[name] = ...`) and look them up via `findTableKey(name)` — both are case/underscore/plural-insensitive so SQL + ORM + migration definitions of one table merge instead of double-counting.

### Step 2: Updating PolyglotParser
When adding a new language or framework route pattern:
1. Open `src/lib/parsers/polyglotParser.js`.
2. Add the file extension to `parseDirectory` (e.g., `.rs`, `.rb`, `.kt`).
3. Implement `parseLanguage(content, moduleInfo)`:
   - Identify function definitions: `/(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g`
   - Identify REST endpoints: regex for decorators/handlers (e.g., `@app.route`, `app.get`, `router.post`).
   - Identify DB access calls: regex for ORM queries (e.g., `findMany`, `select()`, `.objects.filter`).

### Step 3: Updating KnowledgeGraph
1. Open `src/lib/graph/knowledgeGraph.js`.
2. Ensure new node types or edge types (`CALLS`, `WRITES_TO`, `CONTAINS`, `DEPENDS_ON`) are added via `addNode` and `addEdge`.

### Step 4: Performance & Large-Scale Codebase Guidelines
When developing parsers or graph builder logic for 10,000+ file codebases:
1. **Keyword Fast-Paths**: Never execute complex multi-line regexes without testing `content.includes('keyword')` first (e.g. check for strict `CREATE TABLE` pattern before checking for DDL strings; check for `@Entity` before JPA parsing; check for `app.`/`router.`/`route` before HTTP endpoint matching). Over 99% of code files do not define schemas or routes.
2. **Bounded String Scans & Loop Caps**: Never run unbounded backwards string slices or regex replacements like `content.substring(0, index)` inside tight token loops. In variable assignment extractors (`collectRawVars`), cap assignment iterations (e.g. 2,000 matches max) to guarantee immunity against catastrophic regex execution on bundled/minified JS files.
3. **Reject Compiled Artifacts & Browser Profiles**: Exclude `.d.ts`, `*.min.js`, `*.bundle.js`, `.map` files, and automated browser test profiles (`edge_profile*`, `Default/Extensions`, `IndexedDB`) during file discovery. Browser extensions and bundled scripts contain tens of thousands of assignments in a single line, causing pathological regex performance.
4. **Graph Node Capping**: Cap auxiliary graph nodes (e.g., non-table linked functions capped at 500) and precalculate lookup sets (e.g., lowercase table names) to avoid $O(F \times T)$ nested loops during KnowledgeGraph synthesis.

### Step 5: Synchronize .agents Knowledge
Whenever parser capabilities or signatures are added or modified:
1. Update `.agents/memory/system_architecture.md` with the new parsing capabilities.
2. Update `.agents/memory/project_overview.md` if new dialects or languages were supported.
3. Update this skill file if new parser patterns or conventions were established.

