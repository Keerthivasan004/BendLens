# Code Style and Conventions

## 1. Next.js 16 App Router & React Conventions
- **App Router Directory Structure**: All page routes reside in `src/app/`, API handlers in `src/app/api/*/route.js`.
- **Client vs Server Components**:
  - Add `'use client';` at the top of interactive components (e.g., `src/app/lens/page.jsx`, `DiagramCanvas.jsx`, `BlastRadiusSimulator.jsx`).
  - Keep utilities in `src/lib/` agnostic and pure (runnable in both Node.js server routes and background scripts).
- **Icons**: Use `lucide-react` icons. Maintain consistent sizes (`size={16}` for inline badges, `size={18}`-`size={20}` for action buttons).
- **Styling**:
  - Tailwind CSS + custom dark/light design system classes (`bg-slate-950`, `bg-slate-900`, `border-slate-800`, `text-slate-100`).
  - Use `clsx` and `tailwind-merge` for dynamic classes.
  - Support both `dark` and `light` themes via document class `dark`.

## 2. Mermaid Diagram String Formatting & Sanitization
Mermaid.js parses diagram syntax strictly. Violating syntax crashes client-side SVG rendering. Always adhere to these rules:
- **Node IDs**: Sanitize IDs using `replace(/[^a-zA-Z0-9_]/g, '_')`.
- **Special Characters in Labels**:
  - Never use raw `&` in labels; write `and` instead (e.g., avoid `"Client & Edge"` -> use `"Client and Edge"`).
  - Never use colons `:` in node labels or port formatting (e.g., avoid `Postgres:5432` -> use `Postgres_Port5432` or `Postgres (5432)`).
  - Wrap node text in quotes if it contains spaces: `id["Clean Node Label"]`.
- **ER Diagram Rules**:
  - Column types must be simple alphanumeric strings (e.g., `uuid`, `varchar`, `timestamp`, `string`). Do not include parentheses like `VARCHAR(255)` directly in Mermaid token slots; convert to `varchar_255` or `varchar`.
  - Self-referencing foreign keys (table pointing to itself) must be skipped or formatted carefully to avoid zero-length SVG path calculation errors.
- **Flowchart Rules**:
  - Do NOT connect subgraphs directly to other subgraphs (e.g., `CONTROLLERS --> SERVICES` fails in older Mermaid renderers); always connect node-to-node (e.g., `c1 --> s1`).

## 3. Polyglot & Cross-Platform Path Handling
- Always use `path.resolve`, `path.join`, and normalize backslashes with `.replace(/\\/g, '/')` when comparing or outputting relative paths.
- On Windows systems, strip quotes from user-provided file paths:
  ```javascript
  const cleanPath = (rawPath || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
  ```
