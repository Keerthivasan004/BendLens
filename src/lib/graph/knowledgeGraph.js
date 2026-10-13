/**
 * Unified Knowledge Graph Engine
 * Connects Code, Database Schemas, API Endpoints, Infrastructure,
 * and Business Capabilities into a queryable directional network.
 */
class KnowledgeGraph {
  constructor() {
    this.nodes = new Map(); // id -> Node
    this.edges = []; // Array of Edge objects
    this.adjacency = new Map(); // id -> Set of target node ids
    this.reverseAdjacency = new Map(); // id -> Set of source node ids
  }

  addNode(node) {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, {
        id: node.id,
        name: node.name || node.id,
        type: node.type || 'unknown', // 'table', 'column', 'endpoint', 'class', 'function', 'service', 'domain'
        group: node.group || 'code', // 'database', 'api', 'service', 'business', 'code'
        metadata: node.metadata || {},
        label: node.label || node.name || node.id
      });
      this.adjacency.set(node.id, new Set());
      this.reverseAdjacency.set(node.id, new Set());
    }
    return this.nodes.get(node.id);
  }

  addEdge(edge) {
    if (!edge.source || !edge.target) return;

    // Ensure nodes exist
    if (!this.nodes.has(edge.source)) {
      this.addNode({ id: edge.source, name: edge.source, type: 'unknown' });
    }
    if (!this.nodes.has(edge.target)) {
      this.addNode({ id: edge.target, name: edge.target, type: 'unknown' });
    }

    const edgeObj = {
      source: edge.source,
      target: edge.target,
      type: edge.type || 'DEPENDS_ON', // 'CALLS', 'IMPORTS', 'FK_REFERENCES', 'READS_FROM', 'WRITES_TO', 'ROUTES_TO'
      label: edge.label || edge.type || 'CONNECTED_TO',
      weight: edge.weight || 1
    };

    this.edges.push(edgeObj);
    this.adjacency.get(edge.source).add(edge.target);
    this.reverseAdjacency.get(edge.target).add(edge.source);
  }

  /**
   * Build complete graph topology from parsed Schemas, Code AST, and Infra
   */
  build(schemaData = {}, codeData = {}, infraData = {}) {
    const { tables = [], relations = [] } = schemaData;
    const { endpoints = [], functions = [], classes = [], modules = [] } = codeData;
    const { services = [] } = infraData;

    // 1. Add Database Tables & Columns
    for (const table of tables) {
      this.addNode({
        id: `table:${table.name}`,
        name: table.name,
        type: 'table',
        group: 'database',
        metadata: { databaseType: table.databaseType, columnCount: table.columns?.length || 0 }
      });

      for (const col of table.columns || []) {
        const colId = `col:${table.name}.${col.name}`;
        this.addNode({
          id: colId,
          name: `${table.name}.${col.name}`,
          type: 'column',
          group: 'database',
          metadata: { colType: col.type, isPK: col.isPrimaryKey }
        });
        this.addEdge({
          source: `table:${table.name}`,
          target: colId,
          type: 'HAS_COLUMN'
        });
      }
    }

    // 2. Add Foreign Key Relationships
    for (const rel of relations) {
      this.addEdge({
        source: `table:${rel.sourceTable}`,
        target: `table:${rel.targetTable}`,
        type: 'FK_REFERENCES',
        label: `${rel.sourceColumn} -> ${rel.targetColumn}`
      });
    }

    // Precompute lowercase table tokens and linguistic variants for high-speed edge linking
    const tableLookup = tables.map((t) => {
      const lower = (t.name || '').toLowerCase();
      const singular = lower.endsWith('ies')
        ? lower.slice(0, -3) + 'y'
        : lower.endsWith('s')
        ? lower.slice(0, -1)
        : lower;
      const clean = lower.replace(/[^a-z0-9]/g, '');
      return {
        name: t.name,
        lower,
        singular,
        clean
      };
    });

    // 3. Add API Endpoints & Connect to Entities
    for (const ep of endpoints) {
      const epId = `endpoint:${ep.method}_${ep.path}`;
      const epPathLower = (ep.path || '').toLowerCase();
      const epModLower = (ep.module || '').toLowerCase();
      const cleanPath = epPathLower.replace(/[^a-z0-9]/g, '');

      // Identify connected database tables via route path tokens and module bindings
      const connectedTables = [];
      const seenTableNames = new Set();

      for (const t of tableLookup) {
        if (!t.lower) continue;
        const isPathMatch = (
          epPathLower.includes(t.lower) ||
          (t.singular.length >= 3 && epPathLower.includes(t.singular)) ||
          (t.clean.length >= 4 && cleanPath.includes(t.clean))
        );
        const isModMatch = (
          epModLower.includes(t.lower) ||
          (t.singular.length >= 3 && epModLower.includes(t.singular))
        );

        if ((isPathMatch || isModMatch) && !seenTableNames.has(t.name)) {
          seenTableNames.add(t.name);
          const isRead = ep.method === 'GET' || ep.method === 'OPTIONS' || ep.method === 'HEAD';
          const isStream = ep.method === 'WS';
          const action = isRead ? 'READ' : (isStream ? 'STREAM' : 'WRITE');
          const edgeType = isRead ? 'READS_FROM' : (isStream ? 'STREAMS_FROM' : 'WRITES_TO');

          this.addEdge({
            source: epId,
            target: `table:${t.name}`,
            type: edgeType,
            label: action
          });

          connectedTables.push({
            name: t.name,
            action,
            type: edgeType,
            isDirect: isPathMatch
          });
        }
      }

      ep.connectedTables = connectedTables;

      // Refine architectural level with real topological coupling
      if (connectedTables.length >= 2 && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(ep.method)) {
        ep.level = 'HIGH';
      } else if (connectedTables.length >= 3) {
        ep.level = 'HIGH';
      } else if (!ep.level) {
        ep.level = 'MEDIUM';
      }

      this.addNode({
        id: epId,
        name: `${ep.method} ${ep.path}`,
        type: 'endpoint',
        group: 'api',
        metadata: {
          method: ep.method,
          path: ep.path,
          module: ep.module,
          source: ep.source,
          kind: ep.kind || 'REST',
          level: ep.level || 'MEDIUM',
          connectedTables: ep.connectedTables
        }
      });
    }

    // 4. Add Code Functions & Classes
    // In large codebases, link functions related to tables and cap total graph functions to keep traversal instantaneous
    const MAX_GRAPH_FUNCTIONS = 500;
    let addedFnCount = 0;
    for (const fn of functions) {
      const fnNameLower = (fn.name || '').toLowerCase();
      const fnModLower = (fn.module || '').toLowerCase();
      let matchedTable = null;
      for (const t of tableLookup) {
        if (fnNameLower.includes(t.lower) || fnModLower.includes(t.lower)) {
          matchedTable = t.name;
          break;
        }
      }

      if (matchedTable || addedFnCount < 50) {
        const fnId = `function:${fn.module}:${fn.name}`;
        this.addNode({
          id: fnId,
          name: `${fn.name}()`,
          type: 'function',
          group: 'code',
          metadata: { module: fn.module, params: fn.params }
        });
        addedFnCount++;

        if (matchedTable) {
          this.addEdge({
            source: fnId,
            target: `table:${matchedTable}`,
            type: 'READS_FROM'
          });
        }
        if (addedFnCount >= MAX_GRAPH_FUNCTIONS) break;
      }
    }

    // 5. Add Infrastructure Services
    for (const svc of services) {
      const svcId = `service:${svc.name}`;
      this.addNode({
        id: svcId,
        name: svc.name,
        type: 'service',
        group: 'service',
        metadata: { image: svc.image, ports: svc.ports }
      });
    }

    return this;
  }

  /**
   * Traverse downstream & upstream to find everything impacted by modifying a node
   */
  getDownstreamImpact(startNodeId, maxDepth = 6) {
    // Normalize startNodeId (allow 'orders' or 'table:orders')
    let resolvedStartId = startNodeId;
    if (!this.nodes.has(resolvedStartId)) {
      if (this.nodes.has(`table:${startNodeId}`)) resolvedStartId = `table:${startNodeId}`;
      else if (this.nodes.has(`endpoint:${startNodeId}`)) resolvedStartId = `endpoint:${startNodeId}`;
    }

    const visited = new Set();
    const queue = [{ id: resolvedStartId, depth: 0, path: [resolvedStartId] }];
    const impactedNodes = [];
    const directCallers = [];
    const impactedEndpoints = [];
    const impactedTables = [];

    while (queue.length > 0) {
      const { id, depth, path } = queue.shift();
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      if (id !== resolvedStartId) {
        const node = this.nodes.get(id);
        if (node) {
          impactedNodes.push({ ...node, depth, path });
          if (node.type === 'endpoint') impactedEndpoints.push(node);
          if (node.type === 'table') impactedTables.push(node);
          if (depth === 1) directCallers.push(node);
        }
      }

      // Check reverse adjacency (callers/consumers)
      const dependents = this.reverseAdjacency.get(id) || new Set();
      for (const depId of dependents) {
        if (!visited.has(depId)) {
          queue.push({ id: depId, depth: depth + 1, path: [...path, depId] });
        }
      }

      // Check forward adjacency (cascades)
      const forwardNodes = this.adjacency.get(id) || new Set();
      for (const fwdId of forwardNodes) {
        if (!visited.has(fwdId)) {
          queue.push({ id: fwdId, depth: depth + 1, path: [...path, fwdId] });
        }
      }
    }

    // Calculate Risk Score (0 - 100)
    let riskScore = 0;
    riskScore += directCallers.length * 12;
    riskScore += impactedEndpoints.length * 20;
    riskScore += impactedTables.length * 15;
    riskScore += impactedNodes.length * 4;
    riskScore = Math.min(100, Math.max(15, riskScore));

    let riskLevel = 'LOW';
    if (riskScore >= 70) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MEDIUM';

    return {
      sourceNode: this.nodes.get(resolvedStartId) || { id: startNodeId, name: startNodeId, type: 'entity' },
      totalImpactedCount: impactedNodes.length,
      riskScore,
      riskLevel,
      impactedEndpoints,
      impactedTables,
      impactedNodes
    };
  }

  getStats() {
    let totalTables = 0;
    let totalEndpoints = 0;
    let totalFunctions = 0;

    for (const node of this.nodes.values()) {
      if (node.type === 'table') totalTables++;
      else if (node.type === 'endpoint') totalEndpoints++;
      else if (node.type === 'function') totalFunctions++;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      totalTables,
      totalEndpoints,
      totalFunctions
    };
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      stats: this.getStats()
    };
  }
}

module.exports = KnowledgeGraph;
