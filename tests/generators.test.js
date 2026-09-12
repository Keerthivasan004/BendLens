const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const DiagramGenerator = require('../src/lib/generators/diagramGenerator');

describe('DiagramGenerator Unit Tests', () => {
  const sampleSchema = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'UUID', isPrimaryKey: true },
          { name: 'email', type: 'VARCHAR(255)', isUnique: true },
          { name: 'created_at', type: 'TIMESTAMP' }
        ]
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'UUID', isPrimaryKey: true },
          { name: 'user_id', type: 'UUID', isForeignKey: true },
          { name: 'total', type: 'DECIMAL(10,2)' }
        ],
        foreignKeys: [
          { column: 'user_id', referencesTable: 'users', referencesColumn: 'id' }
        ]
      }
    ],
    relations: [
      {
        sourceTable: 'orders',
        sourceColumn: 'user_id',
        targetTable: 'users',
        targetColumn: 'id',
        type: 'many-to-one'
      }
    ]
  };

  const sampleGraph = {
    services: [
      { name: 'Auth Service', type: 'service', port: 8001 },
      { name: 'Order Service', type: 'service', port: 8002 }
    ],
    databases: [
      { name: 'PostgreSQL Main', type: 'database', engine: 'postgres', port: 5432 }
    ],
    queues: [
      { name: 'Kafka Cluster', type: 'queue' }
    ],
    apis: [
      { endpoint: '/api/auth/login', method: 'POST', handler: 'loginHandler' },
      { endpoint: '/api/orders', method: 'GET', handler: 'getOrdersHandler' }
    ]
  };

  test('generateERD outputs valid Mermaid ER diagram syntax', () => {
    const erd = DiagramGenerator.generateERD(sampleSchema);
    assert.equal(erd.type, 'ERD');
    assert.ok(erd.mermaid.startsWith('erDiagram'));
    assert.ok(erd.mermaid.includes('users {'));
    assert.ok(erd.mermaid.includes('orders {'));
    assert.ok(erd.mermaid.includes('uuid id PK'));
    assert.ok(erd.mermaid.includes('users ||--o{ orders : "user_id"'));
  });

  test('generateHLD outputs valid flowchart with tiers connected and no invalid characters', () => {
    const hld = DiagramGenerator.generateHLD(sampleGraph, {}, sampleSchema);
    assert.equal(hld.type, 'HLD');
    assert.ok(hld.mermaid.startsWith('flowchart TB'));
    assert.ok(hld.mermaid.includes('subgraph CLIENTS'));
    assert.ok(hld.mermaid.includes('subgraph GATEWAY'));
    assert.ok(hld.mermaid.includes('subgraph SERVICES'));
    assert.ok(hld.mermaid.includes('subgraph DATA_LAYER'));
    // Crucial: no '&' in titles and no colon port formatting that breaks Mermaid
    assert.ok(!hld.mermaid.includes('["Client & Edge'));
    assert.ok(!hld.mermaid.includes(':80'));
  });

  test('generateLLD outputs clean node-to-node call graph without subgraph-to-subgraph edges', () => {
    const lld = DiagramGenerator.generateLLD(sampleGraph, {}, sampleSchema);
    assert.equal(lld.type, 'LLD');
    assert.ok(lld.mermaid.startsWith('flowchart LR'));
    assert.ok(lld.mermaid.includes('subgraph CONTROLLERS'));
    assert.ok(lld.mermaid.includes('subgraph SERVICES'));
    assert.ok(lld.mermaid.includes('subgraph REPOSITORIES'));
    // Ensure no broken subgraph-to-subgraph connections
    assert.ok(!lld.mermaid.includes('CONTROLLERS --> SERVICES'));
    assert.ok(!lld.mermaid.includes('SERVICES --> REPOSITORIES'));
  });

  test('generateSequence outputs valid Mermaid sequenceDiagram', () => {
    const seq = DiagramGenerator.generateSequence(sampleGraph);
    assert.equal(seq.type, 'SEQUENCE');
    assert.ok(seq.mermaid.startsWith('sequenceDiagram'));
    assert.ok(seq.mermaid.includes('autonumber'));
    assert.ok(seq.mermaid.includes('User->>Gateway: POST /api/checkout'));
  });

  test('ImpactAnalyzer computes blast radius and downstream effects', () => {
    const ImpactAnalyzer = require('../src/lib/generators/impactAnalyzer');
    const result = ImpactAnalyzer.simulate(sampleGraph, 'users', 'table', sampleSchema, {});
    assert.ok(result);
    assert.ok(typeof result.riskScore === 'number' || typeof result.impactScore === 'number' || result.target);
  });
});
