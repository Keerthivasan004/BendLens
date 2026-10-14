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
