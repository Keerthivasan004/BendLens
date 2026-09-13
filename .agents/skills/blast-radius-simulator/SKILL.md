---
name: blast-radius-simulator
description: Guide for maintaining and extending the What-If Blast Radius simulation engine, cascading graph traversal, and automated migration checklist generation.
---

# Blast Radius Simulator Skill

Use this skill when you need to:
- Extend the "What-If" simulator to support new modification targets (e.g., service deprecation, queue alteration, environment variable removal).
- Calibrate risk score weighting formulas.
- Improve ripple node traversal depth and cycle detection in `ImpactAnalyzer`.
- Enhance automated mitigation checklists with tailored migration scripts (Prisma, Flyway, Liquibase, Alembic).

---

## Core Engine Architecture

The engine is encapsulated in `ImpactAnalyzer` (`src/lib/generators/impactAnalyzer.js`):
- **Inputs**:
  - Target entity name (`targetName`).
  - Target entity type (`targetType`: `table`, `column`, `key`, `endpoint`, `service`).
  - Proposed action (`action`: `rename`, `drop`, `type_change`).
  - Optional column name or key identifier.
- **Traversal Logic**:
  - Directly queries `schemaData.relations` to locate downstream foreign key constraints.
  - Queries `codeData.endpoints` to find routes that query the affected tables or pass the affected columns.
  - Recursively traverses `KnowledgeGraph` reverse adjacency mappings to compute transitive ripple nodes.
- **Outputs**:
  - `riskScore`: Computed integer (0 - 100).
  - `riskLevel`: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
  - `rippleNodes`: Array of impacted nodes with reasons.
  - `affectedEndpoints`: Array of impacted API contracts.
  - `mitigationChecklist`: Actionable engineering migration steps.

---

## Step-by-Step Extension Guide

### 1. Adding a New Modification Target
1. Open `src/lib/generators/impactAnalyzer.js`.
2. In `analyzeModification()`, check for the new `targetType`.
3. Locate downstream nodes using `this.graph.reverseAdjacency.get(targetId)`.
4. Accumulate impacted endpoints, models, and background jobs.

### 2. Tuning Risk Calculations
Ensure scores reflect realistic production risks:
- Dropping a table referenced by foreign keys should produce a score >= 80 (`CRITICAL`).
- Renaming a non-indexed column with zero foreign keys should score between 20-40 (`LOW`/`MEDIUM`).

### 3. Continuous Agent Synchronization
Whenever the blast radius traversal or risk scoring algorithms are modified:
1. Update `.agents/memory/blast_radius_engine.md` with the new scoring model or traversal rules.
2. Update this skill file with any new target types or mitigation templates.

