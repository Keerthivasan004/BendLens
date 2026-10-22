# Diagram Generation Rules & Mermaid Guidelines

BendLens compiles architecture into 4 visual diagrams using Mermaid.js (`src/lib/generators/diagramGenerator.js`). Because Mermaid is sensitive to formatting, following strict rules is essential.

---

## 1. Entity-Relationship Diagrams (ERD)
- **Header**: Must start with `erDiagram\n`.
- **Entity Definitions**:
  ```mermaid
  erDiagram
      users {
          uuid id PK
          string email
          timestamp created_at
      }
      orders {
          uuid id PK
          uuid user_id FK
          decimal total
      }
      users ||--o{ orders : "user_id"
  ```
- **Syntax Guards**:
  - Column types must be simple tokens without parenthesis (e.g., use `varchar` instead of `varchar(255)`).
  - Tags must strictly be `PK` or `FK` or omitted.
  - **Self-Referencing Keys**: If `sourceTable === targetTable`, skip the relationship edge to prevent zero-length SVG path rendering bugs in Mermaid.
  - **Column Capping (14 Max per Table)**: Always preserve 100% of Primary Keys (`PK`) and Foreign Keys (`FK`). Cap non-key columns to 14 total and append `string _more_N_fields` to prevent layout engine CPU lockups and text size limit errors.
  - **Large Schema Prioritization (> 50 Tables)**: For massive schemas, prioritize top 50 relational and interconnected tables in Crow's Foot ERD, while retaining 100% entities in `Interactive Topology` and KnowledgeGraph.
  - **Mermaid Config**: Initialize Mermaid with `maxTextSize: 10000000` to prevent `"Maximum text size in diagram exceeded"` error placeholders.

---

## 2. High-Level C4 Container Diagram (HLD)
- **Header**: Starts with `flowchart TB\n`.
- **Subgraphs & Tiers**:
  - Tier 1: `subgraph CLIENTS ["Clients and Edge Channels"]`
  - Tier 2: `subgraph GATEWAY ["API Gateway and Ingress"]`
  - Tier 3: `subgraph SERVICES ["Backend Microservices"]`
  - Tier 4: `subgraph DATA_LAYER ["Persistent Data Stores"]`
- **Core vs Other API rule**: The first backend service is labeled `Core Backend API (NAME - Port X - N Routes)` (with the detected HTTP endpoint count); every further backend service is labeled `Other API Service (NAME - Port X)`. Never label all services as Core.
- **Database dedupe & count rule**: Dedupe `services(isDatabase)` against `infra.databases` by lowercase name (they mirror each other) and render the schema total exactly once as `(N Tables Total)` on the primary store — never repeat the total on every DB node.
- **Sanitization Guards**:
  - **NO Raw Ampersands**: Never output `&` in titles or labels. Replace with `and` (e.g., `"Clients and Edge"`).
  - **NO Colons in Port Notation**: Do not use `Postgres:5432`; use `Postgres_Port5432` or `Postgres (5432)`. Colons break Mermaid label lexing.

---

## 3. Low-Level Component Call Graph (LLD)
- **Header**: Starts with `flowchart LR\n`.
- **Truthful Subgraph Rendering**:
  - Only render subgraphs for tiers that actually exist in the project (`CONTROLLERS`, `SERVICES`, `REPOSITORIES`).
  - If no components exist, render an honest empty placeholder node rather than fabricating synthetic entities.
  - **Zero-Modulo Rule**: NEVER use modulo math (`fnIdx % tables.length`) to connect unrelated functions to tables. Only connect nodes that share genuine semantic tokens or entity names.
  - Subgraph titles carry honest counts, e.g. `Controllers and API Endpoints (6)`, `(11 of 14)` when truncated; counts are also returned as `endpointsCount/endpointsShown/functionsCount/...`.
- **Subgraph Connection Rule**:
  - **NEVER** link subgraphs directly (e.g., `CONTROLLERS --> SERVICES`).
  - Always link concrete nodes within the subgraphs (e.g., `EP_0 --> FN_0`).

---

## 4. Execution Sequence Diagram
- **Header**: Starts with `sequenceDiagram\n    autonumber\n`.
- **Dynamic Entity & Method Mapping**:
  - The sequence diagram dynamically adapts to the selected or first discovered endpoint (e.g., `GET /api/users`, `POST /auth/login`, `DELETE /items/:id`).
  - **NEVER** hardcode sequence diagrams to `POST /api/checkout` or shopping cart billing flows.
  - Correctly flows through `Client -> Gateway -> Controller -> Service -> Database -> Client` using verbs matched to the HTTP method (`SELECT` for GET, `INSERT` for POST, `UPDATE` for PUT/PATCH, `DELETE` for DELETE, and WebSocket upgrades for WS).
  - Automatically identifies matching domain controllers, services, and real SQL tables.
  - **Connected Tables Object Guard**: `targetEp.connectedTables` contains object records (`{ name: string, matchType: string }`). Extract `.name` and verify `typeof matchedTable === 'string'` before calling `.replace(/[^a-zA-Z0-9_]/g, '_')` to prevent unhandled TypeError crashes during sequence flow generation.

---

## 5. API Endpoints Communication & Dependency Flow (ApiFlow)
- **Header**: Starts with `flowchart LR\n`.
- **Generator Function**: `DiagramGenerator.generateApiFlow(codeData, schemaData, infraData)`.
- **Tier Subgraphs**:
  - `subgraph INGRESS ["Client Ingress and Edge Gateway"]` (Edge proxy, Web/Mobile clients, Webhook callers)
  - `subgraph AUTH_TIER ["Authentication and Security Gatekeepers (N)"]` (Login, Token, OAuth, Session routes)
  - `subgraph CORE_TIER ["Core Domain and Resource Endpoints (N)"]` (Resource endpoints, CRUD operations)
  - `subgraph DOWNSTREAM_TIER ["Downstream and Transaction Services (N)"]` (Checkout, Order, Payment, Billing orchestration)
  - `subgraph ASYNC_TIER ["Async Handlers and Event Webhooks (N)"]` (Webhooks, WebSockets, background consumers)
  - `subgraph SHARED_DATA ["Shared Persistence and Entity Bus (N)"]` (Shared database models)
- **Directed Inter-Endpoint Edges**:
  - Ingress -> Auth/Core: `-->|Inbound Requests|`, `-->|Auth Handshake|`
  - Auth -> Downstream: `-->|Validates Bearer Token|`, `-->|Authorizes Session|`
  - Core -> Downstream: `-->|Dispatches Action Payload|`
  - Downstream -> Downstream: `-->|Cascades Downstream|`
  - Async Webhooks -> Downstream: `-.->|Async Event Callback|`
  - Endpoint -> Shared State: `==>|Mutates Entity|` (Write), `-.->|Reads Entity|` (Read)
- **Visual Styling & Safeguards**:
  - Node capping: Cap at 28 visual nodes sorted by priority weight to maintain sub-100ms render speeds.
  - Strict Mermaid escaping: All node IDs use alphanumeric tokens with underscores; colons and brackets stripped from path strings; no raw ampersands `&`.
  - Color-coded method styling classes: GET (emerald), POST (amber), PUT/PATCH (blue), DELETE (rose), WS (purple), Ingress (slate), Data (teal).

---

## 6. High-Performance Interactive API Flow Studio (`ApiFlowModal.jsx`)
- **Topological Architecture**: Edge Ingress Gateway ➔ API Services (Controllers/Role Domains) ➔ Connected API Endpoints (All in 1 Unified Architectural Image).
- **Unified 1-Image Multi-Service Mesh Engine**:
  - **Single Comprehensive Architecture Diagram**: All services and 100% of their endpoints are rendered simultaneously on 1 continuous, cohesive canvas. Eliminates artificial section fragmentation, pagination, or endpoint truncation so customers can understand the full architecture at a single glance.
  - **Visual Service Swimlanes (`serviceClusters`)**: Each service is organized into its own vertical swimlane container box (`X = 750`) with a distinctive theme color, service badge, and endpoint count header.
  - **Parallel Topological Columns**: Endpoints within each service cluster are organized into 3-4 parallel columns (Ingress/Auth, State Mutations, Queries, Webhooks/Events) with clean vertical spacing.
  - **Dynamic Scaled Ingress Gateway**: Edge Gateway at `X = 60` dynamically scales its height based on the number of services (`gatewayHeight = Math.max(74, Math.min(420, 60 + targetServices.length * 32))`) and centers across the total canvas height.
  - **Auto-Fit 1-Image Viewport**: Viewport auto-fits with a responsive zoom range (`fitScale = Math.min(Math.max(0.24, Math.min(scaleX, scaleY)), 1.05)`) so that even 10+ services fit into view upon opening.
  - **Interactive Spotlight Scope**: Scope bar buttons ("All Services (1 Image Diagram)" and individual service tabs) spotlight the selected service's swimlane with glowing accent borders and center the viewport on it, without removing or hiding the other services.
  - **1-Click Full Architecture SVG Export**: Exporting SVG serializes the entire unified multi-service mesh into a single high-resolution SVG file for documentation and executive presentations.
- **Hardware-Accelerated CSS Flow**: Uses `@keyframes flowMarch` with GPU-composited `stroke-dashoffset` keyframes, bypassing heavy software rasterization and expensive SVG drop-shadow filters.
- **Zero-Lag Particle Throttling**: Limits SVG `<circle><animateMotion>` particles strictly to trunk links and active/hovered flows (~6-15 particles max instead of hundreds), ensuring constant 60 FPS even on 670+ endpoint codebases.
- **Distributed Multi-Point Bus Anchors**: Uses distributed slot routing along service card boundaries (`slots = Math.min(18, eps.length)`), preventing solid wire clumping.
- **Color-Coded Service Themes**: Signature color themes (Cyan, Purple, Emerald, Amber, Blue, Rose, Indigo, Teal) with matching SVG arrowhead markers (`markerEnd`).
- **Interactive Route Spotlighting**: Hovering or focusing any service/endpoint illuminates the complete end-to-end path in luminous neon cyan (`strokeWidth="3.5"`), while non-active wires fade to `0.04` opacity.
- **Live Flow Breadcrumb HUD**: Floating top-left indicator displaying real-time active route context (`Edge Ingress Gateway ➔ [Service] ➔ [METHOD /path]`).
- **Studio Controls**: Zoom/pan with non-passive wheel events and zero drag latency, Auto-Fit centering, Native Monitor Fullscreen (F11), High-Res SVG export, and 4 View Modes (Visual Mesh, Tiered Lanes, Mermaid Architecture, Communication Matrix).
- **Authentic Inter-Endpoint Communication Mesh**:
  - **Auth & Gatekeeper Handshake (`AUTH_VALIDATION`)**: Auth/Token endpoints validate credentials and authorize downstream protected endpoints (`Validates Bearer Token ➔ Authorizes Execution`).
  - **Resource Lifecycle & State Handoff (`RESOURCE_LIFECYCLE`)**: Mutating endpoints (`POST`, `PUT`, `PATCH`) initiate or mutate state, handing off context to read/query endpoints (`Initializes State ➔ Lifecycle Handoff`).
  - **Sub-Resource Hierarchical Delegation (`SUB_RESOURCE_DELEGATION`)**: Parent endpoints delegate contextual routing to child routes (`Delegates Sub-Resource Context`).
  - **Shared Database Entity Data Bus (`SHARED_ENTITY_BUS`)**: When an endpoint writes to an entity that another endpoint reads, a data dependency wire is mapped (`Mutates Entity (table) ➔ Syncs Read State`).
  - **Asynchronous Webhooks & Events (`ASYNC_EVENT_CALLBACK`)**: Webhook and WebSocket handlers dispatch event payloads to downstream order and fulfillment consumers (`Async Event Callback ➔ Dispatches Ingestion`).
  - **Workflow Step Progression (`WORKFLOW_STEP`)**: Sibling endpoints within multi-step pipelines advance sequential stages (`Advances Workflow Step`).
  - **Cross-Service Cascades (`CROSS_SERVICE_CASCADE`)**: Endpoints dispatch action payloads across service domains.
  - **Adaptive Bezier Routing**: Handles forward flow, same-column lateral bypass loops, and backward feedback cleanly with zero line clumping.
  - **Interactive Floating Relationship Badges**: Midpoint labels (`strokeWidth="1.2"`) float over highlighted wires on hover/click, and Live Breadcrumb HUD renders active caller ➔ target traces.
  - **Active In/Out Metrics**: Every endpoint node card visually renders real-time `↓ N in` callers and `→ M out` downstream handoff indicators.



