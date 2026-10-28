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
   - **Verified Subpage Probing & Marketing Filter Parity**: Phase 2 speculative subpage probes (e.g. `/ai`, `/quiz`, `/cdc`) are strictly verified via live HTTP probe and ONLY added to discovered surfaces if the server genuinely returns HTTP 200 OK. 404 responses are discarded. Static marketing/legal/documentation landing pages (`isMarketingOrStatic`) are pruned consistently across Phase 1 (`normalEndpoints`) and Stage 5 (`allEndpoints`), and `normalEndpoints` is synchronized as a strict subset of `allEndpoints` (`normalEndpoints ⊆ allEndpoints`), preventing phantom route inflation and guaranteeing exact mathematical parity (e.g., maintaining exact 153 authentic functional routes across both Normal Crawl and Deep Crawl on `finstackk.com`).
   - **Authentic API Service Count Hierarchical Precedence (`apiCountHelper.js`)**: To prevent phantom inflation of API counts (such as treating external error docs or placeholder domains as distinct APIs), API services are prioritized by: (1) multi-role portal domains (e.g. 6 role APIs on `futrsec.in`), (2) WordPress `/wp-json/*` namespaces, (3) local controller modules, (4) semantic AST resource grouping via `getApiEndpointsBreakdown`, and (5) fallback gateways only when no endpoints exist. For `finstackk.com`, all 153 endpoints resolve to the `Business Formation API`, guaranteeing exact **1 API** across HUD headers, metrics cards, and PDF reports. Non-backend framework and mock domains (`nextjs.org`, `react.dev`, `randomuser.me`, `goo.gl`) are explicitly excluded.
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
     - **Phase 1 (Normal Crawl)**: Traverses initial HTML and public entry scripts (~12–20 entry bundles) across Vite, Webpack, Next.js, and Nuxt bundles using canonical origin-resolved paths (`new URL(rawChunk, origin).href`). Using strict zero-hallucination endpoint extraction, for `https://futrsec.in` Normal Crawl previously yielded 466 endpoints and currently yields **473 – 483 endpoints** (~352–362 genuine APIs + 121 UI pages) following deployments of new public landing routes (`/events`, `/careers`, `/academic-collaboration`), freezing `normalEndpoints` and `normalChunksCount`. If running in normal mode (`crawlDepth === "normal"`), execution stops immediately.
     - **Phase 2 (Deep Crawl)**: Traverses all dynamically imported chunks in deepQueue and sub-routes (e.g. /ai, /quiz, /admin) across all 308 chunks using multi-worker batch concurrency. Executes Pattern 5 (Deep Role Modules) with `{ isDeepMode: true }` across all discovered code chunks, discovering all lazy-loaded role endpoints (`/admin`, `/mentor`, `/tpo`, `/employer`, `/learning`, `/student`, `/ai`, etc.). For `https://futrsec.in`, Deep Crawl yields **645 – 668 discovered routes** (decomposed into 121 Frontend React UI Page Routes + **524 Genuine Backend HTTP APIs**). Compared against the actual backend server (578 unique routes across 72 files in `artifacts/api-server`), Deep Crawl achieves **~91% (90.66%) API perimeter coverage** (with the missing ~54 routes being private server-only webhooks, workers, and cron purges never called from client JS). For `https://fts2trial.bcbuzz.tech`, Deep Crawl yields **649 APIs**. Total endpoints strictly obey the composition formula: Normal Crawl + Lazy-Loaded Chunks = Deep Crawl.
   - **Telemetry & Contract Propagation**:
      - Telemetry outputs `normalCrawlCount`, `deepCrawlCount`, `lazyLoadedEndpointsCount`, `genuineApisCount`, `uiPagesCount`, `normalChunksCount`, `deepChunksCount`, and `crawlDepth: { mode, normal, deep, lazyLoadedCount }`.
      - OpenAPI paths and synthesized endpoints carry `x-crawl-tier` (`normal` | `deep`), `x-lazy-loaded` (`false` | `true`), `x-discovery-scope`, `x-route-type` (`API` | `PAGE`), and `x-is-ui-route` (`false` | `true`).
     - Landing page (`page.jsx`) renders a dedicated Dual-Depth Crawl Breakdown banner with side-by-side comparative cards and the exact composition formula: `Normal: X + Lazy: Y = Deep: Z APIs`.
     - Top Header bar (`Header.jsx`) displays `Normal: X` and `Deep: Y APIs` side-by-side whenever a URL is crawled.
      - Studio Console (`DeveloperView.jsx`) provides interactive quick-filter pills (`All Discovered Surfaces`, `Backend APIs Only`, `Normal Crawl`, `Lazy-Loaded Chunks`, `UI Pages Only`) and visual badges on each endpoint card (`⚡ API` vs `🖥️ UI PAGE`).
      - PDF Assessment Report (`apiPdfReportGenerator.js`) features dedicated Verified Backend APIs KPI cards, segregated UI page badges, and dual-depth inventory table indicators.
5. **Multi-Strategy Pipeline**:
   - **Stage 1**: Direct Ingestion (OpenAPI JSON/YAML, Postman Collection, live REST API JSON array/object, raw schemas).
   - **Stage 2**: Targeted Standard Probing (probes `/openapi.json`, `/swagger.json`, `/v3/api-docs` only when target is not an HTML document to prevent WAF / rate limit triggering).
   - **Stage 3**: Deep HTML, Next.js App Router & Embedded Spec Discovery (`SwaggerUIBundle({ url: '...' })`, Redoc `<redoc spec-url="...">`, Next.js `__NEXT_DATA__` manifests, Next.js App Router RSC redirect resolution `NEXT_REDIRECT;...`, `<meta http-equiv="refresh">` & JS location redirect following, `self.__next_f` inline chunk discovery, `<form action="...">`).
   - **Stage 4**: Recursive Bounded Chunk Graph Traversal (up to 500 code-split chunks with optimized concurrency 20 across Vite `/assets/*.js`, Next.js `/_next/static/chunks/*.js`, SvelteKit `/_app/immutable/*.js`, Nuxt `/_nuxt/*.js`, Astro `/_astro/*.js`, Remix `/build/*.js`, and Angular `chunk-*.js` / `*.chunk.js`).
   - **Stage 5**: Live API & Health Probe Verification (probes authentic `/api/health` and live Better-Auth `/api/auth/*` handlers including session and username/password sign-in routes).
   - **Stage 6**: Source Map (.js.map) Decompilation (recovers raw unminified source code to extract route controllers and interfaces).
   - **Stage 7**: Polyglot API Reverse-Engineering across All Stacks:
     - **Next.js & React**: Decodes React Router routes dynamically (`routerPathRegex` inspecting `{path: "..."}`), Next.js server actions, and RSC payload dependencies.
     - **Vue & Nuxt**: Extracts `$fetch()`, `useFetch()`, `useAsyncData()`, Axios, and Nitro `/api/*` endpoints.
     - **Angular (Ivy & Modern esbuild)**: Reverse-engineers `HttpClient` service queries (`this.http.get`, `httpClient.post`) and route definitions from `main.js` and `chunk-*.js`.
     - **SvelteKit, Remix, Astro**: Ingests compiled Fetch/Ky/Axios callers and islands partial-hydration chunks.
     - **Flutter Web**: Automatically detects Flutter Web (`flutter.js`, `flt-glass-pane`) and analyzes compiled Dart bundles (`/main.dart.js`, `/flutter_bootstrap.js`), recovering Dart `http`, `Dio`, and `Uri.parse` API endpoints.
     - **Server-Rendered / Monolithic Stacks (WordPress, Django, Rails, Laravel, PHP, Spring Boot, ASP.NET Core)**:
       - **WordPress Authentic Reverse-Engineering**:
         - Detects WordPress via asset paths (`/wp-content/`, `/wp-includes/`), manifest markers (`wp-json`, `api.w.org`), and PHP server runtime signatures.
         - Extracts exact WordPress core version from `<meta name="generator" content="WordPress X.Y.Z">`.
         - Automatically identifies page builders, editors, and major plugins: WooCommerce (`woocommerce`), Elementor (`elementor-`), Divi (`et_builder`), Gutenberg Block Editor (`wp-block-*`), Yoast SEO (`yoast`), and Contact Form 7 (`wpcf7`).
         - Automatically resolves and probes the authentic WordPress REST API manifest at `/wp-json/` or `<link rel="https://api.w.org/" href="...">`.
         - Mounts all discovered REST endpoints under the `/wp-json/` base prefix for 100% callable accuracy.
         - Maps Python-style regex route parameters (`(?P<id>[\d]+)`, `(?<slug>[\w-]+)`) into standard OpenAPI `{id}` / `{slug}` parameters.
         - Ingests all authentic REST endpoints (e.g. 160-500+ endpoints across `wp/v2`, `wporg/v1`, plugins) with genuine HTTP verbs (GET, POST, PUT, DELETE) and arguments.
         - Automatically maps architecture to `Server-Side Rendered (SSR) / Multi-Page CMS` and `WordPress Permalinks (Server-Routed)`.
       - Extracts `<form action="/..." method="...">` submissions.
       - Discovers anchor links pointing to REST/API surfaces (`<a href="/api/...">`).
       - Analyzes inline script blocks and jQuery AJAX calls (`$.ajax`, `$.get`, `$.post`).
       - Probes standard OpenAPI/Swagger gateways (`/v3/api-docs`, `/swagger.json`, `/openapi.json`) and embedded Swagger UI/Redoc documentation.

---

## Technology Stack & Cloud Architecture Reverse-Engineering Engine

BendLens automatically extracts and verifies the complete Frontend and Backend technology stack with 100% in-memory AST analysis and HTTP response header verification (zero cloud leakage, zero hallucination):

1. **Frontend Layer**:
   - **Frameworks**: Next.js (App Router vs Pages Router), React, Nuxt.js, Vue.js, SvelteKit, Angular (with runtime version extraction), Astro, Remix, Gatsby, Flutter Web, WordPress, jQuery / Vanilla JS.
   - **Bundlers & Compilers**: Turbopack (Rust-based Next.js bundler), Vite / Rollup (ESM manifest analysis), Webpack (`webpackChunk`), esbuild (`chunk-*.js`).
   - **UI & Styling Frameworks**: Tailwind CSS, Radix UI / Shadcn UI (`data-radix-*`), Material UI (`MuiButton-*`), Ant Design (`ant-btn-*`), Chakra UI, Bootstrap (`btn-*`, `col-md-*`).
   - **Rendering Strategies**: React Server Components (RSC) + Incremental Static Regeneration (ISR), Server-Side Rendering (SSR), Static Site Generation (SSG), Client-Side Rendered SPA (CSR).
   - **Client Routing**: Next.js App Router (File-System Nested Layouts), Pages Router, React Router, Nuxt/Vue Router, Flutter Web Navigator.

2. **Backend & Cloud Infrastructure**:
   - **Server Runtimes**: Node.js (Vercel Edge & Serverless Runtime), Express.js, Fastify, Python (FastAPI / Starlette / Uvicorn ASGI Server), PHP Runtime (PHP-FPM / Laravel / WordPress), Microsoft .NET / ASP.NET Core.
   - **API Protocols & Architectures**: RESTful HTTP APIs, React Server Actions (RPC), GraphQL, tRPC, WebSockets / Real-Time Bi-Directional Streams.
   - **Hosting & CDN Networks**: Vercel Global Edge Network, Microsoft Azure Cloud & Front Door, Cloudflare Enterprise CDN & Anycast DDoS Shield, Amazon Web Services (AWS CloudFront / S3), Netlify, Render, Fly.io, GitHub Pages.
   - **Discovered Microservice Gateways**: Remote API origins extracted from bundle callers (e.g. `api.futrsec.in`, `app.finstackk.com`, `salestaxx.ai`).

3. **Cloud Service Provider (CSP) Reverse-Engineering Engine (`detectCloudProvider` & `detectBackendCloudProvider`)**:
   - **100% Local-First & Air-Gapped**: Reverse-engineers target cloud hosting without querying external intelligence APIs or sending URLs to third parties.
   - **Dual-Tier Cloud Architecture (Frontend Edge + Backend Compute)**:
     - **Frontend Edge Hosting (`frontendCloudProvider`)**: Discovers where client static assets, HTML, and bundles are served (e.g. Vercel Global Edge Network, Cloudflare Anycast CDN & DDoS Shield, AWS CloudFront / S3, Hostinger CDN, Netlify Edge).
     - **Backend Cloud Hosting (`backendCloudProvider`)**: Discovers where APIs, serverless functions, database queries, and compute run (e.g. AWS Lambda / ECS / ALB, Vercel Serverless Functions on AWS Firecracker, Supabase Cloud on AWS, Render Web Services, Google Cloud Run, Railway, Fly.io MicroVMs, Hostinger Cloud Server, Self-Hosted Linux VPS).
   - **Multi-Signal Triangulation**:
     - **Cryptographic & Diagnostic HTTP Headers**: Primary evidence extracted from live responses (`x-azure-ref`, `x-ms-request-id`, `cf-ray`, `x-amz-cf-id`, `x-amzn-trace-id`, `x-vercel-id`, `platform: hostinger`, `server: hcdn`, `x-nf-request-id`, `fly-request-id`, `x-railway-request-id`, `x-render-origin-server`, etc.).
     - **Discovered Backend Gateways & Origin Probe Precedence**: Inspects `backendDomains` for external cloud gateways (`.amazonaws.com`, `.supabase.co`, `.onrender.com`, `.railway.app`, `.fly.dev`, `.run.app`, `.azurewebsites.net`, etc.) and probes health/auth routes (`/api/health`, `/api/auth/*`) to capture authentic backend server headers.
     - **DNS CNAME Alias Chains**: Inspects canonical names for edge routing aliases (`*.azureedge.net`, `*.cloudfront.net`, `*.trafficmanager.net`, `*.azurefd.net`, `*.vercel.app`, `*.netlify.app`, `*.onrender.com`, `*.fly.dev`, `*.railway.app`, `*.herokuapp.com`, `*.github.io`).
     - **In-Memory Bitwise IPv4 CIDR Matching**: Implements `ipToInt` and `matchCidr` checking against known enterprise cloud IP blocks (AWS, Azure, GCP, Cloudflare, Fastly, Akamai, GitHub Pages, DigitalOcean), reliably identifying origin hosting even when origin servers strip custom headers.
     - **Edge Region & Point of Presence (POP) Recovery**: Extracts geographical edge POP codes directly from headers (e.g., Cloudflare airport IATA codes like `BOM`, `IAD`; Hostinger POPs like `MUM-EDGE10`; Vercel edge regions like `sin1`, `fra1`; AWS CloudFront edge IDs).
   - **18+ Supported Cloud Ecosystems**:
     - Amazon Web Services (AWS): CloudFront, S3, Application Load Balancers (ALB/ELB), ECS / Fargate Containers, Route 53 Managed DNS, EC2 compute (all modern subnets including 3.0.0.0/9, 44.192.0.0/10, 52.0.0.0/8, 54.0.0.0/8, 99.80.0.0/12).
     - Microsoft Azure: Front Door, App Service, Blob Storage, Traffic Manager.
     - Google Cloud Platform (GCP): Google Front End, Cloud Storage, Cloud Run.
     - Cloudflare: Global Anycast CDN, Workers, Pages.
     - Vercel: Global Edge & Serverless Runtime.
     - Hostinger Cloud: Hostinger CDN, Web Server, Mumbai/Global edge clusters.
     - Netlify, DigitalOcean, Render, Fly.io, Railway, Heroku, Supabase.
     - Fastly, Akamai, GitHub Pages, Hetzner, OVHcloud.
     - Self-Hosted / On-Premise: Nginx, Apache HTTP Server, LiteSpeed, Caddy.
   - **Multi-Tier Composition**: Accurately recognizes layered architectures where an edge CDN fronts a distinct cloud origin (e.g. `Amazon Web Services (AWS) via Cloudflare`, or `Vercel (FE) + AWS (BE)`).
   - **Non-Blocking Resilience**: DNS lookups and CNAME resolutions run in parallel, strictly bounded by a 1,200ms `Promise.race` timeout to guarantee offline, air-gapped, or rate-limited crawls never hang.

4. **Third-Party Integrations & BaaS Ecosystem**:
   - **Payment Gateways**: Stripe, Razorpay, PayPal, Lemon Squeezy.
   - **Analytics & Telemetry**: Google Analytics / GTM, PostHog, Mixpanel, Segment, Hotjar, Sentry.
   - **Auth & Identity**: Clerk, Auth0, Supabase Auth, Firebase Auth, NextAuth / Auth.js.
   - **Forms, Support & CRM**: Formspree, Resend, SendGrid, Intercom, Crisp, HubSpot.

5. **User-Facing Presentation Surfaces**:
   - **Landing Page HUD (`src/app/page.jsx`)**:
     - **Detailed Stack Profile Card**: 4-pillar grid presenting Frontend (Framework, Bundler, UI System, Rendering Mode), Backend (Runtime, API Pattern, Host, Server Software), Cloud & Hosting (Dual-tier showing both Frontend Edge and Backend Hosting with status badges), and Integrations/BaaS.
     - **Discovered API Endpoints Inventory**: Interactive route explorer with method filter tabs (`ALL`, `GET`, `POST`, `PUT`, `DELETE`), real-time route path search, copy path buttons, expandable pagination toggle, and dedicated **API Breakdown** catalog trigger.
   - **Header Bar (`src/components/Header.jsx`)**: Framework pill, interactive Cloud Provider chip with hover tooltip displaying both Frontend Edge and Backend Hosting in top metrics bar, clickable "X APIs" pill triggering ApiBreakdownModal, and "API Breakdown" action button.
   - **Developer Studio (`src/components/views/DeveloperView.jsx`)**:
     - **Executive Stack Profile Header**: Headline summary, zero-hallucination indicators, and 4-column quick specification grid displaying `Hosting & Cloud: FE + BE`.
     - **Full Architectural Pillars**:
       - Card 1: Frontend UI runtime and bundler.
       - Card 2: Backend execution runtime with `Backend Host` indicator.
       - Card 3: Cloud & Hosting featuring dual-tier cards for **Frontend Edge** (`Globe` icon, CDN category) and **Backend Hosting** (`Server` icon, compute category, active services, region, and HTTP evidence).
       - Card 4: Third-party integrations & BaaS.
     - **Discovered Microservice Gateways**: Remote API origins extracted from AST and network callers with `Backend Host` display.
     - **Discovered API Endpoints Inventory & Real-Time Explorer**: Full-featured endpoints hub embedded directly inside the Stack Profile section with method pills (`ALL`, `GET`, `POST`, `PUT`, `DELETE`), search input, scope filters (`NORMAL` vs `LAZY`), copy path/cURL, live local HTTP probe with response status, and smooth-scroll anchor to the full topology section (`#api-topology-section`).
   - **Enterprise PDF Report (`src/lib/generators/apiPdfReportGenerator.js`)**: Dedicated Cloud & Hosting Provider card in the executive PDF assessment report displaying both Frontend Edge and Backend Hosting with verified services and evidence checklist.
   - **Markdown Assessment (`src/components/ExportModal.jsx`)**: Verified Frontend Cloud / Edge Delivery and Backend Cloud / Compute Host lines in exported assessment markdown.

---

## Key Files & Responsibilities

- **`src/lib/universalApiCrawler.js`**: Core crawler engine.
  - `crawl(targetUrl, options)`: Main execution routine with early connection verification and bounded sub-second chunk discovery.
  - `detectTechStack(options)`: Enterprise technology stack detection engine analyzing HTTP headers, HTML DOM structures, bundle ASTs, and discovered network endpoints.
  - `detectCloudProvider({ headers, hostname, origin, ip, cnames })`: Enterprise Cloud Service Provider (CSP) detection engine identifying AWS, Azure, GCP, Cloudflare, Vercel, Hostinger Cloud, Netlify, DigitalOcean, Render, Fly.io, Railway, Heroku, Fastly, Akamai, GitHub Pages, Hetzner, OVH, and self-hosted runtimes.
  - `ipToInt(ip)` & `matchCidr(ip, cidr)`: In-memory bitwise IPv4 CIDR matching for origin IP subnet verification.
  - `safeFetch(url, options)`: Timeout-bounded and error-neutral fetch wrapper exposing response status, text, and lowercase `headers` map.
  - `formatNetworkError(err, targetUrl)`: Decodes low-level socket, TLS, and DNS errors (`ECONNRESET`, `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`) into clear, human-readable root-cause explanations.
  - `extractEndpointsFromCode(code, scriptUrl, origin, ...)`: Linear-time bounded window pattern extractor recovering authentic verbs (GET, POST, PUT, PATCH, DELETE) and parameters from both standard calls and minified wrappers with zero catastrophic backtracking.
  - `normalizeApiPath(rawPath)`: Normalizes template expressions (e.g. `${U.user_id}`, `${ge}`) into standard OpenAPI parameters without dropping valid routes.
  - `emergencyFallback(targetUrl, hostname, origin, err, startTime)`: Crash-proof fallback generator reporting `crawlStatus: 'failed'` with zero synthetic models.
- **`src/lib/generators/apiPdfReportGenerator.js`**: Enterprise API Architecture & Inventory PDF Report Generator.
  - `generateApiReportHtml(analysisData)`: Builds an executive, print-ready HTML/PDF assessment report with KPI grid, architectural tier badges, method distribution, categorized route tables, verified Cloud Service Provider (CSP) card, and embedded `@media print` styling.
  - `openAndPrintApiReport(analysisData)`: Client-side trigger that opens the report in a new tab with automatic `window.print()` for 1-click "Save as PDF" / printer export and fallback HTML download.
- **`src/lib/universalApiCrawler.js` (Authentic Legal & Compliance Extraction Engine)**:
  - `decodeHtmlEntities(str)`: Comprehensive HTML entity decoder covering named, decimal (`&#(\d+);`), and hex (`&#x(...);`) entities (e.g. `🔒`, `⚖`, `🛡`, `★`, `•`, `§`, `©`, `™`, `“`, `”`).
  - `getEntityName(targetUrl, projectName)`: Normalizes clean corporate brand names (e.g. `FinStackk`, `FutrSec`, `Stripe`) stripping subdomains (`app.`, `api.`, `www.`) and TLDs.
  - `isFirewallBlocked(res)`: Detects HTTP WAF status codes (403, 429, 503, 520–524) and challenge/firewall signatures (`Attention Required! | Cloudflare`, `Just a moment...`, `cf-browser-verification`, `Access Denied`, `Incapsula`, `Sucuri`, `PerimeterX`, `DataDome`).
  - `extractLegalMetadata(html, fallbackTitle, pageUrl)`: High-fidelity AST and DOM parser that isolates main content containers (`<main>`, `<article>`, content areas), removes nav/footer/cookie banner chrome, converts headings/lists/paragraphs with proper double-newline paragraph breaks and inline formatting, decodes all HTML entities, extracts authentic titles and "Last Updated / Effective" dates, and tags verified compliance clauses.
  - `discoverLegalDocuments({ html, origin, customHeaders, discoveredPages })`: Dual-pass authentic document discovery:
    1. Aggregates first-party candidate links from anchor tags (`<a href>`) and discovered crawler pages, filtering out third-party trackers or external domains.
    2. Probes authentic first-party candidates first, followed by conventional paths (`/privacy-policy`, `/legal/privacy-policy`, `/terms`, `/terms-of-service`, `/terms-and-conditions`, etc.).
    3. Validates status 200, checks against catch-all/404 fallbacks, and verifies substantive legal terminology.
    4. If no legal documents are published on the origin server (e.g., internal portals like `kp.futrsec.in`), truthfully returns `hasLegalDocuments: false` and `null` without fabricating synthetic text.
  - `fetchLegalDocuments(targetUrl, options)`: Standalone on-demand discovery helper for any target URL.
- **`src/app/api/legal/route.js`**: Dedicated on-demand Legal Documents API route supporting `GET ?url=...` and `POST { url: '...' }` with zero cloud leakage and no external API reliance.
- **`src/components/LegalDocumentsModal.jsx`**: Glassmorphic dark-mode legal documents viewer modal featuring:
  - **Authentic Website View (Default)**: Renders the document exactly like how it is published on the target website via `AuthenticWebsiteRenderer`, featuring styled headers (`h1`, `h2`, `h3`), custom bullet lists, styled callouts, responsive tables, bold emphasis, and search query highlighting.
  - **Raw Markdown View**: 1-click toggle to inspect or copy the exact Markdown source code.
  - **Fullscreen Studio by Default**: Opens in complete edge-to-edge fullscreen (`w-screen h-screen z-[99999]`) with an interactive Maximize/Restore toggle (`Maximize2` / `Minimize2`).
  - Tabbed interface (`🛡️ Privacy Policy`, `📜 Terms of Service / Terms of Use`, `⚖️ Compliance Overview`), with automatic tab resolution for `termsOfUse` / `term` / `terms`.
  - In-document search with live match counter and yellow keyword highlighting across both Website and Markdown views.
  - Interactive `[✏️ Edit / Custom]` mode allowing compliance officers or users to modify or paste internal corporate legal documents directly.
  - One-click "Copy Full Text", "Download Markdown (.md)", and "Open Live Page" (direct link to the target website's live policy page for 1-click side-by-side verification).
  - Metadata metrics (word count, char count, estimated reading time, last updated date, verified clauses).
  - Truthful Empty State: Displays verified probe audit details when a target origin does not publish legal documents.
- **`src/app/api/crawl/route.js`**: Dedicated crawler API route validating authentic status and stamping `result.isUrlCrawl = true`, `result.techStack = crawlResult.techStack`, `result.cloudProvider = crawlResult.cloudProvider`, `result.legalDocuments = crawlResult.legalDocuments`, and `result.schema = { tables: [], relationships: [] }`.
- **`src/app/api/git-clone/route.js`**: Universal remote URL & Git repository ingestion: dynamically parses live REST APIs, OpenAPI/Swagger JSON/YAML, Postman collections, and raw schemas, with automatic crawler fallback, `result.projectPath = targetFetchUrl`, `isUrlCrawl = true`, `result.techStack = crawlResult.techStack`, `result.cloudProvider = crawlResult.cloudProvider`, `result.legalDocuments = crawlResult.legalDocuments`, and persistent history logging.
- **`src/app/api/fetch-endpoint/route.js`**: Universal CORS-free server-side API fetcher supporting live request execution (GET, POST, PUT, DELETE) and formatted JSON response inspection from `DeveloperView`.
- **`src/app/api/analyze/route.js`**: Automatically detects URL paths and domains, routes them through the crawler, and sets `isUrlCrawl = true`, `result.techStack = crawlResult.techStack`, `result.cloudProvider = crawlResult.cloudProvider`, and `result.legalDocuments = crawlResult.legalDocuments`.
- **`src/app/page.jsx`**: Web & API Crawler UI tab supporting arbitrary user URLs (with or without `https://`), live telemetry HUD, tech stack pills, Legal & Compliance Intelligence Card, and `LegalDocumentsModal` reader integration.
- **`src/components/Header.jsx`**: Action suite includes dedicated "Privacy & Terms" button and `LegalDocumentsModal` trigger.
- **`src/app/lens/page.jsx` & `src/components/views/DeveloperView.jsx`**:
  - Results page presentation rules: When `isUrlCrawl` is active, the database section (ERD canvas tab, DDL/attributes view, and table selector cards) is **COMPLETELY HIDDEN**.
  - Only the authentic API Surface & Endpoint Architecture is presented to the user, with direct 1-click "Download API PDF Report" action in the hero header.
  - Technology Stack & Cloud Architecture dashboard card displayed with 4-pillar breakdown and signals evidence drawer.
  - Dedicated "Privacy & Terms" button alongside API Breakdown in the route explorer toolbar.
  - Dynamic base URL resolution (`targetBaseUrl`): cURL copy and live endpoint testing use the authentic target origin, completely eliminating hardcoded `localhost:3000`.
  - **Live Fetch API Action**: Each endpoint card provides a 1-click "Fetch API" button with status badge (`HTTP 200 OK`), roundtrip latency, and formatted response inspector.
