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

### 3. Subgraph Direct Connections
- Older or strict Mermaid parsers fail when connecting a subgraph to another subgraph (e.g., `subgraphA --> subgraphB`).
- Always connect explicit nodes within subgraphs:
  ```javascript
  `    ${controllerNodeId} --> ${serviceNodeId}\n`
  ```

---

## Continuous Agent Synchronization
Whenever diagram generation rules or visual layouts are modified:
1. Update `.agents/memory/diagram_generation_rules.md` with the new formatting rules and syntax constraints.
2. Update this skill file with any newly discovered Mermaid escaping or layout techniques.

