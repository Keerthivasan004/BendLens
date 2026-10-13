# API Reference

All BendLens API endpoints are implemented as Next.js Route Handlers in `src/app/api/`.

---

## 1. POST `/api/analyze`
Analyzes a local filesystem directory.
- **Request Body**:
  ```json
  {
    "path": "C:/Projects/my-backend"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "projectName": "my-backend",
      "projectPath": "C:/Projects/my-backend",
      "scannedFilesCount": 142,
      "schema": { "tables": [], "relations": [] },
      "code": { "endpoints": [], "classes": [], "functions": [], "modules": [] },
      "infra": { "services": [], "databases": [], "externalAPIs": [] },
      "diagrams": { "erd": {}, "hld": {}, "lld": {}, "sequence": {} },
      "personas": { "developer": {}, "manager": {}, "business": {} },
      "sampleImpact": {}
    }
  }
  ```

---

## 2. POST `/api/impact`
Evaluates real-time blast radius and cascading breakages when modifying a schema or route element.
- **Request Body**:
  ```json
  {
    "targetName": "users",
    "targetType": "table",
    "changeType": "column_name",
    "columnName": "id",
    "action": "rename",
    "newValue": "user_uuid"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "target": "users",
      "targetType": "table",
      "action": "rename",
      "riskScore": 85,
      "riskLevel": "CRITICAL",
      "summary": "Modifying column 'id' in table 'users' affects 4 relational tables and 8 API endpoints.",
      "rippleNodes": [
        { "name": "orders", "type": "table", "reason": "FK constraint references users(id)" }
      ],
      "affectedEndpoints": [
        { "method": "GET", "path": "/api/users/:id" }
      ],
      "mitigationChecklist": [
        "Update foreign key definitions in orders table.",
        "Update API request validation schemas in user routes."
      ]
    }
  }
  ```

---

## 3. GET `/api/current`
Requires `?path=` and returns a freshly computed analysis for that path (no shared cache; 404 when `path` is missing so one session can never receive another's data).
- **Response**:
  ```json
  {
    "success": true,
    "data": { ...analysisObject }
  }
  ```

---

## 4. POST `/api/paste`
Parses raw pasted SQL DDL, Prisma schemas, or code text into an architecture AST in memory.
- **Request Body**:
  ```json
  {
    "code": "CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100));",
    "fileType": "schema.sql",
    "projectName": "Pasted Architecture"
  }
  ```

---

## 5. POST `/api/upload`
Uploads and resiliently extracts a `.zip` archive into a sanitized temporary directory and runs `ProjectAnalyzer.analyze`.
- **Request Format**: `multipart/form-data` with field `file`.

---

## 6. GET `/api/sample`
Loads and analyzes the built-in demo project (`sample_project/`).

---

## 7. GET `/api/history`
Returns recently analyzed project paths and metadata from the OS temp history file (`.bendlens_history.json`).

---

## 8. GET `/api/updates/check`
Returns installed version from `package.json` vs newest release detected by `src/lib/releaseInfo.js` (newest `dist/BendLens-Setup-*.exe` / `BendLens-Portable-*.exe` artifact, else `BASELINE_LATEST_VERSION`). `?source=desktop` additionally merges the public GitHub release tag (metadata-only, cached, offline-safe fallback) so packaged installs — which have no `dist/` — can discover releases. Air-gapped default: plain calls never touch the network (engine identity probe relies on this). `?simulate=true` forces `hasUpdate: true` for notification testing.
- **Response**: `{ success, currentVersion, latestVersion, hasUpdate, updateArtifact, updateSource, releaseNotes, featureShowcase, releaseDate }`
- **POST** `action: 'reset'` (set 1.0.0, for testing) / `'bump'` (adopt detected latest).

## 9. POST `/api/updates/apply`
Applies software updates with local-first, air-gapped guarantees and zero HTTP 500 failure modes:
1. **Local-first Installer Check**: Probes `dist/*.exe` (Setup or Portable) and launches the local installer immediately if present.
2. **Git Repository Pull**: In development repos (`.git` present), safely attempts `git pull --ff-only origin main` with a standard pull fallback.
3. **Packaged App Remote Discovery**: If in a non-git environment without local installers, checks GitHub releases with a strict 4-second `AbortController` timeout and launches the download URL directly in the user's default browser (avoiding heavy 170MB memory buffering in Node.js).
4. **Desktop Brand Sync**: Safely synchronizes brand assets via `scripts/build_brand_assets.js` and ensures the Windows Desktop shortcut exists.
5. **Version Persistence**: Updates `package.json` to the target version or detected version via `setLocalVersion`.
6. **Error Resiliency**: Always returns HTTP 200 with structured JSON (`{ success, newVersion, durationMs, details, warning }`) to ensure client UIs never encounter an unhandled HTTP 500 error.
- **Request Body (optional)**: `{ "targetVersion": "1.1.21" }`
- **Response**: `{ success: true, message: "...", newVersion: "1.1.21", durationMs: 120, details: "..." }`

---

## 10. POST `/api/git-clone`
Universal URL Ingestion Engine for remote repositories and direct API specifications.
- **Supported URL Types**:
  1. **Direct OpenAPI / Swagger Specifications**: JSON or YAML files (`https://.../openapi.json`, `https://.../swagger.yaml`, `https://.../api-docs`).
  2. **GitHub Repositories**: Public and private repositories via Zipball streaming with PAT support (`https://github.com/owner/repo`).
  3. **GitLab Repositories**: Public and private repositories via GitLab archive zipballs (`https://gitlab.com/owner/repo`).
  4. **Generic Git Repositories**: Via shallow Git CLI clone fallback (`git clone --depth 1`).
- **Request Body**:
  ```json
  {
    "repoUrl": "https://github.com/owner/repo",
    "token": "ghp_optionalTokenForPrivateRepos"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": { ...analysisObject }
  }
  ```

