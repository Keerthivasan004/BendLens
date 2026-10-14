# Blast Radius & "What-If" Simulation Engine

The Blast Radius Engine (`src/lib/generators/impactAnalyzer.js`) calculates the potential fallout of modifying any architectural component before code is committed or migrations are applied.

## 1. Simulation Targets & Actions
The engine supports evaluating changes to:
- **Target Types**:
  - `table`: Changing table name, column, key constraint, or dropping a table.
  - `endpoint`: Modifying, refactoring, or deprecating an API route.
  - `none`: Clean empty state if neither database entities nor endpoints exist.
- **Actions**: `rename`, `drop`, `type_change`, `constraint_change`.

## 2. Authentic Target Selection (Zero Hallucination)
- **Real Entity Grounding**:
  - If `tables` exist in the schema, the engine targets a real discovered table (`tables[0]` or the user-selected table).
  - The engine **NEVER** fabricates a synthetic `'orders'` table or fake risk score if the project does not contain an `'orders'` table.
  - If no database models exist but API endpoints exist, the engine automatically simulates the blast radius of deprecating or refactoring the real API endpoint.
  - If neither tables nor endpoints exist, the engine returns an honest 0% risk clean state (`emptyImpactResult()`) without hallucinating fake ORM models or routes.

## 3. Graph Traversal & Ripple Node Calculation
1. **Direct Dependents (1st Degree)**:
   - Foreign keys pointing to the target table/column.
   - API endpoints whose path, parameters, or controller reference the entity.
   - Real scanned code modules with active database queries or repository calls.
2. **Cascading Ripple Nodes (Nth Degree)**:
   - Traverses the `KnowledgeGraph`'s relational dependencies up to depth limit.
   - Maps cascading foreign key impact across dependent child tables.

## 4. Risk Score Computation Formula
The overall Risk Score (0 - 100) is synthesized from:
- **Base Action Weight**:
  - Drop table / Drop column: Highest baseline risk (70-85 points).
  - Rename column / table: High baseline risk (40-60 points).
  - Add optional column: Low baseline risk (10-20 points).
- **Referential Multiplier**:
  - `+ 15 points` per cascading foreign key table.
- **API Surface Exposure**:
  - `+ 10 points` per affected public HTTP endpoint.
- **Code Reference Density**:
  - `+ 5 points` per calling controller or service module.

Scores map to distinct risk tiers:
- `0 - 29`: **LOW** (Safe, localized change)
- `30 - 59`: **MEDIUM** (Requires cross-file refactoring)
- `60 - 79`: **HIGH** (Cascading relational & API breaking change)
- `80 - 100`: **CRITICAL** (Core architectural hub alteration; high regression probability)

## 5. Automated Mitigation Checklist
`ImpactAnalyzer` automatically compiles a step-by-step mitigation plan:
- Required SQL migration commands (e.g., `ALTER TABLE ... RENAME COLUMN ...`).
- Affected foreign key constraint drops and recreations.
- List of API routes requiring contract versioning or DTO updates.
- Squads and code files that must be audited before merging.
