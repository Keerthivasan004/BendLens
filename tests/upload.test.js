const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const ProjectAnalyzer = require('../src/lib/analyzer');

describe('ZIP Upload & Resilient Extraction Tests', () => {
  test('extracts and analyzes standard ZIP archive', () => {
    const zip = new AdmZip();
    zip.addFile('schema.sql', Buffer.from(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL
      );
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        content TEXT
      );
    `));
    zip.addFile('routes/api.py', Buffer.from(`
      from flask import Flask
      app = Flask(__name__)

      @app.route('/api/users', methods=['GET', 'POST'])
      def users():
          return []

      @app.route('/api/posts/<int:id>', methods=['GET'])
      def get_post(id):
          return {}
    `));

    const zipBuffer = zip.toBuffer();
    const tempDir = path.join(os.tmpdir(), `test_zip_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Test AdmZip extraction
    const unzipper = new AdmZip(zipBuffer);
    unzipper.extractAllTo(tempDir, true);

    const result = ProjectAnalyzer.analyze(tempDir);

    assert.ok(result);
    assert.equal(result.schema.tables.length, 2);
    assert.ok(result.code.endpoints.length >= 3); // GET /api/users, POST /api/users, GET /api/posts/<int:id>
    assert.ok(result.diagrams.erd);
    assert.ok(result.diagrams.hld);
    assert.ok(result.diagrams.lld);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('handles nested root folder with __MACOSX and .DS_Store metadata', () => {
    const zip = new AdmZip();
    // Simulate macOS archive structure
    zip.addFile('__MACOSX/._package.json', Buffer.from('Mac OS Resource Fork'));
    zip.addFile('__MACOSX/my-project/._schema.prisma', Buffer.from('Mac OS Resource Fork'));
    zip.addFile('my-project/.DS_Store', Buffer.from('Desktop Services Store'));
    zip.addFile('my-project/schema.prisma', Buffer.from(`
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      model Organization {
        id        String   @id @default(uuid())
        name      String
        slug      String   @unique
        members   Member[]
      }

      model Member {
        id        String       @id @default(uuid())
        email     String       @unique
        orgId     String
        org       Organization @relation(fields: [orgId], references: [id])
      }
    `));
    zip.addFile('my-project/server.js', Buffer.from(`
      const express = require('express');
      const app = express();

      app.get('/api/orgs', (req, res) => res.json([]));
      app.post('/api/orgs', (req, res) => res.json({}));
    `));

    const zipBuffer = zip.toBuffer();
    const tempDir = path.join(os.tmpdir(), `test_nested_mac_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const unzipper = new AdmZip(zipBuffer);
    unzipper.extractAllTo(tempDir, true);

    // Filter junk items and locate root
    const JUNK_NAMES = new Set(['__MACOSX', '.DS_Store', 'Thumbs.db', '.git']);
    let current = tempDir;
    for (let i = 0; i < 5; i++) {
      const items = fs.readdirSync(current).filter(item => !JUNK_NAMES.has(item) && !item.startsWith('._'));
      if (items.length === 1) {
        const candidate = path.join(current, items[0]);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          current = candidate;
          continue;
        }
      }
      break;
    }

    assert.equal(path.basename(current), 'my-project');

    const result = ProjectAnalyzer.analyze(current);
    assert.equal(result.schema.tables.length, 2);
    assert.equal(result.code.endpoints.length, 2);
    assert.ok(result.diagrams.erd);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('resilient entry extraction sanitizes invalid Windows characters and continues', () => {
    const zip = new AdmZip();
    zip.addFile('models/customer.py', Buffer.from(`
      class Customer(models.Model):
          name = models.CharField(max_length=100)
          email = models.EmailField(unique=True)
    `));
    // File with colon in name (invalid on Windows NTFS)
    zip.addFile('test:output.txt', Buffer.from('some test output'));

    const zipBuffer = zip.toBuffer();
    const tempDir = path.join(os.tmpdir(), `test_resilient_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Test resilient extraction logic
    const unzipper = new AdmZip(zipBuffer);
    const entries = unzipper.getEntries();
    for (const entry of entries) {
      try {
        const rawName = entry.entryName.replace(/\\/g, '/');
        const parts = rawName.split('/').filter(Boolean).map(p => p.replace(/[<>:"|?*]/g, '_').trim());
        if (parts.length === 0) continue;
        const resolved = path.join(tempDir, ...parts);
        if (entry.isDirectory || rawName.endsWith('/')) {
          fs.mkdirSync(resolved, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(resolved), { recursive: true });
          fs.writeFileSync(resolved, entry.getData());
        }
      } catch (err) {}
    }

    assert.ok(fs.existsSync(path.join(tempDir, 'models', 'customer.py')));
    assert.ok(fs.existsSync(path.join(tempDir, 'test_output.txt')));

    const result = ProjectAnalyzer.analyze(tempDir);
    assert.ok(result.schema.tables.length >= 1);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('handles uppercase .ZIP filename and extracts successfully', () => {
    const fileName = 'ENTERPRISE_CORE.ZIP';
    const isZip = fileName.toLowerCase().endsWith('.zip');
    assert.equal(isZip, true);

    const zip = new AdmZip();
    zip.addFile('db/schema.sql', Buffer.from(`
      CREATE TABLE accounts (
        id UUID PRIMARY KEY,
        balance NUMERIC(15, 2) NOT NULL
      );
    `));
    const zipBuffer = zip.toBuffer();

    const tempDir = path.join(os.tmpdir(), `test_upper_zip_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const unzipper = new AdmZip(zipBuffer);
    unzipper.extractAllTo(tempDir, true);

    const result = ProjectAnalyzer.analyze(tempDir);
    assert.equal(result.schema.tables.length, 1);
    assert.equal(result.schema.tables[0].name, 'accounts');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('extracts and parses Flask + MongoDB collections in Python codebase', () => {
    const zip = new AdmZip();
    zip.addFile('app.py', Buffer.from(`
      from flask import Flask, request, jsonify
      from pymongo import MongoClient

      app = Flask(__name__)
      client = MongoClient()
      db = client['ecommerce']
      users_col = db['users']
      orders_col = db['orders']

      @app.route('/api/checkout', methods=['POST'])
      def checkout():
          return jsonify({'status': 'ok'})
    `));

    const zipBuffer = zip.toBuffer();
    const tempDir = path.join(os.tmpdir(), `test_flask_mongo_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const unzipper = new AdmZip(zipBuffer);
    unzipper.extractAllTo(tempDir, true);

    const result = ProjectAnalyzer.analyze(tempDir);
    assert.ok(result.schema.tables.length >= 2, 'Should extract users and orders collections');
    assert.ok(result.code.endpoints.some(e => e.path === '/api/checkout' && e.method === 'POST'));
    assert.ok(result.diagrams.erd);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
