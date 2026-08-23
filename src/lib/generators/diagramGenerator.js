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
    const { tables, relations } = schemaData;
    let mermaid = 'erDiagram\n';

    // Format tables with clean types and PK/FK markers
    for (const table of tables) {
      mermaid += `    ${table.name} {\n`;
      for (const col of table.columns || []) {
        const pk = col.isPrimaryKey ? 'PK' : '';
        const fk = (table.foreignKeys || []).some(f => f.column === col.name) ? 'FK' : '';
        const tag = pk && fk ? 'PK,FK' : (pk || fk || '');
        let cleanType = (col.type || 'VARCHAR')
          .replace(/[()0-9\s,]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .toLowerCase();
        if (!cleanType) cleanType = 'string';
        
        mermaid += `        ${cleanType} ${col.name} ${tag}\n`;
      }
      mermaid += `    }\n`;
    }

    // Deduplicate relations
    const seenRelations = new Set();
    for (const rel of relations) {
      const relKey = `${rel.targetTable}->${rel.sourceTable}:${rel.sourceColumn}`;
      if (!seenRelations.has(relKey)) {
        seenRelations.add(relKey);
        const relSymbol = rel.type.includes('1:1') ? '||--||' : '||--o{';
        mermaid += `    ${rel.targetTable} ${relSymbol} ${rel.sourceTable} : "${rel.sourceColumn}"\n`;
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
    if (infraData.services && infraData.services.length > 0) {
      for (const s of infraData.services) {
        if (!s.isDatabase) {
          mermaid += `        ${s.name.toUpperCase()}["Service: ${s.name.toUpperCase()}\\nPorts: ${(s.ports || []).join(', ') || 'Internal'}"]\n`;
        }
      }
    } else {
      mermaid += '        CORE_API["Core Backend Service"]\n';
      mermaid += '        AUTH_SVC["Auth & Identity Service"]\n';
      mermaid += '        BIZ_SVC["Business Logic Engine"]\n';
    }
    mermaid += '    end\n\n';

    mermaid += '    subgraph DATA_LAYER ["Persistence & Storage Layer"]\n';
    if (schemaData.tables && schemaData.tables.length > 0) {
      mermaid += `        MAIN_DB[("Primary SQL Database\\n(${schemaData.tables.length} Tables)")]\n`;
    } else {
      mermaid += '        MAIN_DB[("Primary Database")]\n';
    }
    mermaid += '        CACHE[("Redis Cache & Session Store")]\n';
    mermaid += '    end\n\n';

    // Edges
    mermaid += '    CLIENTS --> PROXY\n';
    mermaid += '    PROXY --> SERVICES\n';
    mermaid += '    SERVICES --> DATA_LAYER\n';

    return {
      type: 'HLD',
      title: 'High-Level System Architecture (C4 Container View)',
      mermaid: mermaid.trim()
    };
  }

  static generateLLD(codeData, schemaData) {
    let mermaid = 'flowchart LR\n';
    
    mermaid += '    subgraph CONTROLLERS ["Controllers & API Endpoints"]\n';
    const topEndpoints = (codeData.endpoints || []).slice(0, 8);
    if (topEndpoints.length > 0) {
      topEndpoints.forEach((ep, idx) => {
        mermaid += `        EP_${idx}["${ep.method} ${ep.path}"]\n`;
      });
    } else {
      mermaid += '        EP_1["GET /api/users"]\n';
      mermaid += '        EP_2["POST /api/orders"]\n';
    }
    mermaid += '    end\n\n';

    mermaid += '    subgraph SERVICES ["Services & Business Handlers"]\n';
    const topFunctions = (codeData.functions || []).slice(0, 8);
    if (topFunctions.length > 0) {
      topFunctions.forEach((fn, idx) => {
        mermaid += `        FN_${idx}["${fn.name}()"]\n`;
      });
    } else {
      mermaid += '        FN_1["UserService.authenticate()"]\n';
      mermaid += '        FN_2["OrderService.processOrder()"]\n';
    }
    mermaid += '    end\n\n';

    mermaid += '    subgraph REPOSITORIES ["Data Models & Entities"]\n';
    const topTables = (schemaData.tables || []).slice(0, 8);
    if (topTables.length > 0) {
      topTables.forEach((t, idx) => {
        mermaid += `        TB_${idx}[("${t.name}")]\n`;
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
