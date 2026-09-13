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

---

## 2. High-Level C4 Container Diagram (HLD)
- **Header**: Starts with `flowchart TB\n`.
- **Subgraphs & Tiers**:
  - Tier 1: `subgraph CLIENTS ["Clients and Edge Channels"]`
  - Tier 2: `subgraph GATEWAY ["API Gateway and Ingress"]`
  - Tier 3: `subgraph SERVICES ["Backend Microservices"]`
  - Tier 4: `subgraph DATA_LAYER ["Persistent Data Stores"]`
- **Sanitization Guards**:
  - **NO Raw Ampersands**: Never output `&` in titles or labels. Replace with `and` (e.g., `"Clients and Edge"`).
  - **NO Colons in Port Notation**: Do not use `Postgres:5432`; use `Postgres_Port5432` or `Postgres (5432)`. Colons break Mermaid label lexing.

---

## 3. Low-Level Component Call Graph (LLD)
- **Header**: Starts with `flowchart LR\n`.
- **Tier Structure**:
  - `subgraph CONTROLLERS ["Controllers and Handlers"]`
  - `subgraph SERVICES ["Domain Services"]`
  - `subgraph REPOSITORIES ["Data Access and Models"]`
- **Subgraph Connection Rule**:
  - **NEVER** link subgraphs directly (e.g., `CONTROLLERS --> SERVICES`).
  - Always link concrete nodes within the subgraphs (e.g., `ctrl_users --> srv_users`).

---

## 4. Execution Sequence Diagram
- **Header**: Starts with `sequenceDiagram\n autonumber\n`.
- **Participants**: Defines clean actor and system participant names (`actor User`, `participant Gateway`, `participant Service`, `participant Database`).
- **Messages**: Standard arrows `User->>Gateway: POST /api/checkout` and dashed responses `Gateway-->>User: 200 OK`.
