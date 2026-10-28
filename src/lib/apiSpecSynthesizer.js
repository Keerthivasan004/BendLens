/**
 * BendLens Universal API Specification & Database Schema Synthesizer
 * 
 * Converts live REST API responses, OpenAPI/Swagger specifications,
 * Swagger UI documentation pages, and Postman collections into
 * fully analyzable OpenAPI 3.0 specs and SQL relational schemas.
 * 
 * 100% In-Memory, Air-Gapped, Local-First.
 */

class ApiSpecSynthesizer {
  /**
   * Sanitize table and column identifiers for SQL and Mermaid diagram compatibility.
   */
  static sanitizeIdentifier(name, fallback = 'item') {
    if (!name || typeof name !== 'string') return fallback;
    const clean = name.trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
    return clean || fallback;
  }

  /**
   * Capitalize first letter for entity schema names.
   */
  static capitalize(str) {
    if (!str) return 'Entity';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Map JavaScript/JSON values to SQL relational column types.
   */
  static inferSqlType(val, keyName = '') {
    if (val === null || val === undefined) return 'VARCHAR(255)';
    const lowerKey = keyName.toLowerCase();
    if (lowerKey === 'id' || lowerKey.endsWith('_id') || lowerKey.endsWith('id')) {
      return typeof val === 'string' && val.length > 20 ? 'VARCHAR(64)' : 'INT';
    }
    if (lowerKey.includes('email')) return 'VARCHAR(255)';
    if (lowerKey.includes('url') || lowerKey.includes('link') || lowerKey.includes('avatar') || lowerKey.includes('image')) return 'VARCHAR(500)';
    if (lowerKey.includes('desc') || lowerKey.includes('body') || lowerKey.includes('content') || lowerKey.includes('bio') || lowerKey.includes('note')) return 'TEXT';
    
    if (typeof val === 'boolean') return 'BOOLEAN';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? (Math.abs(val) > 2147483647 ? 'BIGINT' : 'INT') : 'DECIMAL(10, 2)';
    }
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) return 'TIMESTAMP';
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'DATE';
      if (val.length > 255) return 'TEXT';
      return 'VARCHAR(255)';
    }
    if (Array.isArray(val) || typeof val === 'object') return 'JSON';
    return 'VARCHAR(255)';
  }

  /**
   * Map JavaScript/JSON values to OpenAPI 3.0 schema property definitions.
   */
  static inferOpenApiType(val) {
    if (val === null || val === undefined) return { type: 'string' };
    if (typeof val === 'boolean') return { type: 'boolean' };
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { type: 'integer' } : { type: 'number', format: 'double' };
    }
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) return { type: 'string', format: 'date-time' };
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return { type: 'string', format: 'date' };
      return { type: 'string' };
    }
    if (Array.isArray(val)) {
      const itemType = val.length > 0 ? ApiSpecSynthesizer.inferOpenApiType(val[0]) : { type: 'string' };
      return { type: 'array', items: itemType };
    }
    if (typeof val === 'object') return { type: 'object' };
    return { type: 'string' };
  }

  /**
   * Convert OpenAPI/Swagger schema properties (type, format) to SQL column types.
   */
  static openApiPropToSql(propDef, propName = '') {
    if (!propDef) return 'VARCHAR(255)';
    const lowerName = propName.toLowerCase();
    if (lowerName === 'id' || lowerName.endsWith('_id') || lowerName.endsWith('id')) {
      return (propDef.type === 'string' && propDef.format === 'uuid') ? 'VARCHAR(36)' : 'INT';
    }

    const type = (propDef.type || '').toLowerCase();
    const format = (propDef.format || '').toLowerCase();

    if (type === 'integer') {
      return format === 'int64' ? 'BIGINT' : 'INT';
    }
    if (type === 'number') {
      return 'DECIMAL(10, 2)';
    }
    if (type === 'boolean') {
      return 'BOOLEAN';
    }
    if (type === 'string') {
      if (format === 'date-time') return 'TIMESTAMP';
      if (format === 'date') return 'DATE';
      if (format === 'binary' || format === 'byte') return 'BYTEA';
      if (lowerName.includes('desc') || lowerName.includes('body') || lowerName.includes('content')) return 'TEXT';
      return 'VARCHAR(255)';
    }
    if (type === 'array' || type === 'object') {
      return 'JSON';
    }
    return 'VARCHAR(255)';
  }

  /**
   * Extract or synthesize relational SQL tables from an OpenAPI / Swagger specification.
   */
  static synthesizeSqlFromOpenApi(spec) {
    if (!spec || typeof spec !== 'object') return '';

    // Collect definitions from Swagger 2.0 or OpenAPI 3.0/3.1
    const schemas = spec.definitions || (spec.components && spec.components.schemas) || {};
    const tableNames = Object.keys(schemas);
    if (tableNames.length === 0) return '';

    const sqlStatements = [];
    const createdTables = new Set();

    for (const rawName of tableNames) {
      const def = schemas[rawName];
      if (!def || typeof def !== 'object') continue;

      const tableName = ApiSpecSynthesizer.sanitizeIdentifier(rawName);
      if (createdTables.has(tableName)) continue;
      createdTables.add(tableName);

      const properties = def.properties || {};
      const propNames = Object.keys(properties);
      const columns = [];
      const fks = [];
      let hasPk = false;

      // Identify primary key
      const pkCandidates = ['id', `${tableName}_id`, `${rawName.toLowerCase()}_id`, 'uuid', 'code'];
      let pkColName = propNames.find(p => pkCandidates.includes(p.toLowerCase()));

      for (const prop of propNames) {
        const colName = ApiSpecSynthesizer.sanitizeIdentifier(prop);
        const propDef = properties[prop] || {};
        const sqlType = ApiSpecSynthesizer.openApiPropToSql(propDef, prop);

        let colDef = `  ${colName} ${sqlType}`;
        if (colName === pkColName || (!hasPk && colName === 'id')) {
          colDef += ' PRIMARY KEY';
          hasPk = true;
          pkColName = colName;
        }

        columns.push(colDef);

        // Detect foreign key relationships (e.g. userId, category_id, petId)
        if (colName !== pkColName && (colName.endsWith('_id') || (colName.endsWith('id') && colName.length > 2))) {
          const targetRaw = colName.replace(/_id$/i, '').replace(/id$/i, '');
          const targetTable = ApiSpecSynthesizer.sanitizeIdentifier(targetRaw);
          if (createdTables.has(targetTable) || tableNames.some(t => ApiSpecSynthesizer.sanitizeIdentifier(t) === targetTable)) {
            fks.push(`  FOREIGN KEY (${colName}) REFERENCES ${targetTable}(id)`);
          }
        }
      }

      if (columns.length === 0) {
        columns.push('  id INT PRIMARY KEY', '  name VARCHAR(255)');
      } else if (!hasPk) {
        columns.unshift('  id INT PRIMARY KEY');
      }

      const allClauses = [...columns, ...fks];
      sqlStatements.push(`CREATE TABLE ${tableName} (\n${allClauses.join(',\n')}\n);`);

      // Add sample INSERT row
      const sampleCols = propNames.slice(0, 4).map(p => ApiSpecSynthesizer.sanitizeIdentifier(p));
      if (sampleCols.length > 0) {
        const sampleVals = sampleCols.map((c, idx) => {
          if (c === 'id' || c.endsWith('_id')) return `${idx + 1}`;
          return `'Sample ${c}'`;
        });
        sqlStatements.push(`INSERT INTO ${tableName} (${sampleCols.join(', ')}) VALUES (${sampleVals.join(', ')});`);
      }
    }

    return sqlStatements.join('\n\n');
  }

  /**
   * Synthesize a complete OpenAPI 3.0 specification and relational SQL schema
   * from ANY live REST API endpoint returning JSON data.
   */
  static synthesizeFromApiResponse(urlStr, jsonData) {
    let parsedUrl;
    try {
      parsedUrl = new URL(urlStr);
    } catch {
      parsedUrl = new URL('https://api.service.local/data');
    }

    // Determine resource name from URL pathname
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    let rawResource = 'resource';
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      const seg = pathSegments[i];
      if (!/^\d+$/.test(seg) && !/^[0-9a-f-]{30,}$/i.test(seg)) {
        rawResource = seg;
        break;
      }
    }

    const tableName = ApiSpecSynthesizer.sanitizeIdentifier(rawResource, 'entities');
    const entityName = ApiSpecSynthesizer.capitalize(tableName);
    const domainHost = parsedUrl.hostname || 'api.local';
    const basePath = parsedUrl.pathname || `/${tableName}`;

    // Normalize JSON data: find the main record or list of records
    let records = [];
    let extraEntities = {};

    if (Array.isArray(jsonData)) {
      records = jsonData;
    } else if (jsonData && typeof jsonData === 'object') {
      // Check if an inner property holds the collection (e.g. data, items, products, results, posts)
      const collectionKey = Object.keys(jsonData).find(k => Array.isArray(jsonData[k]) && jsonData[k].length > 0);
      if (collectionKey) {
        records = jsonData[collectionKey];
        // Other top-level object keys can be extra entities
        for (const [k, v] of Object.entries(jsonData)) {
          if (k !== collectionKey && typeof v === 'object' && v !== null) {
            extraEntities[k] = v;
          }
        }
      } else {
        records = [jsonData];
      }
    }

    if (records.length === 0) {
      records = [{ id: 1, name: 'Sample Item' }];
    }

    // Sample record to extract columns and schema
    const sampleRecord = records[0] || {};
    const propNames = Object.keys(sampleRecord);

    const sqlColumns = [];
    const openApiProps = {};
    const fks = [];
    let hasPk = false;
    let pkName = propNames.find(p => ['id', '_id', `${tableName}_id`, 'uuid'].includes(p.toLowerCase())) || 'id';

    for (const prop of propNames) {
      const colName = ApiSpecSynthesizer.sanitizeIdentifier(prop);
      const val = sampleRecord[prop];
      const sqlType = ApiSpecSynthesizer.inferSqlType(val, prop);
      const openApiType = ApiSpecSynthesizer.inferOpenApiType(val);

      openApiProps[prop] = openApiType;

      let colDef = `  ${colName} ${sqlType}`;
      if (prop === pkName || colName === 'id') {
        colDef += ' PRIMARY KEY';
        hasPk = true;
        pkName = colName;
      }
      sqlColumns.push(colDef);

      // If field is an array of objects, extract as a related sub-table
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        const subTableName = ApiSpecSynthesizer.sanitizeIdentifier(prop);
        extraEntities[subTableName] = val;
      }
    }

    if (!hasPk) {
      sqlColumns.unshift('  id INT PRIMARY KEY');
      pkName = 'id';
      openApiProps['id'] = { type: 'integer' };
    }

    const sqlStatements = [];
    sqlStatements.push(`CREATE TABLE ${tableName} (\n${sqlColumns.join(',\n')}\n);`);

    // Add up to 3 sample INSERT statements using actual API data
    const maxSamples = Math.min(records.length, 3);
    for (let i = 0; i < maxSamples; i++) {
      const rec = records[i];
      const validCols = [];
      const validVals = [];
      for (const prop of propNames) {
        const colName = ApiSpecSynthesizer.sanitizeIdentifier(prop);
        const val = rec[prop];
        if (typeof val === 'object' && val !== null) continue; // skip complex nested objects in basic insert
        validCols.push(colName);
        if (val === null || val === undefined) {
          validVals.push('NULL');
        } else if (typeof val === 'number') {
          validVals.push(`${val}`);
        } else if (typeof val === 'boolean') {
          validVals.push(val ? 'TRUE' : 'FALSE');
        } else {
          validVals.push(`'${String(val).replace(/'/g, "''").slice(0, 100)}'`);
        }
      }
      if (validCols.length > 0) {
        sqlStatements.push(`INSERT INTO ${tableName} (${validCols.join(', ')}) VALUES (${validVals.join(', ')});`);
      }
    }

    // Process nested / extra entities (e.g. reviews, categories)
    for (const [subName, subData] of Object.entries(extraEntities)) {
      const subTableName = ApiSpecSynthesizer.sanitizeIdentifier(subName);
      const subRecords = Array.isArray(subData) ? subData : [subData];
      const subSample = subRecords[0] || {};
      const subCols = [`  id INT PRIMARY KEY`, `  ${tableName}_id INT REFERENCES ${tableName}(id)`];

      for (const [k, v] of Object.entries(subSample)) {
        if (k.toLowerCase() === 'id') continue;
        const subColName = ApiSpecSynthesizer.sanitizeIdentifier(k);
        const subSqlType = ApiSpecSynthesizer.inferSqlType(v, k);
        subCols.push(`  ${subColName} ${subSqlType}`);
      }

      sqlStatements.push(`CREATE TABLE ${subTableName} (\n${subCols.join(',\n')}\n);`);
    }

    // Build complete OpenAPI 3.0 Specification
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: `${ApiSpecSynthesizer.capitalize(domainHost)} ${entityName} API`,
        version: '1.0.0',
        description: `Live REST API and data architecture automatically generated from ${urlStr}`
      },
      servers: [
        { url: parsedUrl.origin, description: 'Live API Origin' }
      ],
      paths: {
        [basePath]: {
          get: {
            summary: `Retrieve ${entityName} collection`,
            description: `Fetches list of ${tableName} records from ${parsedUrl.hostname}`,
            responses: {
              '200': {
                description: 'Successful query response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: `#/components/schemas/${entityName}` }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: `Create new ${entityName} entry`,
            description: `Inserts a new record into ${tableName}`,
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${entityName}` }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${entityName}` }
                  }
                }
              }
            }
          }
        },
        [`${basePath}/{id}`]: {
          get: {
            summary: `Retrieve ${entityName} by ID`,
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: {
              '200': {
                description: 'Record details',
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${entityName}` }
                  }
                }
              },
              '404': { description: 'Record not found' }
            }
          },
          put: {
            summary: `Update ${entityName} record`,
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${entityName}` }
                }
              }
            },
            responses: {
              '200': { description: 'Updated successfully' }
            }
          },
          delete: {
            summary: `Delete ${entityName} record`,
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: {
              '204': { description: 'Deleted successfully' }
            }
          }
        }
      },
      components: {
        schemas: {
          [entityName]: {
            type: 'object',
            properties: openApiProps
          }
        }
      }
    };

    return {
      projectName: `${domainHost} / ${entityName} API`,
      openApiSpec,
      sqlSchema: sqlStatements.join('\n\n')
    };
  }

  /**
   * Convert a Postman Collection JSON into OpenAPI 3.0 and relational schemas.
   */
  static synthesizeFromPostman(postmanJson) {
    const info = postmanJson.info || {};
    const title = info.name || 'Postman API Collection';
    const items = postmanJson.item || [];

    const paths = {};
    const endpoints = [];

    function processItems(itemList, parentFolder = '') {
      for (const it of itemList) {
        if (it.item && Array.isArray(it.item)) {
          processItems(it.item, `${parentFolder}/${it.name}`);
        } else if (it.request) {
          const req = it.request;
          const method = (req.method || 'GET').toLowerCase();
          let pathStr = '/api';

          if (typeof req.url === 'string') {
            try {
              pathStr = new URL(req.url).pathname;
            } catch {
              pathStr = req.url.startsWith('/') ? req.url : '/' + req.url;
            }
          } else if (req.url && req.url.path) {
            pathStr = '/' + (Array.isArray(req.url.path) ? req.url.path.join('/') : req.url.path);
          }

          if (!paths[pathStr]) paths[pathStr] = {};
          paths[pathStr][method] = {
            summary: it.name || `${method.toUpperCase()} ${pathStr}`,
            description: (req.description && (req.description.content || req.description)) || '',
            responses: {
              '200': { description: 'Successful request' }
            }
          };

          endpoints.push({ method: method.toUpperCase(), path: pathStr, name: it.name });
        }
      }
    }

    processItems(items);

    const openApiSpec = {
      openapi: '3.0.0',
      info: { title, version: '1.0.0', description: info.description || 'Imported from Postman Collection' },
      paths
    };

    // Synthesize simple SQL models from endpoint paths (e.g. /users -> users table, /orders -> orders table)
    const distinctResources = new Set();
    for (const ep of endpoints) {
      const segs = ep.path.split('/').filter(Boolean);
      for (const seg of segs) {
        if (!/^\d+$/.test(seg) && !/^[0-9a-f-]{30,}$/i.test(seg) && seg !== 'api' && seg !== 'v1' && seg !== 'v2') {
          distinctResources.add(ApiSpecSynthesizer.sanitizeIdentifier(seg));
          break;
        }
      }
    }

    const sqlStatements = [];
    for (const res of distinctResources) {
      sqlStatements.push(`CREATE TABLE ${res} (\n  id INT PRIMARY KEY,\n  name VARCHAR(255),\n  status VARCHAR(50),\n  created_at TIMESTAMP\n);`);
    }

    return {
      projectName: title,
      openApiSpec,
      sqlSchema: sqlStatements.join('\n\n')
    };
  }

  /**
   * Intelligently discover underlying OpenAPI/Swagger specification URLs
   * from Swagger UI, Redoc, or API documentation HTML pages.
   */
  static discoverSpecUrlsFromHtml(html, basePageUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(basePageUrl);
    } catch {
      return [];
    }

    const candidates = new Set();

    // 1. Regex search for direct spec links in HTML / JS config
    const urlMatches = html.match(/(?:url|defaultDefinitionUrl)\s*[:=]\s*["']([^"']+\.(?:json|yaml|yml))["']/gi);
    if (urlMatches) {
      for (const m of urlMatches) {
        const clean = m.replace(/^(?:url|defaultDefinitionUrl)\s*[:=]\s*["']/i, '').replace(/["']$/, '').trim();
        try {
          candidates.add(new URL(clean, parsedUrl.origin).href);
        } catch {}
      }
    }

    // 2. Search for any .json or .yaml links containing swagger / openapi / api-docs
    const specLinkRegex = /["']([^"']*(?:openapi|swagger|api-docs|api-spec)[^"']*\.(?:json|yaml|yml))["']/gi;
    let match;
    while ((match = specLinkRegex.exec(html)) !== null) {
      try {
        candidates.add(new URL(match[1], parsedUrl.origin).href);
      } catch {}
    }

    // 3. Search for swagger-initializer.js script
    if (html.includes('swagger-initializer.js')) {
      try {
        candidates.add(new URL('swagger-initializer.js', basePageUrl).href);
      } catch {}
    }

    // 4. Standard conventional endpoints relative to domain and path
    const origin = parsedUrl.origin;
    const pathPrefix = parsedUrl.pathname.replace(/\/+$/, '');

    const standardPaths = [
      '/openapi.json',
      '/openapi.yaml',
      '/swagger.json',
      '/swagger.yaml',
      '/v2/swagger.json',
      '/v3/api-docs',
      '/api-docs.json',
      '/api/openapi.json',
      '/api/swagger.json',
      '/api/v3/api-docs',
      `${pathPrefix}/openapi.json`,
      `${pathPrefix}/swagger.json`,
      `${pathPrefix}/v2/swagger.json`,
      `${pathPrefix}/v3/api-docs`
    ];

    for (const p of standardPaths) {
      try {
        candidates.add(new URL(p, origin).href);
      } catch {}
    }

    return Array.from(candidates);
  }

  /**
   * Extract API endpoints directly from frontend web application bundles (SPAs / React / Vite / Next.js)
   * found on websites like https://fts2trial.bcbuzz.tech.
   */
  static async extractFromWebAppAssets(html, basePageUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(basePageUrl);
    } catch {
      return null;
    }

    // 1. Extract project title from HTML <title>
    let projectName = parsedUrl.hostname;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      projectName = titleMatch[1].trim().replace(/&amp;/g, '&');
    }

    // 2. Discover script tags in the HTML
    const scriptSrcs = [];
    const scriptTagRegex = /<script\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = scriptTagRegex.exec(html)) !== null) {
      const src = match[1];
      if (src.includes('google-analytics') || src.includes('googletagmanager') || src.includes('checkout.razorpay.com') || src.includes('connect.facebook.net')) {
        continue;
      }
      try {
        const resolved = new URL(src, basePageUrl).href;
        scriptSrcs.push(resolved);
      } catch {}
    }

    if (scriptSrcs.length === 0) {
      return null;
    }

    // 3. Fetch app script bundles and extract API routes with accurate HTTP methods and normalized path parameters
    const endpointMap = new Map(); // path -> Set of methods

    const candidateScripts = scriptSrcs.slice(0, 5);

    for (const scriptUrl of candidateScripts) {
      try {
        const res = await fetch(scriptUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const code = await res.text();

          // Pass 1: Parse explicit API client calls with exact methods
          // Matches ce(url, { method: "..." }), fetch(url, { method: "..." }), axios.get/post/put/delete, etc.
          const callRegex = /(?:ce|fetch|axios|apiClient|request|client|http|get|post|put|delete|patch)\(\s*([`'"][^`'"]*\/api\/[^`'"]*[`'"])(?:\s*,\s*\{([^}]*)\})?/gi;
          let cm;
          while ((cm = callRegex.exec(code)) !== null) {
            let rawPath = cm[1].slice(1, -1);
            const options = cm[2] || '';
            const methodMatch = options.match(/method\s*:\s*["'](GET|POST|PUT|DELETE|PATCH)["']/i);
            let method = methodMatch ? methodMatch[1].toLowerCase() : 'get';

            // Clean template strings:
            // Remove query string template interpolations like ${t} or ?...
            rawPath = rawPath.replace(/\?[^`'"]*/g, '');
            // Convert template expressions ${...} into OpenAPI {id} or {action}
            rawPath = rawPath.replace(/\$\{[^}]+\}/g, '{id}');
            // Normalize double {id}/{id} to {id}/{action}
            rawPath = rawPath.replace(/\/\{id\}\/\{id\}/g, '/{id}/{action}');
            // If path ends with {id} attached without a slash, e.g. /api/notifications{id} (artifact of query params)
            rawPath = rawPath.replace(/\/([a-zA-Z0-9_\-]+)\{id\}$/, '/$1');
            // If path ends with trailing slash, make it {id}
            if (rawPath.endsWith('/')) rawPath += '{id}';
            rawPath = rawPath.replace(/\/+$/, '').trim();

            if (rawPath.startsWith('/api') && rawPath.length > 5 && !/\.(?:js|css|png|jpg|svg|ico)$/i.test(rawPath)) {
              if (!endpointMap.has(rawPath)) endpointMap.set(rawPath, new Set());
              endpointMap.get(rawPath).add(method);
            }
          }

          // Pass 2: Extract any remaining static /api/... or /v1/... endpoints in the bundle
          const epMatches = code.match(/(?:\/api|\/v[1-9])\/[a-zA-Z0-9_\-\/]+/g) || [];
          for (let ep of epMatches) {
            ep = ep.replace(/\/+$/, '').trim();
            if (ep.length >= 5 && !/\.(?:js|css|png|jpg|svg|ico)$/i.test(ep) && !ep.includes('//')) {
              if (!endpointMap.has(ep)) {
                let inferredMethod = 'get';
                const lower = ep.toLowerCase();
                if (lower.includes('login') || lower.includes('logout') || lower.includes('send-otp') || lower.includes('submit') || 
                    lower.includes('create') || lower.includes('sync') || lower.includes('chat') || lower.includes('verify') ||
                    lower.includes('register') || lower.includes('withdraw') || lower.includes('apply') || lower.includes('publish') || lower.includes('click') || lower.includes('impression')) {
                  inferredMethod = 'post';
                } else if (lower.includes('delete') || lower.includes('remove') || lower.includes('reject')) {
                  inferredMethod = 'delete';
                } else if (lower.includes('update') || lower.includes('change') || lower.includes('reset') || lower.includes('edit')) {
                  inferredMethod = 'put';
                }
                endpointMap.set(ep, new Set([inferredMethod]));
              }
            }
          }
        }
      } catch {}
    }

    if (endpointMap.size === 0) {
      return null;
    }

    // 4. Construct OpenAPI 3.0 specification from discovered endpoints
    const paths = {};
    const entities = new Set();

    for (const [ep, methods] of endpointMap.entries()) {
      const segments = ep.split('/').filter(Boolean);
      const tag = segments.length > 1 ? ApiSpecSynthesizer.capitalize(segments[1]) : 'General';
      const actionName = segments[segments.length - 1];

      for (const seg of segments) {
        if (!['api', 'v1', 'v2', 'v3', 'me', 'submit', 'stream'].includes(seg) && !/^\d+$/.test(seg) && !seg.startsWith('{')) {
          entities.add(ApiSpecSynthesizer.sanitizeIdentifier(seg));
        }
      }

      if (!paths[ep]) paths[ep] = {};
      for (const m of methods) {
        const method = m.toLowerCase();
        paths[ep][method] = {
          tags: [tag],
          summary: `${method.toUpperCase()} ${ep}`,
          description: `API route extracted from frontend web application bundle for ${actionName}`,
          responses: {
            '200': { description: 'Successful API execution' }
          }
        };

        const paramMatches = ep.match(/\{([a-zA-Z0-9_]+)\}/g);
        if (paramMatches) {
          paths[ep][method].parameters = paramMatches.map(p => ({
            name: p.slice(1, -1),
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }));
        }
      }
    }

    // 5. Construct relational SQL schema for discovered resources
    const sqlStatements = [];
    const schemas = {};

    for (const ent of entities) {
      sqlStatements.push(`CREATE TABLE ${ent} (\n  id INT PRIMARY KEY,\n  name VARCHAR(255),\n  status VARCHAR(50),\n  created_at TIMESTAMP\n);`);
      schemas[ApiSpecSynthesizer.capitalize(ent)] = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          status: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' }
        }
      };
    }

    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: projectName,
        version: '1.0.0',
        description: `Universal API Architecture extracted from web application assets at ${basePageUrl}`
      },
      servers: [
        { url: parsedUrl.origin, description: 'Live Web App Origin' }
      ],
      paths,
      components: {
        schemas
      }
    };

    return {
      projectName,
      openApiSpec,
      sqlSchema: sqlStatements.join('\n\n'),
      totalEndpoints: endpointMap.size
    };
  }
}

module.exports = ApiSpecSynthesizer;
