# Architectural Rules & Constraints

## 1. 100% Local-First & Air-Gapped Philosophy
BendLens is designed for private, highly proprietary backend codebases, database DDLs, and architectures.
- **ZERO External Cloud Leakage**: Under NO circumstances should source code, AST dumps, SQL schemas, or project paths be sent to external analytics or third-party servers.
- **In-Memory Parsing**: All AST extraction, schema discovery, graph traversal, and diagram compilation must run locally within the Node.js / browser environment.
- **Privacy Parity**: Maintain air-gapped readiness at all times.

## 2. Scanning & Performance Guards
Large multi-gigabyte enterprise repositories are supported through strict guardrails implemented in `ProjectAnalyzer.scanDirectory`:
- **Ignored Directories**: Always skip directories in `IGNORED_DIRS` (`node_modules`, `.git`, `.next`, `dist`, `build`, `__pycache__`, `venv`, `target`, `bin`, `obj`, `vendor`, `.terraform`, `.cache`, `tmp`, etc.).
- **File Limit**: Never scan more than 10,000 files in a single pass (`MAX_FILES = 10000`).
- **File Size Cap**: Only parse files <= 2MB (`MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024`) to prevent memory crashes on minified files or large binary dumps.

## 3. Server Memory Cache Architecture
- To bypass the browser's 5MB `localStorage` limit when analyzing large repositories, full analysis ASTs are cached on the server in `serverCache.js`.
- The client fetches the current analysis via `/api/current`.
- Analysis history is stored in a lightweight JSON file in the OS temp directory (`.bendlens_history.json`).

## 4. Single Source of Truth: In-Memory Knowledge Graph
- The `KnowledgeGraph` (`src/lib/graph/knowledgeGraph.js`) is the central source of truth for:
  - Tables & foreign key relations.
  - Endpoints & HTTP verbs.
  - Services, containers, & databases.
  - Code modules, classes, and call sites.
- All generators (`DiagramGenerator`, `ImpactAnalyzer`, `PersonaMapper`) should derive their computations from the parsed schema, code, and graph rather than introducing disjoint data models.
