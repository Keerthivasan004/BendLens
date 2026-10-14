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
   - Strict AST token normalization (`normalizeApiPath`) rejects minified runtime artifacts (e.g., `/:`, `/{`, `/.`, `/%0`, `/e`, `/end`, `/finish`, `/close`, `/validator`).
   - Unifies minified single-letter parameters (`{t}`, `{e}`, `{_}`, `{n}` -> `{id}`) to prevent duplicate route inflation.
   - Filters out XML namespace URIs (OpenXML, SheetJS, Microsoft Office schema definitions, `purl.org`) and requires absolute URLs to have API prefixes (`/api/`, `/v1/`, etc.) before registering.
2. **Crash-Proof & Truthful Status Reporting**:
   - The crawler never crashes the Node.js server. Network errors, timeouts, and SSL failures are caught and reported with `crawlStatus: 'failed'` containing the exact network error message.
   - If a URL fails to connect or returns non-HTML/non-API errors, `/api/crawl` and `/api/analyze` return an explicit HTTP 400 error rather than misleading the user with fake successful results.
3. **Local-First & Air-Gapped**:
   - Traversal and AST parsing happen 100% in Node.js memory.
   - Crawled assets are never forwarded to external third-party cloud services.
4. **Multi-Strategy Pipeline**:
   - **Stage 1**: Direct Ingestion (OpenAPI JSON/YAML, Postman Collection, live REST API JSON array/object, raw schemas).
   - **Stage 2**: Parallel Standard Probing (concurrent 6s probes of `/spec.json`, `/openapi.json`, `/swagger.json`, `/v3/api-docs`, `/graphql` introspection).
   - **Stage 3**: Deep HTML & Embedded Spec Discovery (`SwaggerUIBundle({ url: '...' })`, Redoc `<redoc spec-url="...">`, Next.js `__NEXT_DATA__` manifests, `<form action="...">`).
   - **Stage 4**: Recursive Bounded Chunk Graph Traversal (up to 500 code-split chunks with concurrency 24 and 6s per-chunk timeout).
   - **Stage 5**: Source Map (.js.map) Decompilation (recovers raw unminified source code to extract route controllers and interfaces).
   - **Stage 6**: Polyglot API Reverse-Engineering (matches `fetch`, `axios.get/post`, `apiClient.get/post`, `http`, `ky`, `superagent` with method validation and zero `createElement` false-positives).

---

## Key Files & Responsibilities

- **`src/lib/universalApiCrawler.js`**: Core crawler engine.
  - `crawl(targetUrl, options)`: Main execution routine with early connection verification.
  - `safeFetch(url, options)`: Timeout-bounded and error-neutral fetch wrapper.
  - `extractEndpointsFromCode(code, scriptUrl, origin, ...)`: Token and AST pattern extractor with strict regex patterns avoiding comments and generic strings.
  - `emergencyFallback(errorMsg, targetUrl)`: Crash-proof fallback generator reporting `crawlStatus: 'failed'` with zero synthetic models.
- **`src/app/api/crawl/route.js`**: Dedicated crawler API route validating authentic status.
- **`src/app/api/git-clone/route.js`**: Remote URL & Git repository ingestion with automatic crawler fallback.
- **`src/app/api/analyze/route.js`**: Automatically detects URL paths and routes them through the crawler, checking for crawl failures before running graph analysis.
- **`src/app/page.jsx`**: Web & API Crawler UI tab with presets and live telemetry HUD.
