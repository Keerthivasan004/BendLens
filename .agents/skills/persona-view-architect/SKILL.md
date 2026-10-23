---
name: persona-view-architect
description: Instructions for developing, customizing, and scaling the 3-Tier Persona Intelligence views (Developer Console, Engineering Manager Dashboard, Business Owner Portfolio).
---

# Persona View Architect Skill

Use this skill when you need to:
- Add new metrics or cards to the Developer, Manager, or Business dashboards.
- Refine the persona mapping logic in `PersonaMapper` (`src/lib/generators/personaMapper.js`).
- Introduce a 4th persona (e.g., Security & Compliance Officer, DevOps & SRE Lead).
- Update frontend React views in `src/components/views/`.

---

## Persona Data Architecture

The persona subsystem consists of two tiers:
1. **Backend Generator (`src/lib/generators/personaMapper.js`)**:
   - `getDeveloperView(schemaData, codeData, infraData, graphData)`
   - `getManagerView(schemaData, codeData, infraData, graphData)`
   - `getBusinessView(schemaData, codeData, infraData, graphData)`
2. **Frontend Views (`src/components/views/`)**:
   - `DeveloperView.jsx`: Symbol AST tree, endpoint explorer, breaking change warnings.
   - `ManagerView.jsx`: Risk score, module coupling, sprint risk matrix, team ownership.
   - `BusinessView.jsx`: Capability portfolio, user journeys, executive summary.

---

## Best Practices for Persona Metrics

### 1. Developer Persona
- Focus on actionable, granular code and schema hygiene.
- Highlight specific table names, foreign keys, missing indexes, and unauthenticated endpoints.
- **API Multi-Tier Intelligence & Topology**:
  - Segregate endpoints into Architectural Tiers: `HIGH` (business orchestration, multi-table mutations), `MEDIUM` (domain CRUD), and `LOW` (system utilities).
  - Classify protocol kinds (`REST`, `WEBSOCKET`, `AUTH`, `STORAGE`, `ADMIN`, `WEBHOOK`, `SYSTEM`).
  - Render connected database entities with explicit action tags (`📖 READ`, `✍️ WRITE`, `🔄 STREAM`) and links to schema previews.
  - Present an interactive End-to-End Execution Pipeline (Client Ingress -> Route Binding -> Controller -> Database -> Blast Radius) with fast cURL copying and blast simulation.
- **Architectural Pillars & Cloud Hosting**:
  - Present the 4 Architectural Pillars (Frontend Layer, Backend Runtime, Cloud & Hosting, Integrations).
  - The Cloud & Hosting pillar renders dual-tier hosting: **Frontend Edge** (CDN, Edge network, cache) and **Backend Hosting** (compute engine, serverless functions, microservice gateways, evidence, and region).

### 2. Engineering Manager Persona
- Keep metrics aggregate and risk-oriented:
  - Average coupling index (`relations.length / tables.length`).
  - Sprint risk ratings based on blast radius of impending migrations.
  - Team/Squad ownership groupings to prevent multi-team merge conflicts.

### 3. Business Owner Persona
- Translate technical jargon into plain-English capabilities:
  - Categorize tables by domain keywords (`auth`, `cart`, `payment`, `inventory`).
  - Avoid showing raw SQL types or AST node IDs.
  - Present user journeys with simple multi-step milestones.
