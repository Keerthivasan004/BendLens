<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BendLens AI Agent Instructions & Workspace Guidelines

> **BendLens (Backend Lens)** is a Universal Backend Architecture & Blast-Radius Platform.
> It is 100% Local-First, Air-Gapped, and Completely Private.

## Mandatory Reading for Any AI Agent
Before performing any analysis, refactoring, or code generation, review the centralized memory and skills inside the [`.agents/`](file:///d:/BCBUZZ_Side_Project/data-project/.agents) directory:

1. **System Memory**: [`.agents/memory/`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory)
   - [Project Overview](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/project_overview.md): Core mission, air-gapped guarantees, and capabilities.
   - [System Architecture](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/system_architecture.md): The full pipeline (Scanner -> Parsers -> Graph -> Diagrams -> Personas -> Impact).
   - [Codebase Map](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/codebase_map.md): Deep-dive into directories, components, services, and scripts.
   - [API Reference](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/api_reference.md): Next.js route handlers and payload contracts.
   - [Blast Radius Engine](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/blast_radius_engine.md): What-If simulation engine and ripple calculation.
   - [Persona Intelligence](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/persona_intelligence.md): Developer, Manager, and Business persona mapping.
   - [Diagram Generation Rules](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/diagram_generation_rules.md): Mermaid escaping rules and syntax guards.
   - [Desktop Electron Lifecycle](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/desktop_electron_lifecycle.md): Electron wrapper, splash screen, and packaging.

2. **System Rules**: [`.agents/rules/`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules)
   - [Continuous Agent Synchronization](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules/continuous-agent-synchronization.md): **MANDATORY**: Every code change must immediately be reflected in `.agents/memory/` and `.agents/skills/`.
   - [Architecture Rules](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules/architecture-rules.md): Zero cloud leakage, 2MB file limits, in-memory parsing.
   - [Code Conventions](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules/code-style-and-conventions.md): Next.js App Router, Tailwind, and Mermaid escaping rules.

3. **Specialized Skills**: [`.agents/skills/`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills)
   - [`bendlens-parser-engineer`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/bendlens-parser-engineer/SKILL.md)
   - [`diagram-generation-expert`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/diagram-generation-expert/SKILL.md)
   - [`blast-radius-simulator`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/blast-radius-simulator/SKILL.md)
   - [`persona-view-architect`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/persona-view-architect/SKILL.md)
   - [`electron-desktop-packager`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/electron-desktop-packager/SKILL.md)

## Core Architectural Guardrails
- **MANDATORY**: Whenever any update or modification is made in the code, update the `.agents/` folder in the skills and memory sections.
- **Testing Not Required**: Automated test suites are not required and testing time is eliminated. Focus directly on code implementation and system architecture.
- **Zero Cloud Leakage**: Never send source code or schemas to external APIs.
- **In-Memory Parsing**: Run AST extraction and graph traversal in Node.js memory.
- **Mermaid Escaping**: Never use unescaped `&` or `:` in diagram labels; sanitize table/column names.


