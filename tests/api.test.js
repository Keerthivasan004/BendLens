const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('BendLens API Endpoints (Native Fast Runner)', () => {
  test('GET /api/sample returns architecture data with all 4 diagrams', async () => {
    const res = await fetch(`${BASE_URL}/api/sample`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data);
    assert.ok(body.data.projectName);

    // Verify all 4 diagrams are generated
    assert.ok(body.data.diagrams.erd);
    assert.ok(body.data.diagrams.hld);
    assert.ok(body.data.diagrams.lld);
    assert.ok(body.data.diagrams.sequence);

    // Verify database schema tables
    assert.ok(Array.isArray(body.data.schema.tables));
    assert.ok(body.data.schema.tables.length > 0);

    // Verify persona insights
    assert.ok(body.data.personas.developer);
    assert.ok(body.data.personas.manager);
    assert.ok(body.data.personas.business);
  });

  test('GET /api/current returns current architecture cache', async () => {
    const res = await fetch(`${BASE_URL}/api/current`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data);
  });

  test('POST /api/paste parses SQL DDL into architecture AST model', async () => {
    const sampleSql = `
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    rating INT NOT NULL,
    comment TEXT
);
`;

    const res = await fetch(`${BASE_URL}/api/paste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: sampleSql,
        fileType: 'schema.sql',
        projectName: 'Fast Native Test Project'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.schema.tables.length >= 2);
    assert.ok(body.data.diagrams.erd);
    assert.ok(body.data.diagrams.hld);
  });

  test('GET /api/updates/check returns current version and update status', async () => {
    const res = await fetch(`${BASE_URL}/api/updates/check`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.currentVersion);
    assert.equal(typeof body.hasUpdate, 'boolean');
  });
});
