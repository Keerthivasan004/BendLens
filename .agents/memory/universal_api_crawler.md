# Universal API Crawler & Dual-Depth Surface Architecture

## 1. Overview
The BendLens Universal API Crawler reverse-engineers client-to-backend API contracts, routes, and network architectures directly from live web targets, OpenAPI/Swagger specifications, Postman collections, and JavaScript frontend bundles.

It operates **100% locally in Node.js memory**, with zero cloud telemetry leakages, zero synthetic endpoint hallucinations, and linear $O(N)$ ReDoS-safe AST pattern recognition.

---

## 2. Dual-Depth Crawl Architecture (Normal Crawl vs. Deep Crawl)

Modern Single-Page Applications (Vite, Rollup, Webpack, Next.js, Angular, Nuxt) split their bundles into lazy-loaded code chunks. Role-restricted interfaces (such as Admin, Mentor, TPO, Recruiter, and AI modules) are split into separate `.js` files and are only imported on demand.

### The Two-Tier Phased Queue Engine:
1. **Phase 1: Normal Crawl (Standard Application Chunk Perimeter)**:
   - Evaluates Level 0/1 HTML script declarations (`<script src="...">`, `<link rel="modulepreload">`, `<link rel="preload" as="script">`, Next.js inline chunk manifest script tags).
   - Traverses the standard application chunk graph across Vite, Webpack, Next.js, Rollup, Nuxt, and Angular chunks using canonical origin-resolved paths (`new URL(rawChunk, origin).href`).
   - Uses strict, zero-hallucination endpoint extraction (Standard `fetch()`, HTTP client callers `axios/apiClient.get/post/etc.`, canonical REST/RPC prefixes `/api/`, `/v1/`, `/v2/`, `/auth/`, `/rest/`, and absolute API gateways), avoiding bogus matches from non-API property gets (`headers.get`, `params.get`) or client UI routes.
   - For `https://futrsec.in`, Normal Crawl historically extracted 466 endpoints and currently yields **473 – 483 endpoints** (~352–362 genuine APIs + 121 UI routes) across public entry scripts (~12–20 entry scripts) following production deployments of new pages (`/events`, `/careers`, `/academic-collaboration`).
   - For `https://fts2trial.bcbuzz.tech`, Normal Crawl yields **~470 APIs**.
   - Once all standard application chunks complete, the engine strictly freezes `normalEndpoints` and `normalChunksCount`.
   - If `crawlDepth === 'normal'`, the crawler immediately halts and returns Phase 1 results (`lazyLoadedEndpointsCount: 0`).

2. **Phase 2: Deep Crawl (Exhaustive Lazy Role Chunks & Sub-routes)**:
   - Evaluates secondary role chunks (Rollup/Vite chunk tables resolved relative to `/assets/`) and probes discovered internal sub-routes (e.g. `/ai`, `/quiz`, `/admin`) to discover role-gated page chunks.
   - Activates **Pattern 5: Deep Role Modules** via `extractEndpointsFromCode(..., { isDeepMode: true })` across all discovered code chunks, capturing genuine lazy-loaded role modules (`/admin`, `/mentor`, `/tpo`, `/employer`, `/learning`, `/student`, `/ai`, `/placement-drives`, `/lab-builder`, etc.).
   - Endpoints discovered exclusively during Phase 2 are tagged with `x-crawl-tier: 'deep'`, `x-lazy-loaded: true`, and `x-discovery-scope: 'Deep Crawl (Lazy-Loaded)'`.
   - Complete Perimeter Results & Ground Truth Validation:
     - `https://futrsec.in`:
       - **All 308 JavaScript chunks inspected**.
       - **Total Discovered Surfaces**: **645 – 668 routes** (121 Frontend React UI Page Routes + **524 Genuine Backend HTTP APIs**).
       - **Actual Backend Server Truth**: 578 unique routes (585 handlers across 72 route files in `artifacts/api-server`).
       - **Perimeter Coverage**: **~91% (524 / 578 = 90.66%)** of the entire backend API perimeter discovered via client bundles!
       - **Uncrawled Perimeter (~54 routes)**: Private server-only routes never called by client-side JavaScript (e.g., Razorpay webhook handlers, BullMQ background queues, DB cron retention purges, S2S internal health probes).
     - `https://fts2trial.bcbuzz.tech`: Deep Crawl yields **649 routes**.
   - Total endpoints strictly obey the composition formula: `Normal Crawl + Lazy-Loaded Chunks = Deep Crawl`.

---

## 3. Crawler Telemetry Contract
Every crawl produces an enriched telemetry block stored in `crawlerTelemetry`:
```json
{
  "targetUrl": "https://futrsec.in",
  "crawlDurationMs": 19697,
  "chunksCrawledCount": 502,
  "normalChunksCount": 501,
  "deepChunksCount": 502,
  "totalEndpointsCount": 642,
  "uniquePathsCount": 642,
  "normalCrawlCount": 466,
  "deepCrawlCount": 642,
  "lazyLoadedEndpointsCount": 176,
  "crawlDepth": {
    "mode": "deep",
    "normal": { "endpointsCount": 466, "chunksCount": 501 },
    "deep": { "endpointsCount": 642, "chunksCount": 502 },
    "lazyLoadedCount": 176
  },
  "backendDomains": [
    "https://api.futrsec.in",
    "https://vps.bcbuzz.tech",
    "https://app.futrsec.in"
  ],
  "discoveryStrategy": "deep_chunk_crawler",
  "crawlStatus": "success"
}
```

---

---

## 4. Universal Framework & Tech-Stack Independence
The BendLens crawler is framework-agnostic. It does not rely on a specific runtime or framework convention:
- **Next.js (Pages & App Router)**: Extracts `__NEXT_DATA__` manifests (`_buildManifest.js`, `_ssgManifest.js`), `self.__next_f` RSC payloads, `NEXT_REDIRECT` resolution, and `/_next/static/chunks/*.js`.
- **React / Vite / Webpack / Rollup**: Recursively discovers entrypoints, modulepreload links, dynamic imports (`import("...")`), Vite `/assets/*.js` chunk tables, and Webpack static paths.
- **Flutter Web**: Automatically detects Flutter Web (`flutter.js`, `flt-renderer`, `flt-glass-pane`, `_flutter`) and targets the compiled Dart bundles (`/main.dart.js`, `/flutter_bootstrap.js`, `/flutter.js`) where Dart `http`, `Dio`, and `Uri.parse` string literals reside.
- **Angular**: Ingests `runtime.js`, `polyfills.js`, `main.js`, and Angular lazy chunks (`*.chunk.js`, `chunk-*.js`), capturing `HttpClient` service queries and TypeScript route mappings.
- **Vue / Nuxt**: Ingests `__NUXT__` inline state, `/_nuxt/*.js` chunks, and Axios/Ky REST callers.
- **SvelteKit, Remix, Astro**: Ingests `/_app/immutable/*.js`, `/build/entry.client*.js`, and Astro client island components.
- **Plain HTML / PHP / WordPress / Django / Ruby on Rails**: Parses standard `<script src="...">`, inline scripts, `<form action="...">`, and AJAX/Fetch callers.

---

## 5. Endpoint Classification & Tags
Each synthesized endpoint carries:
- `crawlTier`: `'NORMAL'` or `'DEEP_LAZY'`
- `isLazyLoaded`: `true` if discovered inside a secondary/lazy-loaded code-split chunk, `false` if discovered in initial entry bundles.
- `discoveryScope`: `'standard_surface'` or `'lazy_loaded_bundle'`
- `routeType`: `'API'` (Verified Backend API) or `'PAGE'` (Frontend UI Navigation Route).
- `isUiRoute`: `true` for frontend UI pages (e.g. React Router `/admin/dashboard`), `false` for genuine backend API calls (`/api/...`, `fetch`, `axios`, `apiFetch`).
- `level`: Architectural tier (`'HIGH'`, `'MEDIUM'`, `'LOW'`)
- `kind`: Protocol or functional kind (`'REST'`, `'AUTH'`, `'ADMIN'`, `'AI / ML'`, etc.)

---

## 6. UI Integration (`DeveloperView.jsx`)
- **Quick Metrics Ribbon**: Displays Deep Crawl APIs, Normal Crawl APIs, Lazy-Loaded Modules, and Verified Backend APIs vs UI Pages.
- **Dual-Depth Comparative Banner**: Summarizes the distinction between standard perimeter spidering and deep recursive bundle extraction.
- **Crawl Depth & Route Type Filter Tabs**:
  - `All Discovered Surfaces`: Complete perimeter across chunks.
  - `Backend APIs Only`: Filters out UI page components, presenting only genuine HTTP API endpoints.
  - `Normal Crawl (Standard)`: Initial bundle surface.
  - `Lazy-Loaded Chunks`: Role-restricted delta.
  - `UI Pages Only`: Segregated frontend React Router / page routes.
- **Visual Badges**: Each endpoint card is clearly tagged with `NORMAL`/`LAZY-LOADED` and `⚡ API` / `🖥️ UI PAGE`.

---

## 7. Executive PDF Report (`apiPdfReportGenerator.js`)
- **Meta-strip**: Includes Normal Crawl, Lazy Chunks, Deep Crawl, and UI Pages badges.
- **Dual-Depth Breakdown Grid**: Side-by-side comparative cards with exact counts and explanations.
- **KPI Grid**: Highlights Verified Backend APIs as headline metric with segregated UI pages note.
- **Inventory Table**: Features dedicated `Crawl Scope` and `Route Type` indicators.

---

## 8. Dual-Tier Cloud & Backend Hosting Architecture
BendLens features a dedicated, authentic cloud reverse-engineering engine that separates and exposes:
- **Frontend Edge Hosting (`frontendCloudProvider`)**: Where client static assets, HTML, and bundles are delivered (Vercel Global Edge Network, Cloudflare Anycast CDN & DDoS Shield, AWS CloudFront / S3, Hostinger CDN, Netlify Edge).
- **Backend Cloud Hosting (`backendCloudProvider`)**: Where APIs, microservices, and serverless runtimes are hosted (AWS Lambda / ECS / ALB, Vercel Serverless Functions on Firecracker, Supabase Cloud on AWS, Render Web Services, Google Cloud Run, Railway, Fly.io MicroVMs, Hostinger Cloud Server, Self-Hosted Linux VPS).
- **Multi-Signal Triangulation**:
  - `detectBackendCloudProvider` analyzes discovered external gateways (`backendDomains`), probed backend API response headers (`backendHeaders`), server software, and serverless platform architectures.
  - **Multi-Signal DNS & Subnet Engine**: Parallel non-blocking DNS queries with fallback public resolvers (8.8.8.8, 1.1.1.1), apex CNAME redirection fallback (finstackk.com -> www.finstackk.com -> *.elb.amazonaws.com), authoritative NS inspection (Route 53 awsdns), and expanded enterprise CIDR subnets (e.g. AWS 44.192.0.0/10, 3.0.0.0/9, 99.80.0.0/12). Automatically classifies containerized AWS ECS workloads behind Application Load Balancers.
  - UI surfaces (`DeveloperView.jsx`, `page.jsx`, `Header.jsx`, `apiPdfReportGenerator.js`, `ExportModal.jsx`) clearly display both Frontend Edge and Backend Hosting with status badges (`MULTI-CLOUD` vs single cloud), categories, services, regions, and verified evidence.


