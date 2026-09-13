# Blast Radius & "What-If" Simulation Engine

The Blast Radius Engine (`src/lib/generators/impactAnalyzer.js`) calculates the potential fallout of modifying any architectural component before code is committed or migrations are applied.

## 1. Simulation Targets & Actions
The engine supports evaluating changes to:
- **Target Types**:
  - `table`: Changing table name or dropping a table.
  - `column`: Renaming or deleting a column.
  - `key`: Altering primary key, foreign key, or unique constraints.
  - `endpoint`: Modifying or deprecating an API route.
- **Actions**: `rename`, `drop`, `type_change`, `constraint_change`.

## 2. Graph Traversal & Ripple Node Calculation
1. **Direct Dependents (1st Degree)**:
   - Foreign keys pointing to the target table/column.
   - API endpoints whose path or query parameters reference the table/column.
   - Code modules with explicit SQL queries or ORM calls targeting the entity.
2. **Cascading Ripple Nodes (Nth Degree)**:
   - Traverses the `KnowledgeGraph`'s `adjacency` and `reverseAdjacency` sets up to a depth limit.
   - For example: Renaming `users.id` impacts `orders.user_id`, which impacts `invoices.order_id`, which cascades to payment settlement handlers.

## 3. Risk Score Computation Formula
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

## 4. Automated Mitigation Checklist
`ImpactAnalyzer` automatically compiles a step-by-step mitigation plan:
- Required SQL migration commands (e.g., `ALTER TABLE ... RENAME COLUMN ...`).
- Affected foreign key constraint drops and recreations.
- List of API routes requiring contract versioning or DTO updates.
- Squads and code files that must be audited before merging.
