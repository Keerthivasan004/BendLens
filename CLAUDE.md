@AGENTS.md

# BendLens - Claude & AI Assistant Instructions

BendLens is a 100% Local-First, Air-Gapped Backend Architecture and Blast-Radius Analysis Platform.

## 🚨 Continuous Synchronization Mandate
**EVERY TIME** any update or modification is made in the code, the `.agents/` directory — specifically the **Memory** (`.agents/memory/`) and **Skills** (`.agents/skills/`) sections — **MUST BE UPDATED IMMEDIATELY**.

## Quick References
- **Onboarding Hub**: [.agents/README.md](file:///d:/BCBUZZ_Side_Project/data-project/.agents/README.md)
- **Mandatory Synchronization Rule**: [.agents/rules/continuous-agent-synchronization.md](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules/continuous-agent-synchronization.md)
- **Memory Index**: [.agents/memory/index.md](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/index.md)
- **System Architecture**: [.agents/memory/system_architecture.md](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/system_architecture.md)
- **Codebase Map**: [.agents/memory/codebase_map.md](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/codebase_map.md)
- **API Reference**: [.agents/memory/api_reference.md](file:///d:/BCBUZZ_Side_Project/data-project/.agents/memory/api_reference.md)
- **Rules**: [.agents/rules/](file:///d:/BCBUZZ_Side_Project/data-project/.agents/rules)
- **Skills**: [.agents/skills/](file:///d:/BCBUZZ_Side_Project/data-project/.agents/skills)

## Primary Commands
- Run Web Dev Server: `npm run dev` (runs at http://localhost:3000)
- Launch Desktop App: `npm run desktop` or `node scripts/launch-desktop.js`
- Package Windows Desktop: `npm run dist`

## Essential Guardrails
1. **Always Synchronize `.agents/`**: Keep skills and memory in sync with every code update.
2. **Testing Not Required**: Automated test suites are intentionally omitted to maximize speed and efficiency.
3. **Never leak code to cloud services**: BendLens is strictly local-first and air-gapped.
4. **In-memory AST parsing**: AST parsing and graph traversal run locally in memory.
5. **Mermaid syntax safety**: No unescaped `&` or `:` in labels; no self-referencing zero-length edges in ER diagrams; no direct subgraph-to-subgraph edges in flowcharts.
