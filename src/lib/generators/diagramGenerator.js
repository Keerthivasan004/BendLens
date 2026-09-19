/**
 * Multi-Level Diagram Generator
 * Transforms Knowledge Graph and Parsed Schemas into:
 * 1. ERD (Database Schema & Relationships)
 * 2. HLD (High-Level C4 Container & Service Architecture)
 * 3. LLD (Low-Level Class & Component Call Graph)
 * 4. Sequence Diagrams (Request/Response execution flows)
 */
class DiagramGenerator {
  static generateERD(schemaData) {
    const { tables, relations } = schemaData || {};
    if (!tables || tables.length === 0) {
      return {
        type: 'ERD',
        title: 'Database Entity-Relationship Diagram',
        mermaid: 'erDiagram\n    DATABASE_MODELS {\n        string note\n    }',
        tablesCount: 0,
        relationsCount: 0
      };
    }
    let mermaid = 'erDiagram\n';

    // Prioritize relational and interconnected tables if schema is colossal (> 50 tables)
    // to prevent Mermaid Dagre engine from locking up the browser thread.
    let targetTables = tables;
    if (tables.length > 50) {
      const relatedTableNames = new Set();
      (relations || []).forEach(r => {
        if (r.sourceTable) relatedTableNames.add(r.sourceTable);
        if (r.targetTable) relatedTableNames.add(r.targetTable);
      });
      targetTables = [...tables].sort((a, b) => {
        const aRel = relatedTableNames.has(a.name) ? 1 : 0;
        const bRel = relatedTableNames.has(b.name) ? 1 : 0;
        if (aRel !== bRel) return bRel - aRel;
        return (a.name || '').localeCompare(b.name || '');
      }).slice(0, 50);
    }

    const includedTableNames = new Set(targetTables.map(t => (t.name || '').replace(/[^a-zA-Z0-9_]/g, '_')));

    // Format tables with clean types and PK/FK markers (cap at 14 columns per entity to avoid CPU layout hangs)
    const MAX_COLS_PER_TABLE = 14;

    for (const table of targetTables) {
      const safeTableName = (table.name || 'table').replace(/[^a-zA-Z0-9_]/g, '_');
      mermaid += `    ${safeTableName} {\n`;
      const cols = table.columns || [];
      if (cols.length === 0) {
        mermaid += `        string id PK\n`;
      } else {
        const pkCols = [];
        const fkCols = [];
        const regularCols = [];

        for (const col of cols) {
          const isPk = !!col.isPrimaryKey;
          const isFk = (table.foreignKeys || []).some(f => f.column === col.name);
          if (isPk) pkCols.push(col);
          else if (isFk) fkCols.push(col);
          else regularCols.push(col);
        }

        // Always retain all PKs and FKs, and fill remaining slots up to MAX_COLS_PER_TABLE
        const selectedCols = [...pkCols, ...fkCols];
        const remainingSlots = Math.max(0, MAX_COLS_PER_TABLE - selectedCols.length);
        selectedCols.push(...regularCols.slice(0, remainingSlots));

        for (const col of selectedCols) {
          const pk = col.isPrimaryKey ? 'PK' : '';
          const fk = (table.foreignKeys || []).some(f => f.column === col.name) ? 'FK' : '';
          const tag = pk || fk || '';
          let cleanType = (col.type || 'VARCHAR')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .toLowerCase();
          if (!cleanType) cleanType = 'string';
          const safeColName = (col.name || 'column').replace(/[^a-zA-Z0-9_]/g, '_');
          
          const tokens = [cleanType, safeColName];
          if (tag) tokens.push(tag);
          mermaid += `        ${tokens.join(' ')}\n`;
        }

        const omittedCount = cols.length - selectedCols.length;
        if (omittedCount > 0) {
          mermaid += `        string _more_${omittedCount}_fields\n`;
        }
      }
      mermaid += `    }\n`;
    }

    // Deduplicate relations and filter to only tables present in the diagram
    const seenRelations = new Set();
    for (const rel of (relations || [])) {
      if (!rel.targetTable || !rel.sourceTable) continue;
      const safeTarget = rel.targetTable.replace(/[^a-zA-Z0-9_]/g, '_');
      const safeSource = rel.sourceTable.replace(/[^a-zA-Z0-9_]/g, '_');
      // Prevent self-referencing foreign keys from generating zero-length SVG paths in Mermaid ER
      if (safeTarget === safeSource) continue;
      // Skip relations where one of the tables was excluded
      if (!includedTableNames.has(safeTarget) || !includedTableNames.has(safeSource)) continue;

      const safeCol = (rel.sourceColumn || 'references').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
      const relKey = `${safeTarget}->${safeSource}:${safeCol}`;
      if (!seenRelations.has(relKey)) {
        seenRelations.add(relKey);
        const relSymbol = (rel.type || '').includes('1:1') ? '||--||' : '||--o{';
        mermaid += `    ${safeTarget} ${relSymbol} ${safeSource} : "${safeCol}"\n`;
      }
    }

    return {
      type: 'ERD',
      title: 'Database Entity-Relationship Diagram',
      mermaid: mermaid.trim(),
      tablesCount: tables.length,
      tablesShown: targetTables.length,
      relationsCount: seenRelations.size
    };
  }

  static generateHLD(infraData, codeData, schemaData) {
    // Support flexible argument positions: (infraData, schemaData) or (infraData, codeData, schemaData)
    if (!schemaData && codeData && (codeData.tables || Array.isArray(codeData.tables))) {
      schemaData = codeData;
      codeData = {};
    }
    const safeInfra = infraData || {};
    const safeCode = codeData || {};
    const safeSchema = schemaData || {};
    const services = safeInfra.services || [];

    // Extract databases declared in infra or graph
    const extraDatabases = (safeInfra.databases || []).map((d) => ({
      name: d.name || 'Database',
      isDatabase: true,
      image: d.engine || 'postgres',
      ports: d.port ? [d.port] : []
    }));

    let mermaid = 'flowchart TB\n';

    // 1. Client & Ingress Tier
    mermaid += '    subgraph CLIENTS ["Client and Edge Layer"]\n';
    mermaid += '        CLI_WEB["Single Page Web App"]\n';
    mermaid += '        CLI_MOBILE["Mobile App Client"]\n';
    mermaid += '        CLI_EXTERNAL["External Webhook Services"]\n';
    mermaid += '    end\n\n';

    // 2. Gateway Layer
    mermaid += '    subgraph GATEWAY ["API Gateway and Ingress"]\n';
    const gatewayService = services.find((s) => 
      /gateway|nginx|ingress|proxy|router|traefik|kong|envoy/i.test(s.name || '')
    );
    const gwNodeId = gatewayService
      ? `GW_${(gatewayService.name || 'GATEWAY').toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`
      : 'GW_API_GATEWAY';
    const gwPort = (gatewayService && gatewayService.ports && gatewayService.ports[0]) || '80';
    const cleanGwPort = String(gwPort).replace(/:/g, ' to ').replace(/[^A-Za-z0-9_ -]/g, '');
    const cleanGwName = gatewayService ? (gatewayService.name || 'nginx').toUpperCase().replace(/[^A-Z0-9_ -]/g, '') : 'API Gateway';
    const gwLabel = gatewayService
      ? `API Gateway (${cleanGwName} - Port ${cleanGwPort})`
      : 'API Gateway Router';
    mermaid += `        ${gwNodeId}["${gwLabel}"]\n`;
    mermaid += '    end\n\n';

    // 3. Application Services Layer
    mermaid += '    subgraph SERVICES ["Application Services Layer"]\n';
    const serviceNodeIds = [];

    // Filter container services that are actual application backends (not gateway and not db)
    const backendServices = services.filter((s) => !s.isDatabase && s !== gatewayService);

    // Also extract domain business classes (e.g. AuthService, OrderService, PaymentService)
    const domainClasses = (safeCode.classes || [])
      .filter((c) => c && c.name && /Service|Controller|Manager|Worker/i.test(c.name))
      .slice(0, 4);

    // First backend service is the Core API; the rest are Other/Supporting APIs.
    // The detected HTTP endpoint count is annotated on the Core node so the
    // API surface is visible in HLD instead of hidden.
    const totalEndpoints = (safeCode.endpoints || []).length;
    const coreEpSuffix = totalEndpoints > 0 ? ` - ${totalEndpoints} Routes` : '';
    if (backendServices.length > 0) {
      backendServices.forEach((s, idx) => {
        const sId = `SVC_${(s.name || 'SVC').toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
        serviceNodeIds.push(sId);
        const portStr = (s.ports && s.ports[0]) ? ` - Port ${String(s.ports[0]).replace(/:/g, ' to ').replace(/[^A-Za-z0-9_ -]/g, '')}` : '';
        const cleanName = (s.name || 'Backend Service').toUpperCase().replace(/[^A-Z0-9_ -]/g, '');
        const role = idx === 0 ? 'Core Backend API' : 'Other API Service';
        const suffix = idx === 0 ? `${portStr}${coreEpSuffix}` : portStr;
        mermaid += `        ${sId}["${role} (${cleanName}${suffix})"]\n`;
      });
    } else {
      serviceNodeIds.push('SVC_BACKEND_API');
      mermaid += `        SVC_BACKEND_API["Core Backend API (Port 8000${coreEpSuffix})"]\n`;
    }

    const domainNodeIds = [];
    if (domainClasses.length > 0) {
      for (const cls of domainClasses) {
        const dId = `DOM_${cls.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
        domainNodeIds.push(dId);
        const prettyName = cls.name.replace(/([A-Z])/g, ' $1').replace(/[^a-zA-Z0-9_ ]/g, '').trim();
        mermaid += `        ${dId}["${prettyName}"]\n`;
      }
    }
    mermaid += '    end\n\n';

    // 4. Persistence & Storage Layer
    mermaid += '    subgraph DATA_LAYER ["Persistence and Storage Layer"]\n';
    // Dedupe by name: infra.databases mirrors compose services already flagged
    // isDatabase, so a naive concat would list every store twice.
    const dbServices = [];
    const seenDbNames = new Set();
    for (const s of [...services.filter((s) => s.isDatabase), ...extraDatabases]) {
      const dbKey = String(s.name || 'db').toLowerCase();
      if (!seenDbNames.has(dbKey)) {
        seenDbNames.add(dbKey);
        dbServices.push(s);
      }
    }
    const dbNodeIds = [];
    let cacheNodeId = null;

    const totalTables = (safeSchema.tables && safeSchema.tables.length) || 0;
    if (dbServices.length > 0) {
      let primaryLabeled = false;
      for (const db of dbServices) {
        const dbId = `DB_${(db.name || 'DB').toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`;
        const isCache = /redis|memcached/i.test(db.name || '') || /redis/i.test(db.image || '');
        if (isCache) {
          if (!cacheNodeId) {
            cacheNodeId = dbId;
            mermaid += `        ${dbId}[("Redis In-Memory Cache")]\n`;
          }
        } else {
          if (!dbNodeIds.includes(dbId)) {
            dbNodeIds.push(dbId);
            // Show the schema total once on the primary store so per-node
            // labels cannot be misread as per-database counts.
            const tableCountStr = !primaryLabeled && totalTables > 0 ? ` (${totalTables} Tables Total)` : '';
            primaryLabeled = true;
            const cleanDbName = (db.name || 'Primary Database').toUpperCase().replace(/[^A-Z0-9_ -]/g, '');
            mermaid += `        ${dbId}[("${cleanDbName}${tableCountStr}")]\n`;
          }
        }
      }
    }

    if (dbNodeIds.length === 0) {
      const tableCount = totalTables;
      const tableCountStr = tableCount > 0 ? ` (${tableCount} Tables Total)` : '';
      const firstTableDb = (safeSchema.tables && safeSchema.tables[0] && safeSchema.tables[0].databaseType) || 'Relational';
      const cleanEngine = String(firstTableDb).replace(/[^A-Za-z0-9]/g, '');
      const dbLabel = tableCount > 0 ? `${cleanEngine} Database${tableCountStr}` : 'Primary Database';
      mermaid += `        DB_PRIMARY[("${dbLabel}")]\n`;
      dbNodeIds.push('DB_PRIMARY');
    }
    if (!cacheNodeId) {
      mermaid += '        CACHE_REDIS[("Redis Cache and Store")]\n';
      cacheNodeId = 'CACHE_REDIS';
    }
    mermaid += '    end\n\n';

    // 5. Tiered Directed Flows
    mermaid += `    CLI_WEB --> ${gwNodeId}\n`;
    mermaid += `    CLI_MOBILE --> ${gwNodeId}\n`;
    mermaid += `    CLI_EXTERNAL --> ${gwNodeId}\n`;

    const primaryBackend = serviceNodeIds[0] || 'SVC_BACKEND_API';
    for (const sId of serviceNodeIds) {
      mermaid += `    ${gwNodeId} --> ${sId}\n`;
    }

    const primaryDb = dbNodeIds[0] || 'DB_PRIMARY';

    if (domainNodeIds.length > 0) {
      for (const dId of domainNodeIds) {
        mermaid += `    ${primaryBackend} --> ${dId}\n`;
        mermaid += `    ${dId} --> ${primaryDb}\n`;
      }
    } else {
      for (const sId of serviceNodeIds) {
        mermaid += `    ${sId} --> ${primaryDb}\n`;
      }
    }

    if (cacheNodeId) {
      mermaid += `    ${primaryBackend} -.-> ${cacheNodeId}\n`;
    }

    return {
      type: 'HLD',
      title: 'High-Level System Architecture (C4 Container View)',
      mermaid: mermaid.trim(),
      servicesCount: serviceNodeIds.length,
      coreService: backendServices[0]?.name || 'backend-api',
      otherServicesCount: Math.max(0, serviceNodeIds.length - 1),
      tablesCount: totalTables,
      endpointsCount: totalEndpoints
    };
  }

  static generateLLD(codeData, schemaData, extraData) {
    // Support flexible argument positions: (graph, schemaData) or (codeData, schemaData) or (graph, {}, schemaData)
    const hasSchemaTables = schemaData && Array.isArray(schemaData.tables) && schemaData.tables.length > 0;
    if (!hasSchemaTables && extraData && (extraData.tables || Array.isArray(extraData.tables))) {
      schemaData = extraData;
    }
    const safeCode = codeData || {};
    const safeSchema = schemaData || {};

    let mermaid = 'flowchart LR\n';

    // Show up to 12 nodes per tier (was 6, which silently hid APIs/tables
    // and made LLD counts disagree with the DeveloperView totals).
    const LLD_TIER_LIMIT = 12;
    let rawEndpoints = safeCode.endpoints || [];
    if (rawEndpoints.length === 0 && safeCode.apis && Array.isArray(safeCode.apis)) {
      rawEndpoints = safeCode.apis.map((a) => ({
        method: a.method || 'GET',
        path: a.endpoint || a.path || '/api/resource'
      }));
    }
    let endpoints = rawEndpoints.slice(0, LLD_TIER_LIMIT);

    let rawFunctions = safeCode.functions || [];
    if (rawFunctions.length === 0 && safeCode.apis && Array.isArray(safeCode.apis)) {
      rawFunctions = safeCode.apis
        .filter((a) => a.handler)
        .map((a) => ({ name: a.handler }));
    }
    let functions = rawFunctions
      .filter((fn) => fn && fn.name && !fn.name.startsWith('__'))
      .slice(0, LLD_TIER_LIMIT);

    const rawTables = safeSchema.tables || [];
    let tables = rawTables.slice(0, LLD_TIER_LIMIT);

    // Dynamic synthesis if endpoints or functions are empty but schema exists
    if (endpoints.length === 0 && tables.length > 0) {
      endpoints = tables.slice(0, 4).map((t, idx) => {
        const cleanName = (t.name || 'entity').toLowerCase().replace(/[^a-z0-9_]/g, '');
        return {
          method: idx % 2 === 0 ? 'GET' : 'POST',
          path: `/api/${cleanName}`
        };
      });
    }

    if (functions.length === 0 && tables.length > 0) {
      functions = tables.slice(0, 4).map((t) => {
        const baseName = (t.name || 'entity').replace(/[^a-zA-Z0-9_]/g, '_');
        const pascal = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        return {
          name: `${pascal}Service_handle`
        };
      });
    }

    // Default fallbacks if AST scan had no endpoints, functions, or tables
    const defaultEndpoints = [
      { method: 'GET', path: '/api/users' },
      { method: 'POST', path: '/api/orders' },
      { method: 'POST', path: '/api/checkout' }
    ];
    const defaultFunctions = [
      { name: 'UserService_authenticate' },
      { name: 'OrderService_processOrder' },
      { name: 'PaymentService_authorize' }
    ];
    const defaultTables = [
      { name: 'users' },
      { name: 'orders' },
      { name: 'payments' }
    ];

    const activeEndpoints = endpoints.length > 0 ? endpoints : defaultEndpoints;
    const activeFunctions = functions.length > 0 ? functions : defaultFunctions;
    const activeTables = tables.length > 0 ? tables : defaultTables;

    // 1. Controllers & Endpoints Subgraph (counts keep LLD honest vs totals)
    const epSuffix = rawEndpoints.length > endpoints.length
      ? ` (${endpoints.length} of ${rawEndpoints.length})`
      : (rawEndpoints.length > 0 ? ` (${rawEndpoints.length})` : '');
    mermaid += `    subgraph CONTROLLERS ["Controllers and API Endpoints${epSuffix}"]\n`;
    activeEndpoints.forEach((ep, idx) => {
      const cleanPath = (ep.path || '/')
        .replace(/["'\[\]`]/g, '')
        .replace(/\{([^}]+)\}/g, ':$1')
        .replace(/[<>]/g, '')
        .replace(/#/g, '')
        .replace(/&/g, 'and');
      const safeMethod = (ep.method || 'GET').toUpperCase().replace(/[^A-Z]/g, '');
      mermaid += `        EP_${idx}["${safeMethod} ${cleanPath}"]\n`;
    });
    mermaid += '    end\n\n';

    // 2. Services & Handlers Subgraph
    const fnSuffix = rawFunctions.length > functions.length
      ? ` (${functions.length} of ${rawFunctions.length})`
      : (rawFunctions.length > 0 ? ` (${rawFunctions.length})` : '');
    mermaid += `    subgraph SERVICES ["Services and Business Handlers${fnSuffix}"]\n`;
    activeFunctions.forEach((fn, idx) => {
      const cleanFn = (fn.name || 'handler').replace(/[^a-zA-Z0-9_]/g, '_');
      mermaid += `        FN_${idx}["${cleanFn}()"]\n`;
    });
    mermaid += '    end\n\n';

    // 3. Repositories & Data Models Subgraph
    const tbSuffix = rawTables.length > tables.length
      ? ` (${tables.length} of ${rawTables.length})`
      : (rawTables.length > 0 ? ` (${rawTables.length})` : '');
    mermaid += `    subgraph REPOSITORIES ["Data Models and Entities${tbSuffix}"]\n`;
    activeTables.forEach((t, idx) => {
      const cleanTb = (t.name || 'table').replace(/[^a-zA-Z0-9_]/g, '_');
      mermaid += `        TB_${idx}[("${cleanTb}")]\n`;
    });
    mermaid += '    end\n\n';

    // 4. Node-to-Node Intelligent Semantic Wiring
    for (let epIdx = 0; epIdx < activeEndpoints.length; epIdx++) {
      let matchedFnIdx = -1;
      const epPath = (activeEndpoints[epIdx].path || '').toLowerCase();
      const epTokens = epPath.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !['api', 'v1', 'v2', 'route'].includes(t));
      matchedFnIdx = activeFunctions.findIndex((fn) => {
        const fnLower = (fn.name || '').toLowerCase();
        return epTokens.some((tok) => fnLower.includes(tok));
      });
      if (matchedFnIdx === -1) {
        matchedFnIdx = epIdx % activeFunctions.length;
      }
      mermaid += `    EP_${epIdx} --> FN_${matchedFnIdx}\n`;
    }

    // Connect each function to its accurately related database table(s)
    for (let fnIdx = 0; fnIdx < activeFunctions.length; fnIdx++) {
      const fnName = (activeFunctions[fnIdx].name || '').toLowerCase();
      const matchedTbIndices = [];

      // Check specific semantic domains
      if (/auth|login|user|account|credential|jwt/i.test(fnName)) {
        const uIdx = activeTables.findIndex((t) => /user|account|profile/i.test(t.name || ''));
        if (uIdx !== -1) matchedTbIndices.push(uIdx);
      }
      if (/product|item|catalog|inventory|sku/i.test(fnName)) {
        const pIdx = activeTables.findIndex((t) => /product|item/i.test(t.name || ''));
        if (pIdx !== -1 && !matchedTbIndices.includes(pIdx)) matchedTbIndices.push(pIdx);
      }
      if (/order|checkout|cart/i.test(fnName)) {
        activeTables.forEach((t, tIdx) => {
          if (/order/i.test(t.name || '')) {
            matchedTbIndices.push(tIdx);
          }
        });
      }
      if (/payment|stripe|webhook|invoice|charge|bill/i.test(fnName)) {
        activeTables.forEach((t, tIdx) => {
          if (/payment|invoice|bill|txn/i.test(t.name || '')) {
            if (!matchedTbIndices.includes(tIdx)) matchedTbIndices.push(tIdx);
          }
        });
      }

      // If no semantic domain match, look for direct name match with tables
      if (matchedTbIndices.length === 0) {
        activeTables.forEach((t, tIdx) => {
          const tbName = (t.name || '').toLowerCase();
          const baseName = tbName.replace(/s$/, '');
          if (fnName.includes(tbName) || fnName.includes(baseName)) {
            matchedTbIndices.push(tIdx);
          }
        });
      }

      // Guaranteed fallback: connect to modulo table so every function has a repository target
      if (matchedTbIndices.length === 0) {
        matchedTbIndices.push(fnIdx % activeTables.length);
      }

      for (const tIdx of matchedTbIndices) {
        mermaid += `    FN_${fnIdx} --> TB_${tIdx}\n`;
      }
    }

    return {
      type: 'LLD',
      title: 'Low-Level Design: Component and Call Interaction Graph',
      mermaid: mermaid.trim(),
      endpointsCount: rawEndpoints.length,
      endpointsShown: activeEndpoints.length,
      functionsCount: rawFunctions.length,
      functionsShown: activeFunctions.length,
      tablesCount: rawTables.length,
      tablesShown: activeTables.length
    };
  }

  static generateSequence(endpointPath = '/api/checkout') {
    let mermaid = 'sequenceDiagram\n';
    mermaid += '    autonumber\n';
    mermaid += '    actor User as Client Browser\n';
    mermaid += '    participant Gateway as API Gateway\n';
    mermaid += '    participant Controller as OrderController\n';
    mermaid += '    participant Service as OrderService\n';
    mermaid += '    participant Payment as PaymentGateway\n';
    mermaid += '    participant DB as Database\n\n';

    mermaid += '    User->>Gateway: POST /api/checkout (Payload)\n';
    mermaid += '    Gateway->>Controller: Route Request + Auth Token\n';
    mermaid += '    Controller->>Service: processCheckout(cart, user)\n';
    mermaid += '    Service->>DB: Query User & Product Availability\n';
    mermaid += '    DB-->>Service: Stock & User Confirmed\n';
    mermaid += '    Service->>Payment: authorizeCharge(amount, card)\n';
    mermaid += '    Payment-->>Service: Payment Success (txn_id)\n';
    mermaid += '    Service->>DB: INSERT INTO orders & UPDATE stock\n';
    mermaid += '    DB-->>Service: Transaction Committed\n';
    mermaid += '    Service-->>Controller: Order Confirmation DTO\n';
    mermaid += '    Controller-->>User: 200 OK (Invoice JSON)\n';

    return {
      type: 'SEQUENCE',
      title: 'Execution Sequence Flow (Checkout & Billing Lifecycle)',
      mermaid: mermaid.trim()
    };
  }
}

module.exports = DiagramGenerator;
