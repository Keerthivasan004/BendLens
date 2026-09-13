# 3-Tier Persona Intelligence

BendLens features a multi-persona intelligence translation layer (`src/lib/generators/personaMapper.js`) that renders architectural data into context-specific dashboards for 3 distinct stakeholders:

---

## 1. Developer Console (`DEVELOPER`)
- **Primary Objective**: Low-level code hygiene, AST symbol exploration, API contracts, and schema diagnostics.
- **Key Metrics**:
  - `totalTables`: Total database entities detected.
  - `totalEndpoints`: Total REST/GraphQL endpoints discovered.
  - `totalFunctions` & `totalClasses`: Code AST breakdown.
  - `linesOfCode`: Total scanned source lines.
- **Diagnostics & Alerts**:
  - Referential integrity checks (e.g., missing index warnings on foreign key columns).
  - API route surface exposure (e.g., public unauthenticated endpoints without rate limiting).
  - Primary key compliance validation.

---

## 2. Engineering Manager Dashboard (`MANAGER`)
- **Primary Objective**: Governance, architectural risk mitigation, technical debt hotspots, and sprint planning impact.
- **Key Metrics & Formulas**:
  - `averageCoupling`: `totalRelations / totalTables`.
  - `architectureRiskScore`: Structural exposure score (0-100) calculated as:
    ```javascript
    Math.round(Math.min(100,
      (averageCoupling * 25) +
      ((largestHub / Math.max(tables.length, 1)) * 35) +
      ((endpoints.length / Math.max(tables.length, 1)) * 15)
    ))
    ```
  - `moduleCouplingIndex`: Expressed as average edges per table.
  - `criticalPathCount`: Count of tables participating in foreign key chains.
- **Visual Artifacts**:
  - **Technical Debt Hotspots**: High-coupling central tables and oversized code modules with refactoring recommendations.
  - **Sprint Risk Matrix**: Feature subsystem refactoring ratings (High/Medium/Low) based on dependent relations and squad involvement.
  - **Squad Ownership Map**: Allocation of database models and endpoints across Backend Data Squad, Core Business Logic Team, and Integration Ops.

---

## 3. Business Owner Portfolio (`BUSINESS`)
- **Primary Objective**: Executive capability mapping, user journeys, and plain-English architectural summaries.
- **Key Metrics**:
  - `activeBusinessCapabilities`: Count of mapped business domain services.
  - `keyCustomerJourneys`: End-to-end user workflows supported by the architecture.
- **Capabilities Derivation**:
  - Translates table naming patterns into business capabilities (e.g., `user`/`auth` -> "Customer Identity & Account Management", `order`/`cart` -> "Order Processing & Transaction Lifecycle", `payment`/`invoice` -> "Financial Settlement & Billing").
- **Plain-English Summary**:
  - Synthesizes technical statistics into non-technical language for C-suite and executive reviews.
