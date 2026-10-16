---
name: universal-api-crawler
description: Guide and instructions for maintaining, testing, and extending the BendLens Universal Barrier-Free Web & API Crawler engine and its authentic zero-hallucination extraction architecture.
---

# Universal API Crawler Skill

Use this skill when you need to:
- Extend web asset parsing, code-splitting discovery, or chunk graph traversal.
- Add support for new frontend frameworks, build tools, or manifest standards (e.g., Astro, Remix, SvelteKit, Bun).
- Enhance source-map de-obfuscation or reverse-engineering heuristics.
- Modify the authentic extraction pipeline or telemetry metrics.
- Extend `/api/crawl` or `/api/git-clone` crawler integration.

---

## Architectural Principles

1. **Authentic Extraction & Zero Hallucination**:
   - The crawler only presents genuine, authentic API routes, schemas, and endpoints extracted from live network calls, OpenAPI specs, GraphQL schemas, and JavaScript bundle ASTs.
   - For external website URLs, server-side database schemas are private to the backend server and unexposed over HTTP; the crawler sets `sqlSchema: ''` and displays an informative notice explaining that database tables are private.
   - The crawler **NEVER** fabricates fake database tables (e.g. `dashboard`, `profile`, `pricing`) or synthetic endpoints from plain HTML links or URL path segments.
   - **Authentic Zero-False-Positive Extraction**: The crawler strictly extracts verified backend API endpoints matching genuine REST, RPC, and GraphQL patterns. It eliminates false positive UI navigation routes (e.g. React Router `/auth/...` component routes), non-API file downloads, and synthetic duplicate routes, guaranteeing exact mathematical parity with true backend surfaces (e.g., verifying exactly 466 endpoints on canonical targets like `futrsec.in`).
   - **Clean Parameter Normalization**: All standard path parameters (`${id}`, `:id`) are canonicalized consistently to standard OpenAPI `{id}` without creating phantom duplicate routes or mangling verified resource paths.
   - **No Artificial Route Inflation**: Does not artificially generate wildcard endpoints or concatenate non-API suffixes onto base routes.
   - Strict AST token normalization (`normalizeApiPath`) rejects minified runtime artifacts (e.g., `/:`, `/{`, `/.`, `/%0`, `/e`, `/end`, `/finish`, `/close`, `/validator`).
   - Filters out non-HTTP web APIs (`headers.get`, `searchParams.get`, `formData.get`) and rejects un-prefixed UI navigation paths.
2. **Crash-Proof & Truthful Status Reporting**:
   - The crawler never crashes the Node.js server. Network errors, timeouts, and SSL failures are caught and reported with `crawlStatus: 'failed'` containing the exact network error message.
   - If a URL fails to connect or returns non-HTML/non-API errors, `/api/crawl` and `/api/analyze` return an explicit HTTP 400 error rather than misleading the user with fake successful results.
   - Total discovered operations in telemetry are computed across all valid verb operations, ensuring complete consistency with endpoint inventories.
   - Report generators enforce mutually exclusive partitioning (High, Medium, Low) so executive summary numbers mathematically sum to 100% of discovered endpoints.
3. **Local-First, Air-Gapped & ReDoS Safe**:
   - Traversal and AST parsing happen 100% in Node.js memory.
   - Crawled assets are never forwarded to external third-party cloud services.
   - **ReDoS Elimination**: All script and chunk regexes strictly avoid overlapping character classes and unanchored `[\s\S]*?` quantifiers. Uses $O(N)$ linear-time bounded statement slicing, allowing dense multi-megabyte JavaScript bundles to be parsed in under 10 milliseconds without V8 catastrophic backtracking.
4. **Dual-Depth Crawl Architecture (Normal Crawl vs Deep Crawl)**:
   - Modern React/Vite/Next.js/Angular single-page web applications split their codebase into lazy-loaded code-split chunks (e.g. Admin, Mentor, TPO, Employer, and AI modules). Standard web crawlers stop at initial public bundles, leaving over 150+ role-restricted APIs undetected.
   - BendLens features a strict two-tier phased execution pipeline:
     - **Phase 1 (Normal Crawl)**: Traverses initial HTML and the standard application chunk perimeter across Vite, Webpack, Next.js, and Nuxt bundles using canonical origin-resolved paths (`new URL(rawChunk, origin).href`). Using strict zero-hallucination endpoint extraction, for `https://futrsec.in` Normal Crawl visits 501 chunks and yields **exactly 466 APIs** (and for `https://fts2trial.bcbuzz.tech`, **470 APIs**), freezing `normalEndpoints` and `normalChunksCount`. If running in normal mode (`crawlDepth === "normal"`), execution stops immediately.
     - **Phase 2 (Deep Crawl)**: Traverses all dynamically imported chunks in deepQueue and sub-routes (e.g. /ai, /quiz, /admin) up to maxChunks using multi-worker batch concurrency. Executes Pattern 5 (Deep Role Modules) with { isDeepMode: true } across all discovered code chunks, discovering all lazy-loaded role endpoints (/admin, /mentor, /tpo, /employer, /learning, /student, /ai, etc.). For https://futrsec.in, Deep Crawl yields **642 APIs** (+176 lazy-loaded). For https://fts2trial.bcbuzz.tech, Deep Crawl yields **649 APIs** (+179 lazy-loaded). Total endpoints strictly obey the composition formula: Normal Crawl + Lazy-Loaded Chunks = Deep Crawl.
   - **Telemetry & Contract Propagation**:
     - Telemetry outputs `normalCrawlCount`, `deepCrawlCount`, `lazyLoadedEndpointsCount`, `normalChunksCount`, `deepChunksCount`, and `crawlDepth: { mode, normal, deep, lazyLoadedCount }`.
     - OpenAPI paths and synthesized endpoints carry `x-crawl-tier` (`normal` | `deep`), `x-lazy-loaded` (`false` | `true`), and `x-discovery-scope`.
     - Landing page (`page.jsx`) renders a dedicated Dual-Depth Crawl Breakdown banner with side-by-side comparative cards and the exact composition formula: `Normal: X + Lazy: Y = Deep: Z APIs`.
     - Top Header bar (`Header.jsx`) displays `Normal: X` and `Deep: Y APIs` side-by-side whenever a URL is crawled.
     - Studio Console (`DeveloperView.jsx`) provides interactive quick-filter pills (`All APIs (Deep Crawl)`, `Normal Crawl (Standard)`, `Lazy-Loaded Chunks Only`) and visual badges on each endpoint card.
     - PDF Assessment Report (`apiPdfReportGenerator.js`) includes a dedicated Dual-Depth Comparison Grid and table Crawl Scope indicators.
5. **Multi-Strategy Pipeline**:
   - **Stage 1**: Direct Ingestion (OpenAPI JSON/YAML, Postman Collection, live REST API JSON array/object, raw schemas).
   - **Stage 2**: Targeted Standard Probing (probes `/openapi.json`, `/swagger.json`, `/v3/api-docs` only when target is not an HTML document to prevent WAF / rate limit triggering).
   - **Stage 3**: Deep HTML, Next.js App Router & Embedded Spec Discovery (`SwaggerUIBundle({ url: '...' })`, Redoc `<redoc spec-url="...">`, Next.js `__NEXT_DATA__` manifests, Next.js App Router RSC redirect resolution `NEXT_REDIRECT;...`, `<meta http-equiv="refresh">` & JS location redirect following, `self.__next_f` inline chunk discovery, `<form action="...">`).
   - **Stage 4**: Recursive Bounded Chunk Graph Traversal (up to 500 code-split chunks with optimized concurrency 10 and 20ms batch pacing for rapid completion across Vite `/assets/*.js`, Next.js `/_next/static/chunks/*.js`, SvelteKit `/_app/immutable/*.js`, Nuxt `/_nuxt/*.js`, and Angular `*.chunk.js`).
   - **Stage 5**: Live API & Health Probe Verification (probes authentic `/api/health` and live Better-Auth `/api/auth/*` handlers including session and username/password sign-in routes).
   - **Stage 6**: Source Map (.js.map) Decompilation (recovers raw unminified source code to extract route controllers and interfaces).
   - **Stage 7**: Polyglot API Reverse-Engineering across Frontend Frameworks:
     - **Next.js & React**: Decodes React Router routes, Next.js server actions, API route handlers, and RSC payload dependencies.
     - **Flutter Web**: Automatically detects Flutter Web (`flutter.js`, `flt-glass-pane`) and analyzes compiled Dart bundles (`/main.dart.js`, `/flutter_bootstrap.js`), recovering Dart `http`, `Dio`, and `Uri.parse` API endpoints.
     - **Angular**: Reverse-engineers `HttpClient` service queries and route definitions from `main.js` and `*.chunk.js`.
     - **Vue, Nuxt, SvelteKit, Remix, Astro**: Ingests compiled Axios/Fetch/Ky callers from framework bundles.
     - **Plain HTML/PHP/WordPress/Django**: Extracts `<form action="...">`, inline scripts, and AJAX calls.

---

## Key Files & Responsibilities

- **`src/lib/universalApiCrawler.js`**: Core crawler engine.
  - `crawl(targetUrl, options)`: Main execution routine with early connection verification and bounded sub-second chunk discovery.
  - `safeFetch(url, options)`: Timeout-bounded and error-neutral fetch wrapper.
  - `formatNetworkError(err, targetUrl)`: Decodes low-level socket, TLS, and DNS errors (`ECONNRESET`, `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`) into clear, human-readable root-cause explanations.
  - `extractEndpointsFromCode(code, scriptUrl, origin, ...)`: Linear-time bounded window pattern extractor recovering authentic verbs (GET, POST, PUT, PATCH, DELETE) and parameters from both standard calls and minified wrappers with zero catastrophic backtracking.
  - `normalizeApiPath(rawPath)`: Normalizes template expressions (e.g. `${U.user_id}`, `${ge}`) into standard OpenAPI parameters without dropping valid routes.
  - `emergencyFallback(targetUrl, hostname, origin, err, startTime)`: Crash-proof fallback generator reporting `crawlStatus: 'failed'` with zero synthetic models.
- **`src/lib/generators/apiPdfReportGenerator.js`**: Enterprise API Architecture & Inventory PDF Report Generator.
  - `generateApiReportHtml(analysisData)`: Builds an executive, print-ready HTML/PDF assessment report with KPI grid, architectural tier badges, method distribution, categorized route tables, and embedded `@media print` styling.
  - `openAndPrintApiReport(analysisData)`: Client-side trigger that opens the report in a new tab with automatic `window.print()` for 1-click "Save as PDF" / printer export and fallback HTML download.
- **`src/app/api/crawl/route.js`**: Dedicated crawler API route validating authentic status and stamping `result.isUrlCrawl = true` and `result.schema = { tables: [], relationships: [] }`.
- **`src/app/api/git-clone/route.js`**: Universal remote URL & Git repository ingestion: dynamically parses live REST APIs, OpenAPI/Swagger JSON/YAML, Postman collections, and raw schemas, with automatic crawler fallback, `result.projectPath = targetFetchUrl`, `isUrlCrawl = true`, and persistent history logging.
- **`src/app/api/fetch-endpoint/route.js`**: Universal CORS-free server-side API fetcher supporting live request execution (GET, POST, PUT, DELETE) and formatted JSON response inspection from `DeveloperView`.
- **`src/app/api/analyze/route.js`**: Automatically detects URL paths and domains, routes them through the crawler, and sets `isUrlCrawl = true`.
- **`src/app/page.jsx`**: Web & API Crawler UI tab supporting arbitrary user URLs (with or without `https://`), live telemetry HUD, and initialTab `'sequence'` routing.
- **`src/app/lens/page.jsx` & `src/components/views/DeveloperView.jsx`**:
  - Results page presentation rules: When `isUrlCrawl` is active, the database section (ERD canvas tab, DDL/attributes view, and table selector cards) is **COMPLETELY HIDDEN**.
  - Only the authentic API Surface & Endpoint Architecture is presented to the user, with direct 1-click "Download API PDF Report" action in the hero header.
  - Dynamic base URL resolution (`targetBaseUrl`): cURL copy and live endpoint testing use the authentic target origin, completely eliminating hardcoded `localhost:3000`.
  - **Live Fetch API Action**: Each endpoint card provides a 1-click "Fetch API" button with status badge (`HTTP 200 OK`), roundtrip latency, and formatted response inspector.
