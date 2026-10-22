---
name: diagram-generation-expert
description: Specialized instructions for creating, modifying, and troubleshooting Mermaid-based multi-tier architecture diagrams (ERD, HLD, LLD, Sequence) in BendLens.
---

# Diagram Generation Expert Skill

Use this skill when you need to:
- Add a new diagram type (e.g., Data Flow Diagram, State Machine, Deployment Topology).
- Modify the layout, color theme, or node grouping of ERD, HLD, LLD, or Sequence diagrams.
- Diagnose and fix Mermaid syntax errors or client-side SVG rendering crashes.
- Improve diagram performance and scaling for repositories with hundreds of tables or services.

---

## Core Diagram Specifications

All diagram logic resides in `src/lib/generators/diagramGenerator.js`:

| Diagram | Generator Function | Mermaid Type | Key Objective |
|---|---|---|---|
| **ERD** | `generateERD(schemaData)` | `erDiagram` | Visualizes database entities, columns, primary/foreign keys, and cardinality. |
| **HLD** | `generateHLD(infraData, codeData, schemaData)` | `flowchart TB` | Visualizes C4 container boundaries (Clients -> Gateway -> Services -> Data Layer). |
| **LLD** | `generateLLD(codeData, schemaData)` | `flowchart LR` | Visualizes Controller -> Service -> Model/Repository call flow. |
| **Sequence** | `generateSequence(endpointOrGraph)` | `sequenceDiagram` | Visualizes step-by-step request/response transaction flows. |
| **ApiFlow** | `generateApiFlow(codeData, schemaData, infraData)` | `flowchart LR` | Visualizes Ingress -> Auth -> Core -> Downstream -> Async inter-endpoint communication and shared state. |

---

## Strict Formatting Guidelines & Pitfall Prevention

### 1. Character Escaping
- **Ampersands (`&`)**: Never use unescaped `&` in labels or subgraph titles. Replace with `and`.
- **Colons (`:`)**: Never use colons inside node titles or port strings (e.g., `redis:6379` breaks Mermaid). Use `redis_6379` or `redis (port 6379)`.
- **Identifier Sanitization**: Always apply `.replace(/[^a-zA-Z0-9_]/g, '_')` to node IDs and table/column names.

### 2. ER Diagram Specifics
- Column types must not include brackets or commas: convert `VARCHAR(255)` to `varchar` or `varchar_255`.
- **Self-referencing Foreign Keys**: Mermaid's ER renderer throws zero-length path errors if a table references itself. Skip self-references in relation loops:
  ```javascript
  if (safeTarget === safeSource) continue;
  ```
- **Attribute Capping (14 Max per Table)**: Retain 100% of Primary Keys (`PK`) and Foreign Keys (`FK`). Fill up to 14 attributes total and append `string _more_N_fields` for excess fields. This prevents layout lockups on tables with 30-50+ columns.
- **Max Text Size & Caching**: Always set `maxTextSize: 10000000` in `mermaid.initialize` to prevent `"Maximum text size in diagram exceeded"` error blocks. Cache rendered SVGs in `svgCacheRef` to render 0ms transitions without re-evaluating layouts.

### 3. HLD Service Tier Labels
- First backend service = `Core Backend API (NAME - Port X - N Routes)`; the rest = `Other API Service (NAME - Port X)`.
- Dedupe compose `services(isDatabase)` vs `infra.databases` by lowercase name; render the schema total once as `(N Tables Total)` on the primary store.

### 4. LLD Tier Caps and Counts
- Cap each LLD tier at 12 nodes (`LLD_TIER_LIMIT`) and always show counts in subgraph titles (`(N)` or `(shown of total)`); return `endpointsCount/endpointsShown/functionsCount/functionsShown/tablesCount/tablesShown`.

### 5. Subgraph Direct Connections
- Older or strict Mermaid parsers fail when connecting a subgraph to another subgraph (e.g., `subgraphA --> subgraphB`).
- Always connect explicit nodes within subgraphs:
  ```javascript
  `    ${controllerNodeId} --> ${serviceNodeId}\n`
  ```

### 6. High-Performance Interactive API Flow Studio (`ApiFlowModal.jsx`)
- **Unified 1-Image Multi-Service Mesh Engine**: Render all services and 100% of their endpoints in 1 comprehensive architecture image diagram on a single continuous canvas. Organize endpoints by service inside vertical swimlane cluster boxes (`serviceClusters` at `X = 750`) with 3-4 parallel columns per service. Edge Gateway scales dynamically at `X = 60` and routes to vertically centered API Services at `X = 380`.
- **Zero Section Fragmentation**: Avoid hiding services or paginating endpoints into artificial sections. The customer sees the entire backend architecture at a glance. Scope tabs and service card clicks spotlight specific clusters and center on them without removing the other services from the canvas.
- **1-Click High-Res SVG Export**: Exporting SVG captures all services, swimlanes, and endpoint nodes in 1 unified vector diagram.
- **Auto-Fit Viewport Range**: Set `fitScale` minimum to `0.24` (`Math.min(Math.max(0.24, Math.min(scaleX, scaleY)), 1.05)`) so multi-service architectures cleanly fit on standard displays without horizontal scrolling.
- **GPU Flow Animation**: Never use software rasterized SVG blur filters or animated `<circle><animateMotion>` on every link. Use `@keyframes flowMarch` with `stroke-dashoffset` for 60 FPS GPU-composited flow motion.
- **Throttled Traffic Particles**: Animate `<circle><animateMotion>` particles strictly on gateway trunk links (~6 links) and active/hovered flows (~6-15 particles max instead of hundreds).
- **Multi-Point Distributed Anchors**: Distribute exit anchors across vertical slots along card height (`slots = Math.min(18, totalEps)`) instead of routing hundreds of curves from a single point.
- **Directional Clarity**: Define distinct SVG arrowhead markers for every service theme (`arrow-cyan`, `arrow-purple`, `arrow-emerald`, etc.) and attach `markerEnd` to every link curve.
- **Interactive Trace Spotlighting**: When a service or endpoint is hovered/focused, spotlight the full route in luminous neon cyan (`strokeWidth="3.5"`) with an active arrowhead (`#arrow-active`), while fading background wires to `0.04` opacity.
- **Dual-Orientation Visual Mesh Architecture with Toolbar Switcher (`ApiFlowModal.jsx`)**:
  - Provides instant 1-click switching between **Horizontal** and **Vertical** visual layouts directly in the top toolbar:
    1. **Horizontal Mode (Left-to-Right with Orthogonal Tree Bus Routing)**:
       - Level 0 (Ingress Gateway): $X = 60$, vertically centered, routing through an orthogonal stepped conduit (`M sx sy H spineGatewayX V ty H tx`).
       - Level 1 (API Service Root): $X = 410$, vertically centered in service cluster.
       - Level 2 (Resource Controller Branches): $X = 790$. Connected from Root via a single horizontal stem $\to$ vertical distributor spine ($X = 725$) $\to$ horizontal branch fingers with junction beads.
       - Level 3 (Endpoints): $X = 1150$, intelligently grouped under distinct resource branches (e.g. `/llc`, `/c-corp`, `/advisory`). Connected from Branch via a single horizontal stem $\to$ vertical distributor spine ($X = 1085$) $\to$ horizontal shelf fingers into each endpoint card with glowing junction dots (`●`). Eliminates all line bundling and straight-line visual noise.
       - Level 4 (Right-Gutter Communication Mesh): Inter-endpoint links route through dedicated, parallel, non-overlapping orthogonal rounded right-bracket conduits ($X = 1420 \dots 1750+$) with deterministic lane indexing.
    2. **Vertical Mode (Top-to-Bottom)**:
       - Tier 1 (Ingress Gateway): Centered at top ($Y = 50$), routing downward.
       - Tier 2 (API Service Root): Beneath Gateway ($Y = 168$), centered horizontally.
       - Tier 3 (Resource Controller Branches): Arranged side-by-side in parallel vertical columns ($Y = 296$), fed by canopy Béziers.
       - Tier 4 (Endpoints Under Branches): Hanging vertically directly under their branch header ($Y \ge 376$), connected via vertical spine and horizontal spur conduits.
       - Tier 5 (2D Multi-Column Communication Mesh): Cross-column forward/backward Béziers and intra-column sibling loops.
  - Directional neon arrowheads (`markerEnd`), animated traffic pulse particles, and floating protocol relationship pills on hover/focus.
- **Multi-Track Non-Overlapping Communication Highway (`links`)**:
  - Connect endpoints within and across API services using authentic architectural patterns:
    1. Auth Gatekeeper Handshake (`AUTH_VALIDATION`): Auth/token endpoints validate and authorize protected/mutation routes.
    2. Resource Lifecycle (`RESOURCE_LIFECYCLE`): Mutating routes (`POST`, `PUT`, `PATCH`) hand off initialized state to retrieval/query routes (`GET`).
    3. Sub-Resource Delegation (`SUB_RESOURCE_DELEGATION`): Parent resource paths delegate routing to sub-paths.
    4. Shared Entity Data Bus (`SHARED_ENTITY_BUS`): Table writes trigger cache invalidation and state handoff to table reads.
    5. Asynchronous Webhooks (`ASYNC_EVENT_CALLBACK`): Webhook receivers dispatch ingestion payloads to internal consumer endpoints.
    6. Workflow Step Progression (`WORKFLOW_STEP`): Multi-step pipeline endpoints advance sequentially.
    7. Cross-Service Cascades (`CROSS_SERVICE_CASCADE`): Multi-service request chains.
  - **Deterministic Multi-Track Channels**: Each link is assigned a `laneIndex` ($0 \dots 7$) to route through non-colliding lateral and inter-column highway lanes, completely eliminating overlapping wires.
  - **Communication Protocol Spotlight Filters**: Filter toolbar (`All Flows`, `Auth Token`, `State Handoff`, `DB Entity Bus`, `Sub-Resource`, `Async Events`, `Cross-Service`) with badge counters dims unrelated wires to `0.04` opacity, spotlighting specific communication channels.
  - **Midpoint Relationship Badges**: Render high-contrast pills on hovered/active wires displaying communication relationships.
  - **Node Card Indicators**: Display dynamic `↓ N in` and `→ M out` connection counts on every endpoint card.

---

## Continuous Agent Synchronization
Whenever diagram generation rules or visual layouts are modified:
1. Update `.agents/memory/diagram_generation_rules.md` with the new formatting rules and syntax constraints.
2. Update this skill file with any newly discovered Mermaid escaping or layout techniques.

