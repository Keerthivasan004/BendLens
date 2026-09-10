const { test, expect } = require('@playwright/test');

test.describe('BendLens Backend API Endpoints', () => {
  test('GET /api/sample should return pre-configured sample architecture payload', async ({ request }) => {
    const response = await request.get('/api/sample');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();

    // Verify key architecture data structures
    expect(data.data.projectName).toBeDefined();
    expect(data.data.diagrams).toBeDefined();
    expect(data.data.diagrams.erd).toBeDefined();
    expect(data.data.diagrams.hld).toBeDefined();
    expect(data.data.diagrams.lld).toBeDefined();
    expect(data.data.diagrams.sequence).toBeDefined();

    // Verify schema tables
    expect(Array.isArray(data.data.schema.tables)).toBe(true);
    expect(data.data.schema.tables.length).toBeGreaterThan(0);

    // Verify personas
    expect(data.data.personas).toBeDefined();
    expect(data.data.personas.developer).toBeDefined();
    expect(data.data.personas.manager).toBeDefined();
    expect(data.data.personas.business).toBeDefined();
  });

  test('GET /api/current should return active memory cache or sample fallback', async ({ request }) => {
    const response = await request.get('/api/current');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('POST /api/paste should parse SQL DDL schema into AST architecture model', async ({ request }) => {
    const sampleSql = `
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL
);

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id),
    sku VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 0
);
`;

    const response = await request.post('/api/paste', {
      data: {
        code: sampleSql,
        fileType: 'schema.sql',
        projectName: 'Playwright Inventory Project'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.projectName).toBe('Playwright Inventory Project');

    // Verify parsed tables
    const tableNames = data.data.schema.tables.map((t) => t.name.toLowerCase());
    expect(tableNames).toContain('warehouses');
    expect(tableNames).toContain('inventory');

    // Verify generated Mermaid ERD
    expect(data.data.diagrams.erd.mermaid).toContain('warehouses');
    expect(data.data.diagrams.erd.mermaid).toContain('inventory');
  });

  test('POST /api/paste should return 400 when code is empty', async ({ request }) => {
    const response = await request.post('/api/paste', {
      data: {
        code: '   '
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  test('GET /api/history should return array of scan history records', async ({ request }) => {
    const response = await request.get('/api/history');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('POST /api/impact should calculate blast radius and return risk assessment', async ({ request }) => {
    const response = await request.post('/api/impact', {
      data: {
        targetName: 'orders',
        targetType: 'table'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.blastRadius).toBeDefined();
    expect(typeof data.data.blastRadius.riskScore).toBe('number');
    expect(Array.isArray(data.data.blastRadius.impactedTables)).toBe(true);
    expect(data.data.blastRadius.impactedTables.length).toBeGreaterThan(0);
    expect(typeof data.data.blastRadius.impactedTables[0].impactPercentage).toBe('number');
  });

  test('POST /api/impact should calculate impact percentages for column_name modification', async ({ request }) => {
    const response = await request.post('/api/impact', {
      data: {
        targetName: 'orders',
        changeType: 'column_name',
        columnName: 'user_id',
        action: 'rename',
        newValue: 'customer_id'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.target.changeType).toBe('column_name');
    expect(data.data.target.columnName).toBe('user_id');

    // Verify impacted tables contain percentage
    const tables = data.data.blastRadius.impactedTables;
    expect(tables.length).toBeGreaterThan(0);
    for (const t of tables) {
      expect(typeof t.impactPercentage).toBe('number');
      expect(t.impactPercentage).toBeGreaterThanOrEqual(1);
      expect(t.impactPercentage).toBeLessThanOrEqual(100);
      expect(t.severity).toBeDefined();
    }

    // Verify impacted code
    const code = data.data.blastRadius.impactedCode;
    expect(code.length).toBeGreaterThan(0);
    for (const c of code) {
      expect(typeof c.impactPercentage).toBe('number');
      expect(c.impactPercentage).toBeGreaterThanOrEqual(1);
      expect(c.impactPercentage).toBeLessThanOrEqual(100);
    }
  });

  test('POST /api/impact should calculate impact percentages for key constraint modification', async ({ request }) => {
    const response = await request.post('/api/impact', {
      data: {
        targetName: 'orders',
        changeType: 'key',
        keyName: 'fk_order_user',
        action: 'drop'
      }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.target.changeType).toBe('key');
    expect(data.data.blastRadius.impactedTables.length).toBeGreaterThan(0);
    expect(data.data.blastRadius.impactedTables[0].impactPercentage).toBeGreaterThanOrEqual(80);
  });
});

