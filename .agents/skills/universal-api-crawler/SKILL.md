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
   - **Canonical Parameter Normalization**: All path parameters (`${trackId}`, `${id}`, `:trackId`, `:id`) are canonicalized consistently to standard OpenAPI `{id}` (and `{id2}`, `{id3}` for subsequent slots). This guarantees that equivalent endpoints with different parameter variable names are deduplicated into a single canonical route.
   - **Elimination of Consecutive Wildcards**: Consecutive parameter segments without an intervening resource noun (e.g. `/{id}/{subId}` from `${id}/${action}`) are strictly rejected to eliminate hallucinated wildcard routes.
   - **String-Concatenation Parameter Recovery**: Detects string-concatenated parameters (e.g. `axios.delete('/api/admin/tpos/' + id)` or trailing slashes followed by variables) and normalizes them to `/api/admin/tpos/{id}`, preventing hallucinated parameterless mutations.
   - **Caller-Scoped Method Extraction**: Eliminates sliding-window method bleed across statement boundaries in minified bundles. Inspects caller verbs (`a.get`, `e.post`, `r.delete`), bounded `fetch` call arguments, and co-located object configurations without crossing semicolons or statement boundaries.
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
4. **Multi-Strategy Pipeline**:
   - **Stage 1**: Direct Ingestion (OpenAPI JSON/YAML, Postman Collection, live REST API JSON array/object, raw schemas).
   - **Stage 2**: Targeted Standard Probing (probes `/openapi.json`, `/swagger.json`, `/v3/api-docs` only when target is not an HTML document to prevent WAF / rate limit triggering).
   - **Stage 3**: Deep HTML & Embedded Spec Discovery (`SwaggerUIBundle({ url: '...' })`, Redoc `<redoc spec-url="...">`, Next.js `__NEXT_DATA__` manifests, `<form action="...">`).
   - **Stage 4**: Recursive Bounded Chunk Graph Traversal (up to 500 code-split chunks with optimized concurrency 10 and 20ms batch pacing for rapid completion).
   - **Stage 5**: Source Map (.js.map) Decompilation (recovers raw unminified source code to extract route controllers and interfaces).
   - **Stage 6**: Polyglot API Reverse-Engineering with String Concatenation & Caller-Scoped Verbs (matches minified callers `x.get/post/delete`, bounded `fetch` signatures, and template strings).

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
