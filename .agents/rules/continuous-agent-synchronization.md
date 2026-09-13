# Mandatory Rule: Continuous Agent Synchronization

> [!IMPORTANT]
> **MANDATORY FOR ALL AI AGENTS**:
> Every time ANY update, modification, refactoring, feature addition, or architectural change is made to the codebase, the `.agents/` directory — specifically the **Memory** (`.agents/memory/`) and **Skills** (`.agents/skills/`) sections — **MUST BE UPDATED IMMEDIATELY** before concluding your work.

---

## Why Synchronization is Mandatory
BendLens relies on persistent agent context so that any AI model (Antigravity, Cursor, Claude Code, GitHub Copilot, Codex, Windsurf, etc.) working on this repository has 100% accurate, up-to-date knowledge of:
- All active components, libraries, and utilities.
- System data pipeline stages and AST parsing capabilities.
- API route handlers and request/response payloads.
- Persona mapping logic and risk evaluation engines.

Out-of-date agent documentation leads to hallucinated files, stale patterns, and broken assumptions.

---

## Synchronization Checklist on Every Code Change

Whenever you alter any file in `src/`, `electron/`, `scripts/`, or configuration files:

1. **Check Memory Impact (`.agents/memory/`)**:
   - **Modified/New API Route**: Update [`api_reference.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/api_reference.md).
   - **Modified/New Component or Script**: Update [`codebase_map.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/codebase_map.md).
   - **Modified Parsing Logic**: Update [`system_architecture.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/system_architecture.md) and [`project_overview.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/project_overview.md).
   - **Modified Blast Radius Engine**: Update [`blast_radius_engine.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/blast_radius_engine.md).
   - **Modified Persona Views**: Update [`persona_intelligence.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/persona_intelligence.md).
   - **Modified Mermaid Rules**: Update [`diagram_generation_rules.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/diagram_generation_rules.md).
   - **Modified Desktop/Electron Lifecycle**: Update [`desktop_electron_lifecycle.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/desktop_electron_lifecycle.md).

2. **Check Skills Impact (`.agents/skills/`)**:
   - If parser capabilities or signatures changed, update [`bendlens-parser-engineer/SKILL.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/bendlens-parser-engineer/SKILL.md).
   - If diagram syntax or visual tiers changed, update [`diagram-generation-expert/SKILL.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/diagram-generation-expert/SKILL.md).
   - If impact simulation inputs or outputs changed, update [`blast-radius-simulator/SKILL.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/blast-radius-simulator/SKILL.md).
   - If persona metrics or views changed, update [`persona-view-architect/SKILL.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/persona-view-architect/SKILL.md).
   - If desktop/packaging scripts changed, update [`electron-desktop-packager/SKILL.md`](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills/electron-desktop-packager/SKILL.md).

3. **Check Root Instructions**:
   - If major workflows or commands changed, update [`AGENTS.md`](file:///d:/BCBUZZ_Side_Project/data-project/AGENTS.md) and [`CLAUDE.md`](file:///d:/BCBUZZ_Side_Project/data-project/CLAUDE.md).

> **Note on Testing**: Automated unit/integration tests are deliberately NOT required in this repository to maximize development velocity. Do NOT spend time creating or maintaining test suites unless explicitly requested by the user.
