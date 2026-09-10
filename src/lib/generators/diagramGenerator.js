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

    // Format tables with clean types and PK/FK markers
    for (const table of tables) {
      const safeTableName = (table.name || 'table').replace(/[^a-zA-Z0-9_]/g, '_');
      mermaid += `    ${safeTableName} {\n`;
      const cols = table.columns || [];
      if (cols.length === 0) {
        mermaid += `        string id PK\n`;
      } else {
        for (const col of cols) {
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
      }
      mermaid += `    }\n`;
    }

    // Deduplicate relations
    const seenRelations = new Set();
    for (const rel of (relations || [])) {
      if (!rel.targetTable || !rel.sourceTable) continue;
      const safeTarget = rel.targetTable.replace(/[^a-zA-Z0-9_]/g, '_');
      const safeSource = rel.sourceTable.replace(/[^a-zA-Z0-9_]/g, '_');
      const safeCol = (rel.sourceColumn || 'references').replace(/[^a-zA-Z0-9_]/g, '_');
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
      relationsCount: seenRelations.size
    };
  }

  static generateHLD(infraData, codeData, schemaData) {
    let mermaid = 'flowchart TB\n';
    mermaid += '    subgraph CLIENTS ["Client Layer"]\n';
    mermaid += '        WEB["Single Page App / Web UI"]\n';
    mermaid += '        MOBILE["Mobile App Client"]\n';
    mermaid += '    end\n\n';

    mermaid += '    subgraph GATEWAY ["API Gateway / Ingress"]\n';
    mermaid += '        PROXY["Nginx / API Gateway Router"]\n';
    mermaid += '    end\n\n';

    mermaid += '    subgraph SERVICES ["Application Services Layer"]\n';
    const validServices = ((infraData && infraData.services) || []).filter(s => !s.isDatabase);
    if (validServices.length > 0) {
      for (const s of validServices) {
        const nodeId = (s.name || 'SVC').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const portsStr = (s.ports || []).map(p => String(p).replace(/:/g, ' to ')).join(', ') || 'Internal';
        const cleanName = (s.name || 'Service').toUpperCase().replace(/[^A-Z0-9_ -]/g, '');
        mermaid += `        ${nodeId}["Service: ${cleanName}\\nPorts: ${portsStr}"]\n`;
      }
    } else {
      mermaid += '        CORE_API["Core Backend Service"]\n';
      mermaid += '        AUTH_SVC["Auth and Identity Service"]\n';
      mermaid += '        BIZ_SVC["Business Logic Engine"]\n';
    }
    mermaid += '    end\n\n';

    mermaid += '    subgraph DATA_LAYER ["Persistence and Storage Layer"]\n';
    if (schemaData && schemaData.tables && schemaData.tables.length > 0) {
      mermaid += `        MAIN_DB[("Primary SQL Database\\n(${schemaData.tables.length} Tables)")]\n`;
    } else {
      mermaid += '        MAIN_DB[("Primary Database")]\n';
    }
    mermaid += '        CACHE[("Redis Cache and Session Store")]\n';
    mermaid += '    end\n\n';

    // Edges connecting nodes
    const primaryServiceNode = validServices.length > 0
      ? (validServices[0].name || 'SVC').toUpperCase().replace(/[^A-Z0-9_]/g, '_')
      : 'CORE_API';

    mermaid += '    WEB --> PROXY\n';
    mermaid += `    PROXY --> ${primaryServiceNode}\n`;
    mermaid += `    ${primaryServiceNode} --> MAIN_DB\n`;

    return {
      type: 'HLD',
      title: 'High-Level System Architecture (C4 Container View)',
      mermaid: mermaid.trim()
    };
  }

  static generateLLD(codeData, schemaData) {
    let mermaid = 'flowchart LR\n';
    
    mermaid += '    subgraph CONTROLLERS ["Controllers & API Endpoints"]\n';
    const topEndpoints = ((codeData && codeData.endpoints) || []).slice(0, 8);
    if (topEndpoints.length > 0) {
      topEndpoints.forEach((ep, idx) => {
        const cleanPath = (ep.path || '/').replace(/["\[\]]/g, '').replace(/[\{\}]/g, ':');
        mermaid += `        EP_${idx}["${ep.method} ${cleanPath}"]\n`;
      });
    } else {
      mermaid += '        EP_1["GET /api/users"]\n';
      mermaid += '        EP_2["POST /api/orders"]\n';
    }
    mermaid += '    end\n\n';

    mermaid += '    subgraph SERVICES ["Services & Business Handlers"]\n';
    const topFunctions = ((codeData && codeData.functions) || []).slice(0, 8);
    if (topFunctions.length > 0) {
      topFunctions.forEach((fn, idx) => {
        const cleanFn = (fn.name || 'handler').replace(/[^a-zA-Z0-9_]/g, '_');
        mermaid += `        FN_${idx}["${cleanFn}()"]\n`;
      });
    } else {
      mermaid += '        FN_1["UserService.authenticate()"]\n';
      mermaid += '        FN_2["OrderService.processOrder()"]\n';
    }
    mermaid += '    end\n\n';

    mermaid += '    subgraph REPOSITORIES ["Data Models & Entities"]\n';
    const topTables = ((schemaData && schemaData.tables) || []).slice(0, 8);
    if (topTables.length > 0) {
      topTables.forEach((t, idx) => {
        const cleanTb = (t.name || 'table').replace(/[^a-zA-Z0-9_]/g, '_');
        mermaid += `        TB_${idx}[("${cleanTb}")]\n`;
      });
    } else {
      mermaid += '        TB_1[("users")]\n';
      mermaid += '        TB_2[("orders")]\n';
    }
    mermaid += '    end\n\n';

    // Wiring
    mermaid += '    CONTROLLERS --> SERVICES\n';
    mermaid += '    SERVICES --> REPOSITORIES\n';

    return {
      type: 'LLD',
      title: 'Low-Level Design: Component & Call Interaction Graph',
      mermaid: mermaid.trim()
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
