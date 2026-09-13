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
Returns the active analysis payload directly from server memory (`serverCache.js`).
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
Returns current installed version from `package.json` and updates availability.
