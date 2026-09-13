# BendLens AI Agents Hub & System Memory

Welcome to the **BendLens** agent workspace. This folder contains structured knowledge, rules, skills, and memory so that any AI assistant (Antigravity, Cursor, Claude Code, GitHub Copilot, Codex, Windsurf, etc.) can immediately understand the project architecture, operational constraints, and domain capabilities.

> [!IMPORTANT]
> **MANDATORY SYNCHRONIZATION RULE**:
> Every time ANY update or modification is made in the code, the `.agents/` folder in the **skills** and **memory** sections **MUST BE UPDATED IMMEDIATELY**.

---

## 🧭 Navigation Quick Links

- **System Rules**: [`.agents/rules/`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules)
  - [Continuous Agent Synchronization](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules/continuous-agent-synchronization.md): Mandatory workflow for maintaining `.agents/` memory and skills on every code change.
  - [Architecture Rules](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules/architecture-rules.md): Air-gapped, local-first philosophy, in-memory processing guarantees.
  - [Code Style & Conventions](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules/code-style-and-conventions.md): Next.js App Router, Tailwind, and Mermaid string escaping.

- **System Memory & Documentation**: [`.agents/memory/`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory)
  - [Memory Index](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/index.md): Complete guide to all memory documents.
  - [Project Overview](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/project_overview.md): What BendLens is, core philosophy, and target user personas.
  - [System Architecture](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/system_architecture.md): The full pipeline: Scanner -> Parsers -> Graph -> Diagrams -> Personas -> Impact.
  - [Codebase Map](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/codebase_map.md): Deep-dive into every directory, component, service, and script.
  - [API Reference](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/api_reference.md): Every Next.js API route handler, request body, and response format.
  - [Blast Radius Engine](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/blast_radius_engine.md): Graph traversal, foreign key cascades, risk scoring, and mitigation logic.
  - [Persona Intelligence](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/persona_intelligence.md): Developer Console, Manager Dashboard, and Business Owner views.
  - [Diagram Generation Rules](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/diagram_generation_rules.md): Mermaid escaping rules, syntax pitfalls, and layout tips.
  - [Desktop Electron Lifecycle](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/desktop_electron_lifecycle.md): Electron wrapper, splash screen, single-instance lock, and packaging.

- **Agent Skills**: [`.agents/skills/`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills)
  - [`bendlens-parser-engineer`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/bendlens-parser-engineer/SKILL.md): Adding and enhancing SQL, ORM, code AST, and infrastructure parsers.
  - [`diagram-generation-expert`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/diagram-generation-expert/SKILL.md): Generating and debugging Mermaid ERD, HLD, LLD, and Sequence diagrams.
  - [`blast-radius-simulator`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/blast-radius-simulator/SKILL.md): Calculating downstream breaking changes, ripple nodes, and risk mitigation.
  - [`persona-view-architect`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/persona-view-architect/SKILL.md): Building metrics and views for Developer, Manager, and Business personas.
  - [`electron-desktop-packager`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/electron-desktop-packager/SKILL.md): Packaging and launching the desktop application on Windows.

---

## ⚡ Key Commands Cheat Sheet

| Action | Command | Details |
|---|---|---|
| Run Dev Web Server | `pnpm dev` | Runs Next.js at `http://localhost:3000` |
| Launch Desktop App | `pnpm desktop` or `node scripts/launch-desktop.js` | Launches native Electron app with instant splash screen |
| Package Windows App | `pnpm dist` | Generates NSIS installer & portable `.exe` in `dist/` |

> **Note**: Automated testing suites are intentionally omitted to maximize speed and efficiency.
