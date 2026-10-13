---
name: universal-api-crawler
description: Guide and instructions for maintaining, testing, and extending the BendLens Universal Barrier-Free Web & API Crawler engine and its zero-error architecture.
---

# Universal API Crawler Skill

Use this skill when you need to:
- Extend web asset parsing, code-splitting discovery, or chunk graph traversal.
- Add support for new frontend frameworks, build tools, or manifest standards (e.g., Astro, Remix, SvelteKit, Bun).
- Enhance source-map de-obfuscation or reverse-engineering heuristics.
- Modify the zero-error fallback synthesis pipeline or telemetry metrics.
- Extend `/api/crawl` or `/api/git-clone` crawler integration.

---

## Architectural Principles

1. **100% Zero-Error Guarantee**:
   - The crawler must NEVER throw an unhandled exception or return HTTP 500 when crawling an arbitrary URL.
   - Network errors, timeouts, Cloudflare 403s, and SSL failures are safely caught and routed to resilient fallback synthesis (`emergencyFallback`).
2. **Local-First & Air-Gapped**:
   - Traversal and AST parsing happen 100% in Node.js memory.
   - Crawled assets are never forwarded to external third-party cloud services.
3. **Multi-Strategy Pipeline**:
   - **Stage 1**: Direct Ingestion (OpenAPI JSON/YAML, Postman Collection, live REST API JSON array/object, raw schemas).
   - **Stage 2**: Parallel Standard Probing (concurrent 3.5s probes of `/openapi.json`, `/swagger.json`, `/v3/api-docs`, `/graphql` introspection).
   - **Stage 3**: Deep HTML & State Discovery (`<title>`, Next.js `__NEXT_DATA__` build manifests, Nuxt `__NUXT__`, window global API configs, form actions, anchor links).
   - **Stage 4**: Recursive Bounded Chunk Graph Traversal (up to 500 code-split chunks with concurrency 24 and 6s per-chunk timeout).
   - **Stage 5**: Source Map (.js.map) Decompilation (recovers raw unminified source code to extract route controllers and interfaces).
   - **Stage 6**: Polyglot API Reverse-Engineering (matches `fetch`, `axios`, `apiClient`, `http`, `ky`, `superagent`, React Query `useQuery`, `useMutation`, SWR, RTK Query, and microservice domains).
   - **Stage 7**: Resilient Fallback Synthesis (synthesizes structured OpenAPI and companion SQL schemas from discovered pages and application entities).

---

## Key Files & Responsibilities

- **`src/lib/universalApiCrawler.js`**: Core crawler engine.
  - `crawl(targetUrl, options)`: Main execution routine.
  - `safeFetch(url, options)`: Timeout-bounded and error-neutral fetch wrapper.
  - `extractEndpointsFromCode(code, scriptUrl, origin, ...)`: Token and AST pattern extractor.
  - `synthesizeFallbackEndpoints(...)`: Generates clean application routes and entities.
  - `emergencyFallback(...)`: Guaranteed crash-proof fallback generator.
- **`src/app/api/crawl/route.js`**: Dedicated crawler API route.
- **`src/app/api/git-clone/route.js`**: Remote URL & Git repository ingestion with automatic crawler fallback.
- **`src/app/api/analyze/route.js`**: Automatically detects URL paths and routes them through the crawler.
- **`src/app/page.jsx`**: Web & API Crawler UI tab with presets and live telemetry HUD.
