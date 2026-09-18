const fs = require('fs');
const path = require('path');

/**
 * Universal Polyglot Database & Data Model Parser
 * Supports:
 * - SQL Dialects: PostgreSQL, MySQL, MariaDB, SQLite, SQL Server (T-SQL), Oracle
 * - Direct SQLite files (.sqlite, .sqlite3, .db)
 * - ORMs: Prisma, TypeORM, Sequelize, Mongoose/MongoDB, Drizzle, Knex
 * - Python ORMs: SQLAlchemy, Django, Tortoise, SQLModel, Pydantic DTOs
 * - Java/C#/Go: Hibernate, JPA, Entity Framework, GORM
 * - Data Fixtures & Seeds: SQL INSERTs, JSON fixtures, CSV data files
 */
class SchemaParser {
  constructor() {
    this.tables = {};
    this.relations = [];
    this.sampleData = {}; // tableName -> array of sample row objects
    this._tableKeyIndex = {}; // lowercase name -> canonical key in this.tables
  }

  /**
   * Canonical key for a table name (case/underscore/plural-insensitive).
   * Prevents the same logical table (e.g. SQL `users` + Prisma `User`,
   * SQL `order_items` + Prisma `OrderItem`) from being counted twice in
   * table totals, ERD, HLD and persona views.
   */
  tableKey(name) {
    let key = String(name || 'table').toLowerCase().replace(/_/g, '');
    // Naive singularization so `users` and `User` share one key.
    if (key.endsWith('ies') && key.length > 4) {
      key = key.slice(0, -3) + 'y';
    } else if ((key.endsWith('ses') || key.endsWith('xes') || key.endsWith('zes') || key.endsWith('ches') || key.endsWith('shes')) && key.length > 4) {
      key = key.slice(0, -2);
    } else if (key.endsWith('s') && !key.endsWith('ss') && key.length > 2) {
      key = key.slice(0, -1);
    }
    return key;
  }

  findTableKey(name) {
    const key = this.tableKey(name);
    return this._tableKeyIndex[key] || null;
  }

  /**
   * Insert or merge a parsed table definition.
   * Same logical table from SQL + ORM / migrations / case variants is merged
   * (union of columns by name, union of foreign keys) instead of overwritten
   * or double-counted.
   */
  upsertTable(name, entry) {
    const key = this.tableKey(name);
    const existingKey = this._tableKeyIndex[key];
    if (!existingKey || !this.tables[existingKey]) {
      this.tables[name] = entry;
      this._tableKeyIndex[key] = name;
      return this.tables[name];
    }
    const existing = this.tables[existingKey];
    // Merge columns by lowercase name (existing def wins, missing flags filled)
    const colIndex = new Map((existing.columns || []).map((c) => [String(c.name || '').toLowerCase(), c]));
    for (const col of entry.columns || []) {
      const colKey = String(col.name || '').toLowerCase();
      if (!colIndex.has(colKey)) {
        existing.columns.push(col);
        colIndex.set(colKey, col);
      } else {
        const prev = colIndex.get(colKey);
        prev.isPrimaryKey = prev.isPrimaryKey || col.isPrimaryKey;
        prev.isNullable = prev.isNullable && col.isNullable;
        prev.isUnique = prev.isUnique || col.isUnique;
        if ((prev.defaultValue === null || prev.defaultValue === undefined) && col.defaultValue) {
          prev.defaultValue = col.defaultValue;
        }
        if ((!prev.sampleValue || prev.sampleValue === 'sample_val') && col.sampleValue) {
          prev.sampleValue = col.sampleValue;
        }
      }
    }
    // Merge foreign keys (dedupe by column:target:targetColumn)
    const fkSeen = new Set((existing.foreignKeys || []).map((f) =>
      `${String(f.column || '').toLowerCase()}:${String(f.targetTable || '').toLowerCase()}:${String(f.targetColumn || 'id').toLowerCase()}`));
    for (const fk of entry.foreignKeys || []) {
      const fkKey = `${String(fk.column || '').toLowerCase()}:${String(fk.targetTable || '').toLowerCase()}:${String(fk.targetColumn || 'id').toLowerCase()}`;
      if (!fkSeen.has(fkKey)) {
        fkSeen.add(fkKey);
        existing.foreignKeys.push(fk);
      }
    }
    if (!existing.primaryKey && entry.primaryKey) existing.primaryKey = entry.primaryKey;
    if (existing.sourceType && entry.sourceType && !existing.sourceType.includes(entry.sourceType)) {
      existing.sourceType = `${existing.sourceType} + ${entry.sourceType}`;
    }
    return existing;
  }

  splitClauses(body) {
    const clauses = [];
    let current = '';
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;

    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      const prev = body[i - 1];

      if (char === "'" && prev !== '\\' && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prev !== '\\' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote;
      } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick;
      } else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 0) {
          if (current.trim()) clauses.push(current.trim());
          current = '';
          continue;
        }
      }
      current += char;
    }
    if (current.trim()) clauses.push(current.trim());
    return clauses;
  }

  splitValues(str) {
    const values = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prev = str[i - 1];

      if (char === "'" && prev !== '\\' && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prev !== '\\' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      } else if (!inSingleQuote && !inDoubleQuote) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 0) {
          values.push(current.trim().replace(/^['"]|['"]$/g, ''));
          current = '';
          continue;
        }
      }
      current += char;
    }
    if (current.trim()) values.push(current.trim().replace(/^['"]|['"]$/g, ''));
    return values;
  }

  parseDirectory(dirPath, fileList) {
    // Cross-file data-flow state (reset per analysis run)
    this._root = dirPath;
    this._files = fileList || [];
    this._fileSet = new Set((fileList || []).map((f) => this.normKey(path.resolve(f))));
    this._xfile = new Map();
    this._ddlVarsByFile = new Map();
    this._rawVarsByFile = new Map();
    this._dictVarsByFile = new Map();
    for (const filePath of fileList) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        const baseName = path.basename(filePath).toLowerCase();

        // 1. Direct SQLite binary database files
        if (['.sqlite', '.sqlite3', '.db'].includes(ext)) {
          this.parseSqliteBinary(filePath);
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // 2. Prisma Schema
        if (ext === '.prisma' || baseName.endsWith('.prisma')) {
          this.parsePrisma(content, filePath);
        }
        // 3. SQL Files (Postgres, MySQL, SQLite, T-SQL, Oracle, DDLs, Migrations)
        else if (ext === '.sql' || ['.ddl', '.dump'].includes(ext) || baseName.endsWith('.sql')) {
          this.parseSQL(content, filePath);
          this.parseSQLInserts(content);
        }
        // 4. Python Models (SQLAlchemy, Django, Tortoise, SQLModel, Pydantic)
        // + code-defined tables (Alembic / Django migrations, Table(), embedded DDL)
        else if (ext === '.py') {
          this.parsePythonORM(content, filePath);
          this.parseCodeDefinedTables(content, filePath, ext);
          this.indexFileForCrossFile(content, filePath, ext);
        }
        // 5. JavaScript / TypeScript Models (TypeORM, Sequelize, Mongoose, Drizzle, Knex)
        // + code-defined tables (query builders, embedded DDL). Covers .jsx/.tsx too.
        else if (['.ts', '.js', '.jsx', '.tsx', '.mjs', '.cjs'].includes(ext)) {
          this.parseTypeScriptORM(content, filePath);
          this.parseCodeDefinedTables(content, filePath, ext);
          this.indexFileForCrossFile(content, filePath, ext);
        }
        // 5b. JVM / .NET / Go sources: every code file is scanned for DB table
        // definitions (JPA @Entity, EF DbSet, GORM structs, embedded CREATE
        // TABLE) so code-created tables reach the schema delivered to the client.
        else if (['.java', '.cs', '.go'].includes(ext)) {
          this.parseCodeDefinedTables(content, filePath, ext);
          this.indexFileForCrossFile(content, filePath, ext);
        }
        // 6. Data seeds and sample fixtures (JSON / CSV)
        else if (ext === '.json' && (baseName.includes('seed') || baseName.includes('fixture') || baseName.includes('mock'))) {
          this.parseJSONFixture(content, baseName);
        }
      } catch (err) {
        console.error(`Error parsing schema in ${filePath}:`, err.message);
      }
    }

    // Cross-file data-flow: DDL defined in one file, executed in another
    // (import/export resolution, barrels, static imports, packages)
    try { this.resolveCrossFileDDL(); } catch (err) {
      console.warn('Cross-file DDL resolution skipped:', err.message);
    }

    // EF Core Fluent API (modelBuilder.Entity) typed via the global class index
    try { this.resolveFluentAPI(); } catch (err) {
      console.warn('Fluent API resolution skipped:', err.message);
    }

    // Attach sample data to tables (case-insensitive lookup)
    for (const [tableName, rows] of Object.entries(this.sampleData)) {
      const existingKey = this.findTableKey(tableName);
      if (existingKey) {
        this.tables[existingKey].sampleRows = rows.slice(0, 5);
      }
    }

    // Generate fallback sample preview values for columns if none exist
    this.generateFallbackSampleValues();

    // Infer relations
    this.inferRelations();

    return {
      tables: Object.values(this.tables),
      relations: this.relations,
      stats: {
        totalTables: Object.keys(this.tables).length,
        totalRelations: this.relations.length,
        totalColumns: Object.values(this.tables).reduce((acc, t) => acc + t.columns.length, 0),
        databaseTypes: [...new Set(Object.values(this.tables).map(t => t.databaseType || 'SQL'))]
      }
    };
  }

  /**
   * Universal SQL Parser: Postgres, MySQL, SQLite, SQL Server, Oracle
   * Uses balanced-parenthesis depth matching to guarantee zero column truncation
   */
  parseSQL(content, filePath) {
    const cleanContent = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--.*$/gm, '')
      .replace(/#.*$/gm, '');

    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\(/gi;
    let match;

    while ((match = createTableRegex.exec(cleanContent)) !== null) {
      const tableName = match[1];
      const startIndex = createTableRegex.lastIndex;

      let depth = 1;
      let inSingleQuote = false;
      let inDoubleQuote = false;
      let inBacktick = false;
      let endIndex = -1;

      for (let i = startIndex; i < cleanContent.length; i++) {
        const char = cleanContent[i];
        const prev = cleanContent[i - 1];

        if (char === "'" && prev !== '\\' && !inDoubleQuote && !inBacktick) {
          inSingleQuote = !inSingleQuote;
        } else if (char === '"' && prev !== '\\' && !inSingleQuote && !inBacktick) {
          inDoubleQuote = !inDoubleQuote;
        } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
          inBacktick = !inBacktick;
        } else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
          if (char === '(') depth++;
          else if (char === ')') {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          }
        }
      }

      if (endIndex === -1) continue;
      const body = cleanContent.substring(startIndex, endIndex);
      createTableRegex.lastIndex = endIndex + 1;

      this.buildTableFromBody(tableName, body, filePath, 'SQL DDL / Schema');
    }

    // ALTER TABLE extensions from later migrations merge into the same tables
    this.parseAlterTables(cleanContent, filePath, 'SQL Migration (ALTER)', true);
  }

  /**
   * Shared single-column builder: type/modifier/default/REFERENCES parsing.
   * Returns { column, fk } (fk null when no inline reference).
   */
  buildColumnFromDef(colName, restOfClause) {
    const rest = String(restOfClause || '').trim();
    if (!rest) return null;
    // Extract type (including multi-word types like DOUBLE PRECISION, TIMESTAMP WITH TIME ZONE, DECIMAL(10, 2))
    const typeMatch = rest.match(/^((?:DOUBLE\s+PRECISION|TIMESTAMP(?:\s+WITH(?:OUT)?\s+TIME\s+ZONE)?|TIME(?:\s+WITH(?:OUT)?\s+TIME\s+ZONE)?|CHARACTER\s+VARYING|[a-zA-Z0-9_]+)(?:\s*\([^)]*\))?)\s*([\s\S]*)$/i);

    let colType = 'VARCHAR';
    let modifiers = '';
    if (typeMatch) {
      colType = typeMatch[1].trim();
      modifiers = typeMatch[2].trim();
    } else {
      const firstToken = rest.split(/\s+/)[0];
      colType = firstToken;
      modifiers = rest.substring(firstToken.length).trim();
    }

    const isPK = /PRIMARY\s+KEY|AUTO_INCREMENT|SERIAL|IDENTITY/i.test(modifiers) || /SERIAL/i.test(colType);
    const isNullable = !/NOT\s+NULL/i.test(modifiers);
    const isUnique = /UNIQUE/i.test(modifiers);

    // Default value detection
    let defaultValue = null;
    const defaultMatch = modifiers.match(/DEFAULT\s+('([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|([^\s,;]+))/i);
    if (defaultMatch) {
      defaultValue = defaultMatch[2] || defaultMatch[3] || defaultMatch[4] || null;
      if (defaultValue) defaultValue = defaultValue.trim();
    }

    // Inline REFERENCES
    let fk = null;
    const refMatch = modifiers.match(/REFERENCES\s+(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?(?:\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\))?/i);
    if (refMatch) {
      fk = {
        column: colName,
        targetTable: refMatch[1],
        targetColumn: refMatch[2] || 'id'
      };
    }

    return {
      column: {
        name: colName,
        type: colType.toUpperCase(),
        isPrimaryKey: isPK,
        isNullable,
        isUnique,
        defaultValue: defaultValue || (isPK ? 'AUTO' : null),
        sampleValue: defaultValue || this.generateDefaultValueForType(colName, colType),
        description: `${colName} (${colType})`
      },
      fk
    };
  }

  applyPrimaryKey(table, pkList) {
    const names = String(pkList || '').split(',').map((s) => s.trim().replace(/[`"\[\]]/g, '')).filter(Boolean);
    if (names.length === 0) return;
    for (const col of table.columns || []) {
      if (names.includes(col.name)) col.isPrimaryKey = true;
    }
    if (!table.primaryKey || table.primaryKey === 'id') table.primaryKey = names.join(', ');
  }

  /**
   * ALTER TABLE support: ADD [COLUMN] coldef, ADD CONSTRAINT ... PRIMARY KEY /
   * FOREIGN KEY. Merges into the existing table (or creates a minimal entry
   * when the CREATE was missed), so migration chains that extend tables are
   * reflected instead of silently dropped.
   */
  parseAlterTables(content, filePath, sourceType = 'SQL Migration (ALTER)', trust = false) {
    const alterRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?\s+/gi;
    let m;
    while ((m = alterRe.exec(content)) !== null) {
      if (/ZZZDYNZZZ/i.test(m[1])) continue;
      if (!this.embeddedTrust(content, filePath, m.index, trust)) continue;
      // Statement runs to the next top-level semicolon
      let depth = 0;
      let inS = false, inD = false, inB = false;
      let end = -1;
      for (let i = alterRe.lastIndex; i < content.length; i++) {
        const ch = content[i];
        const prev = content[i - 1];
        if (ch === "'" && prev !== '\\' && !inD && !inB) inS = !inS;
        else if (ch === '"' && prev !== '\\' && !inS && !inB) inD = !inD;
        else if (ch === '`' && !inS && !inD) inB = !inB;
        else if (!inS && !inD && !inB) {
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          else if (ch === ';' && depth === 0) { end = i; break; }
        }
      }
      if (end === -1) continue;
      const action = content.substring(alterRe.lastIndex, end);
      alterRe.lastIndex = end + 1;
      this.applyAlterAction(m[1], action, filePath, sourceType);
    }
  }

  applyAlterAction(tableName, action, filePath, sourceType) {
    const tableKey = this.findTableKey(tableName);
    const ensureTable = () => {
      if (tableKey && this.tables[tableKey]) return this.tables[tableKey];
      this.upsertTable(tableName, {
        name: tableName,
        databaseType: 'Relational SQL',
        sourceFile: filePath,
        sourceType,
        columns: [],
        foreignKeys: [],
        primaryKey: 'id',
        sampleRows: []
      });
      return this.tables[this.findTableKey(tableName)];
    };
    // Multiple ADDs may be comma-separated at top level
    const parts = this.splitClauses(action);
    for (const rawPart of parts) {
      const part = rawPart.replace(/[\r\n]+/g, ' ').trim();
      if (!part) continue;
      // ADD CONSTRAINT ... PRIMARY KEY (cols) / FOREIGN KEY (col) REFERENCES t(c)
      let cm = part.match(/^ADD\s+(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (cm) {
        this.applyPrimaryKey(ensureTable(), cm[1]);
        continue;
      }
      cm = part.match(/^ADD\s+(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?FOREIGN\s+KEY\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)\s*REFERENCES\s*(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?(?:\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\))?/i);
      if (cm) {
        const tbl = ensureTable();
        const fk = { column: cm[1], targetTable: cm[2], targetColumn: cm[3] || 'id' };
        if (!tbl.foreignKeys.some((f) => f.column.toLowerCase() === fk.column.toLowerCase() &&
            f.targetTable.toLowerCase() === fk.targetTable.toLowerCase())) {
          tbl.foreignKeys.push(fk);
        }
        continue;
      }
      // ADD [COLUMN] [IF NOT EXISTS] name typedef
      cm = part.match(/^ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s+(.+)$/i);
      if (cm) {
        if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|KEY|INDEX)\b/i.test(cm[1])) continue;
        const tbl = ensureTable();
        if (tbl.columns.some((c) => c.name.toLowerCase() === cm[1].toLowerCase())) continue;
        const built = this.buildColumnFromDef(cm[1], cm[2].trim());
        if (!built) continue;
        tbl.columns.push(built.column);
        if (built.fk) tbl.foreignKeys.push(built.fk);
      }
      // DROP / ALTER COLUMN / RENAME: intentionally not tracked
    }
  }

  /**
   * Shared CREATE TABLE body builder used by both .sql files and embedded
   * DDL found inside code (migrations written as raw SQL strings, seed
   * scripts, etc.). Parses columns, PK/FK constraints and dialect hints,
   * then merges via upsertTable so re-definitions never double-count.
   */
  buildTableFromBody(tableName, body, filePath, sourceType = 'SQL DDL / Schema') {
      const columns = [];
      const foreignKeys = [];
      let primaryKey = null;

      // Detect SQL Dialect hints
      let dbType = 'Relational SQL';
      if (/SERIAL|UUID|JSONB|TIMESTAMPTZ|bytea/i.test(body)) dbType = 'PostgreSQL';
      else if (/AUTO_INCREMENT|ENGINE=InnoDB|TINYINT/i.test(body)) dbType = 'MySQL / MariaDB';
      else if (/AUTOINCREMENT|WITHOUT\s+ROWID/i.test(body)) dbType = 'SQLite';
      else if (/IDENTITY\s*\(\s*1\s*,\s*1\s*\)|NVARCHAR|DATETIME2/i.test(body)) dbType = 'SQL Server (T-SQL)';
      else if (/NUMBER\s*\(|VARCHAR2/i.test(body)) dbType = 'Oracle';

      const clauses = this.splitClauses(body);

      for (const rawClause of clauses) {
        const clause = rawClause.replace(/[\r\n]+/g, ' ').trim();
        if (!clause) continue;

        // 1. PRIMARY KEY constraint
        const pkMatch = clause.match(/^(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?PRIMARY\s+KEY\s*(?:`|"|\[)?\s*\(([^)]+)\)/i);
        if (pkMatch) {
          primaryKey = pkMatch[1].replace(/[`"\[\]]/g, '').trim();
          continue;
        }

        // 2. FOREIGN KEY constraint
        const fkMatch = clause.match(/^(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?FOREIGN\s+KEY\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)\s*REFERENCES\s*(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?(?:\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\))?/i);
        if (fkMatch) {
          foreignKeys.push({
            column: fkMatch[1],
            targetTable: fkMatch[2],
            targetColumn: fkMatch[3] || 'id'
          });
          continue;
        }

        // 3. Skip table-level INDEX, KEY, UNIQUE, CHECK constraints
        if (/^(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?(?:UNIQUE|CHECK|KEY|INDEX)\s*\(/i.test(clause)) {
          continue;
        }

        // 4. Column definition
        const colMatch = clause.match(/^(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s+(.+)$/);
        if (colMatch) {
          const colName = colMatch[1];
          if (['KEY', 'INDEX', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(colName.toUpperCase())) {
            continue;
          }
          const built = this.buildColumnFromDef(colName, colMatch[2].trim());
          if (!built) continue;
          if (built.column.isPrimaryKey && !primaryKey) primaryKey = colName;
          if (built.fk) foreignKeys.push(built.fk);
          columns.push(built.column);
        }
      }

      if (primaryKey) {
        const pkNames = primaryKey.split(',').map(s => s.trim());
        columns.forEach(col => {
          if (pkNames.includes(col.name)) {
            col.isPrimaryKey = true;
          }
        });
      }

      const uniqueForeignKeys = Array.from(
        new Map(
          foreignKeys.map((foreignKey) => [
            `${foreignKey.column.toLowerCase()}:${foreignKey.targetTable.toLowerCase()}:${(foreignKey.targetColumn || 'id').toLowerCase()}`,
            foreignKey
          ])
        ).values()
      );

      this.upsertTable(tableName, {
        name: this.findTableKey(tableName) ? this.tables[this.findTableKey(tableName)].name : tableName,
        databaseType: dbType,
        sourceFile: filePath,
        sourceType,
        columns,
        foreignKeys: uniqueForeignKeys,
        primaryKey: primaryKey || (columns.find(c => c.isPrimaryKey)?.name || 'id'),
        sampleRows: []
      });
  }

  /**
   * True when an index sits inside a line comment (//, --, #), a /* *\/ block,
   * or a Python triple-quoted docstring — detector hits there are documentation
   * examples (e.g. JSDoc snippets), never real schema.
   */
  isInComment(content, index) {
    const lineStart = content.lastIndexOf('\n', index - 1) + 1;
    const prefix = content.substring(lineStart, index);
    const stripped = prefix
      .replace(/`[^`]*`/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/'[^']*'/g, '');
    if (/(^|\s)(\/\/|--|#)/.test(stripped)) return true;
    const openBlock = content.lastIndexOf('/*', index);
    const closeBlock = content.lastIndexOf('*/', index);
    if (openBlock !== -1 && openBlock > closeBlock) return true;
    // Python triple-quoted docstrings count as comments, but only when the
    // opener starts a logical line. `op.execute("""CREATE TABLE...""")` is a
    // string literal holding executable DDL and must still be scanned.
    if (this.isInTripleStringDoc(content, index, '"""')) return true;
    if (this.isInTripleStringDoc(content, index, "'''")) return true;
    return false;
  }

  isInTripleStringDoc(content, index, quote) {
    const before = content.substring(0, index);
    let count = 0;
    let lastPos = -1;
    let pos = -1;
    while ((pos = before.indexOf(quote, pos + 1)) !== -1) { count++; lastPos = pos; }
    if (count % 2 === 0 || lastPos === -1) return false;
    const lineStart = before.lastIndexOf('\n', lastPos - 1) + 1;
    return /^\s*$/.test(before.substring(lineStart, lastPos));
  }

  /**
   * Migration/seed-like paths whose inline SQL is executable schema rather
   * than demo content.
   */
  isMigrationLikePath(filePath) {
    return /migrat|seed|fixture|schema|ddl|init_?db|setup|changelog/i.test(filePath || '');
  }

  /**
   * Scan raw code text (JS/TS/Python/Java/Go/C# migration files, seed
   * scripts, query builders) for embedded CREATE TABLE statements.
   * Unlike parseSQL this does NO comment stripping (`--`/`#` stripping
   * would corrupt code such as `i--` or `#region`), it only locates the
   * CREATE TABLE keyword and extracts the balanced parenthesis body.
   *
   * Guards: skips documentation comments AND demo strings (e.g. paste-sample
   * buttons). A match is only trusted inside a migration-like file or when
   * passed directly to a query executor (raw/query/execute/...(` + string).
   */
  parseEmbeddedCreateTables(content, filePath, trust = false) {
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\(/gi;
    let match;

    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const startIndex = createTableRegex.lastIndex;

      let depth = 1;
      let inSingleQuote = false;
      let inDoubleQuote = false;
      let inBacktick = false;
      let endIndex = -1;

      for (let i = startIndex; i < content.length; i++) {
        const char = content[i];
        const prev = content[i - 1];

        if (char === "'" && prev !== '\\' && !inDoubleQuote && !inBacktick) {
          inSingleQuote = !inSingleQuote;
        } else if (char === '"' && prev !== '\\' && !inSingleQuote && !inBacktick) {
          inDoubleQuote = !inDoubleQuote;
        } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
          inBacktick = !inBacktick;
        } else if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
          if (char === '(') depth++;
          else if (char === ')') {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          }
        }
      }

      if (endIndex === -1) continue;
      const body = content.substring(startIndex, endIndex);
      createTableRegex.lastIndex = endIndex + 1;

      // Dynamic table names (string concatenation / interpolation the static
      // pass could not resolve) are never registered as phantom tables.
      if (/ZZZDYNZZZ/i.test(tableName)) continue;

      if (!this.embeddedTrust(content, filePath, match.index, trust)) continue;

      this.buildTableFromBody(tableName, body, filePath, 'Embedded SQL in Code');
    }

    // Same trust rules for ALTER TABLE in code (raw migration strings)
    this.parseAlterTables(content, filePath, 'Embedded SQL in Code (ALTER)', trust);
  }

  /**
   * Shared trust gate for DDL found inside code. Accepts migration-like
   * files and DDL handed straight to a query executor; rejects documentation
   * comments, demo strings and assigned-but-unexecuted variables (those are
   * decided by the data-flow pass). Pre-trusted (variable-resolved or .sql
   * file) content bypasses the gates.
   */
  embeddedTrust(content, filePath, matchIndex, trust) {
    if (trust) return true;
    if (this.isInComment(content, matchIndex)) return false;
    if (this.isAssignmentRHS(content, matchIndex)) return false;
    if (this.isMigrationLikePath(filePath)) return true;
    const context = content.slice(Math.max(0, matchIndex - 300), matchIndex);
    return /(\braw|\bquery|\bexecute|\bexec|\brun|\bsql)\w*\s*\(\s*[`'"]{1,3}\s*$/i.test(context);
  }

  /**
   * Extract one string literal starting at its opener. Handles '', "", ``,
   * triple-quoted Python strings and backslash escapes. Template `${...}` /
   * f-string `{...}` placeholders are kept raw for the caller to sentinelize.
   * Returns { value, endIndex } or null when unterminated.
   */
  extractStringLiteral(content, openIdx, opener) {
    let i = openIdx + opener.length;
    let value = '';
    const triple = opener === '"""' || opener === "'''";
    const singleLine = opener === '"' || opener === "'";
    while (i < content.length) {
      if (singleLine && content[i] === '\n') break;
      if (content[i] === '\\' && i + 1 < content.length) {
        value += content[i] + content[i + 1];
        i += 2;
        continue;
      }
      if (triple ? content.startsWith(opener, i) : content[i] === opener) {
        return { value, endIndex: i + opener.length - 1 };
      }
      value += content[i];
      i++;
    }
    return null;
  }

  /**
   * Skip whitespace plus line/block comments between operands.
   */
  skipTrivia(content, pos) {
    let p = pos;
    for (let guard = 0; guard < 50; guard++) {
      while (p < content.length && /\s/.test(content[p])) p++;
      if (content.startsWith('//', p)) {
        const nl = content.indexOf('\n', p);
        p = nl === -1 ? content.length : nl + 1;
        continue;
      }
      if (content[p] === '#') {
        const nl = content.indexOf('\n', p);
        p = nl === -1 ? content.length : nl + 1;
        continue;
      }
      if (content.startsWith('/*', p)) {
        const end = content.indexOf('*/', p + 2);
        p = end === -1 ? content.length : end + 2;
        continue;
      }
      break;
    }
    return p;
  }

  /**
   * Parse one `operand (+ operand)*` chain: string literals (adjacent ones
   * count as Python-style implicit concat), identifiers, single-level
   * parenthesized groups. Stops at `;`, `,`, `)` or any non-operand token.
   */
  parseOperandChain(content, pos) {
    const tokens = [];
    let p = pos;
    let justSawPlus = false;
    for (let guard = 0; guard < 60; guard++) {
      p = this.skipTrivia(content, p);
      const ch = content[p];
      if (ch === undefined) break;
      if (ch === '+' && tokens.length > 0) {
        p++;
        justSawPlus = true;
        continue;
      }
      if (ch === '(' && tokens.length === 0) {
        const bal = this.extractBalanced(content, p, '(', ')');
        if (!bal) break;
        const inner = this.parseOperandChain(bal.body, 0);
        tokens.push(...inner.tokens);
        p = bal.endIndex + 1;
        justSawPlus = false;
        continue;
      }
      const qm = content.slice(p, p + 5).match(/^(f\s*)?("""|'''|`|["'])/);
      if (qm) {
        const opener = qm[2];
        const lit = this.extractStringLiteral(content, p + qm[0].length - opener.length, opener);
        if (!lit) break;
        tokens.push({ lit: lit.value, isF: !!qm[1] });
        p = lit.endIndex + 1;
        justSawPlus = false;
        continue;
      }
      if (justSawPlus || tokens.length === 0) {
        const idM = content.slice(p, p + 64).match(/^([A-Za-z_$][\w$]*)/);
        if (idM) {
          tokens.push({ id: idM[1] });
          p += idM[1].length;
          justSawPlus = false;
          continue;
        }
      }
      break;
    }
    p = this.skipTrivia(content, p);
    const formatCall = /^\.format\s*\(/.test(content.slice(p, p + 9));
    return { tokens, endPos: p, formatCall };
  }

  /**
   * True when a CREATE TABLE match sits inside an assignment RHS
   * (`x = "CREATE TABLE..."`). Those are decided by the data-flow pass
   * (only registered if the variable reaches an executor), so the
   * blanket migration-file trust must not claim them.
   */
  isAssignmentRHS(content, idx) {
    const seg = content.slice(Math.max(0, idx - 300), idx);
    return /([A-Za-z_$][\w$]*)\s*=\s*(?:\(\s*)?(?:f\s*)?(?:"""|'''|`|["'])\s*$/.test(seg);
  }

  /**
   * Intra-file data-flow for DDL strings. Collects `var = <string expr>`
   * assignments (plain, `+`-concatenated, implicit-concat, interpolated,
   * triple-quoted, parenthesized) and resolves identifiers through the same
   * file's literal assignments (fixpoint). Returns Map(varName ->
   * resolvedText) for entries whose text contains CREATE TABLE. Anything
   * still dynamic becomes the ZZ sentinel.
   */
  collectRawVars(content) {
    const allVars = new Map(); // name -> { tokens, formatCall }
    const assignRe = /([A-Za-z_$][\w$]*)\s*=\s*/g;
    let m;
    while ((m = assignRe.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      // Skip operators masquerading as assignments (==, =>, <=, +=, ...)
      let b = m.index - 1;
      while (b >= 0 && /\s/.test(content[b])) b--;
      if (/[=!<>+\-*/%&|?:]/.test(content[b] || '')) continue;
      const chain = this.parseOperandChain(content, m.index + m[0].length);
      if (!chain || chain.tokens.length === 0) continue;
      allVars.set(m[1], { tokens: chain.tokens, formatCall: chain.formatCall });
      assignRe.lastIndex = chain.endPos;
    }
    return allVars;
  }

  renderVarTokens(allVars, tokens) {
    const SENTINEL = 'ZZZDYNZZZ';
    const render = (toks, seen) => toks.map((t) => {
      if (t.lit !== undefined) {
        let s = t.lit;
        if (t.isF) s = s.replace(/\{[^}]*\}/g, SENTINEL);
        return s;
      }
      if (seen.has(t.id)) return SENTINEL;
      const target = allVars.get(t.id);
      if (!target) return SENTINEL;
      seen.add(t.id);
      return render(target.tokens, seen);
    }).join('');
    return render(tokens, new Set());
  }

  finalizeResolvedText(text, formatCall) {
    const SENTINEL = 'ZZZDYNZZZ';
    if (formatCall) text = text.replace(/\{[^}]*\}/g, SENTINEL);
    // Backtick ${...} interpolations are dynamic by definition
    return text.replace(/\$\{[^}]*\}/g, SENTINEL);
  }

  collectDDLVariables(content) {
    let allVars;
    try {
      allVars = this.collectRawVars(content);
    } catch { return new Map(); }
    return this.resolveVarMap(allVars);
  }

  resolveVarMap(allVars) {
    const resolved = new Map();
    for (const [name, entry] of allVars) {
      let text;
      try {
        text = this.finalizeResolvedText(this.renderVarTokens(allVars, entry.tokens), entry.formatCall);
      } catch { continue; }
      if (/CREATE\s+TABLE/i.test(text) || /ALTER\s+TABLE/i.test(text)) resolved.set(name, text);
    }
    return resolved;
  }

  /**
   * Dicts/objects of queries: `QUERIES = { users: 'CREATE TABLE ...', ... }`
   * or Python `QUERIES = { 'audits': """CREATE TABLE ...""" }`.
   * Returns Map(dictName -> Map(key -> resolvedText)) for entries holding DDL.
   */
  collectDictDDLVars(content, rawVars) {
    const dicts = new Map();
    const re = /([A-Za-z_$][\w$]*)\s*=\s*\{/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      let b = m.index - 1;
      while (b >= 0 && /\s/.test(content[b])) b--;
      if (/[=!<>+\-*/%&|?:]/.test(content[b] || '')) continue;
      const braceIdx = content.indexOf('{', m.index);
      const bal = this.extractBalanced(content, braceIdx, '{', '}');
      if (!bal || bal.body.length > 50000) continue;
      const scope = rawVars || new Map();
      const entries = new Map();
      for (const part of this.splitTopLevel(bal.body)) {
        const km = part.match(/^\s*['"]?([A-Za-z0-9_]+)['"]?\s*:\s*([\s\S]+)$/);
        if (!km) continue;
        const sub = this.parseOperandChain(km[2], 0);
        if (!sub.tokens.length) continue;
        let text;
        try {
          text = this.finalizeResolvedText(this.renderVarTokens(scope, sub.tokens), sub.formatCall);
        } catch { continue; }
        if (/CREATE\s+TABLE/i.test(text) || /ALTER\s+TABLE/i.test(text)) entries.set(km[1], text);
      }
      if (entries.size > 0) dicts.set(m[1], entries);
      re.lastIndex = bal.endIndex + 1;
    }
    return dicts;
  }

  /**
   * Second half of the data-flow: match `executor(variable)` calls
   * (query/execute/raw/run/...) against collected DDL variables and parse
   * the resolved text as schema. This catches DDL assigned to a variable
   * and executed elsewhere in the same file. Matches are safe by
   * construction: an executor hit only fires when the variable provably
   * holds CREATE TABLE text.
   */
  parseVariableExecutedDDL(content, filePath) {
    let rawVars;
    let resolved;
    try {
      rawVars = this.collectRawVars(content);
      resolved = this.resolveVarMap(rawVars);
    } catch { return; }
    // Stash for the cross-file pass (avoids recompute in the indexer)
    if (!this._ddlVarsByFile) this._ddlVarsByFile = new Map();
    if (!this._rawVarsByFile) this._rawVarsByFile = new Map();
    if (!this._dictVarsByFile) this._dictVarsByFile = new Map();
    this._ddlVarsByFile.set(filePath, resolved);
    this._rawVarsByFile.set(filePath, rawVars);
    let dictVars = new Map();
    try {
      dictVars = this.collectDictDDLVars(content, rawVars);
    } catch {}
    this._dictVarsByFile.set(filePath, dictVars);
    if ((!resolved || resolved.size === 0) && dictVars.size === 0) return;
    // Bare identifiers: db.query(ddl)
    const execRe = /(\braw|\bquery|\bexecute|\bexec|\brun|\bsql)\w*\s*\(\s*([A-Za-z_$][\w$]*)\s*[,)]/gi;
    let m;
    while ((m = execRe.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const text = resolved.get(m[2]);
      if (!text) continue;
      try { this.parseEmbeddedCreateTables(text, filePath, true); } catch {}
    }
    // In-file dict/member forms: db.query(QUERIES.users), cur.execute(Q['a'])
    const memberRe = /(\braw|\bquery|\bexecute|\bexec|\brun|\bsql)\w*\s*\(\s*([A-Za-z_$][\w$]*\s*(?:(?:\.\s*[A-Za-z_$][\w$]*|\s*\[\s*['"][^'"]+['"]\s*\])\s*){1,2})[,)]/gi;
    while ((m = memberRe.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const text = this.resolveInFileMember(dictVars, m[2]);
      if (!text) continue;
      try { this.parseEmbeddedCreateTables(text, filePath, true); } catch {}
    }
  }

  splitMemberAccess(expr) {
    // Splits `A.B['k'].c` into base + accessor values (identifiers or keys)
    const parts = [];
    const baseM = String(expr || '').match(/^\s*([A-Za-z_$][\w$]*)/);
    if (!baseM) return null;
    parts.push(baseM[1]);
    const rest = String(expr).slice(baseM[0].length);
    const accRe = /\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*['"]([^'"]+)['"]\s*\])/g;
    let am;
    let consumed = 0;
    while ((am = accRe.exec(rest)) !== null) {
      if (am.index !== consumed) return null;
      parts.push(am[1] !== undefined ? am[1] : am[2]);
      consumed = am.index + am[0].length;
    }
    if (consumed !== rest.trimEnd().length && rest.trim().length > 0) {
      // Trailing residue (e.g. whitespace only is fine)
      if (!/^\s*$/.test(rest.slice(consumed))) return null;
    }
    return parts.length > 1 ? parts : null;
  }

  resolveInFileMember(dictVars, expr) {
    try {
      const parts = this.splitMemberAccess(expr);
      if (!parts || parts.length !== 2) return null;
      const dict = (dictVars || new Map()).get(parts[0]);
      if (!dict) return null;
      return dict.get(parts[1]) || null;
    } catch { return null; }
  }

  /**
   * Per-file cross-file index: exports, imports and declared type names.
   * Runs once per code file during parseDirectory; the driver
   * (resolveCrossFileDDL) consumes it after all files are scanned.
   */
  indexFileForCrossFile(content, filePath, ext) {
    try {
      if (!this._xfile) this._xfile = new Map();
      if (!this._ddlVarsByFile) this._ddlVarsByFile = new Map();
      if (!this._rawVarsByFile) this._rawVarsByFile = new Map();
      if (!this._dictVarsByFile) this._dictVarsByFile = new Map();
      const imports = this.parseFileImports(content, filePath, ext);
      this._xfile.set(filePath, {
        ext,
        exports: this.collectFileExports(content, filePath, ext),
        imports,
        declared: this.collectDeclaredTypes(content, ext),
        hasExecutorCall: /(\braw|\bquery|\bexecute|\bexec|\brun|\bsql)\w*\s*\(/i.test(content),
        hasMemberExecutor: /(\braw|\bquery|\bexecute|\bexec|\brun|\bsql)\w*\s*\(\s*[A-Za-z_$][\w$]*\s*(?:\.\s*[A-Za-z_$][\w$]*|\s*\[\s*['"])/i.test(content)
      });
    } catch {}
  }

  collectFileExports(content, filePath, ext) {
    const out = { named: new Map(), reExports: [], star: [], default: null, all: false };
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
      let m;
      const declRe = /export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g;
      while ((m = declRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        out.named.set(m[1], m[1]);
      }
      const braceRe = /export\s*\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/g;
      while ((m = braceRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
        for (const n of names) {
          const am = n.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
          if (!am) continue;
          if (m[2]) out.reExports.push({ names: new Map([[am[2] || am[1], am[1]]]), path: m[2], star: false });
          else out.named.set(am[2] || am[1], am[1]);
        }
      }
      const starRe = /export\s*\*\s+from\s*['"]([^'"]+)['"]/g;
      while ((m = starRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        out.star.push(m[1]);
      }
      const defRe = /export\s+default\s+([A-Za-z_$][\w$]*)/g;
      while ((m = defRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        if (!out.default) out.default = m[1];
      }
      const cjsObjRe = /module\.exports\s*=\s*\{([^}]*)\}/g;
      while ((m = cjsObjRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        for (const part of m[1].split(',')) {
          const pm = part.trim().match(/^(?:\.\.\.)?([A-Za-z_$][\w$]*)(?:\s*:\s*([A-Za-z_$][\w$]*))?$/);
          if (!pm || pm[0].startsWith('...')) continue;
          out.named.set(pm[1], pm[2] || pm[1]);
        }
      }
      const cjsReqRe = /module\.exports\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((m = cjsReqRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        out.star.push(m[1]);
      }
      const expAssignRe = /exports\.([A-Za-z_$][\w$]*)\s*=\s*(?:([A-Za-z_$][\w$]*)\s*;)?/g;
      while ((m = expAssignRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        out.named.set(m[1], m[2] || m[1]);
      }
    } else if (ext === '.py' || ext === '.java' || ext === '.go' || ext === '.cs') {
      // Module/class/package visibility: any collected DDL var is addressable
      out.all = true;
    }
    return out;
  }

  parseFileImports(content, filePath, ext) {
    const out = { named: new Map(), namespace: new Map(), default: new Map(), starImports: [], staticConsts: new Map(), classImports: new Map(), hasAny: false };
    const touch = () => { out.hasAny = true; };
    let m;
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
      const namedRe = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
      while ((m = namedRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        touch();
        for (const n of m[1].split(',')) {
          const am = n.trim().match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
          if (am) out.named.set(am[2] || am[1], { path: m[2], imported: am[1] });
        }
      }
      const mixedRe = /import\s+([A-Za-z_$][\w$]*)\s*,\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
      while ((m = mixedRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        touch();
        out.default.set(m[1], { path: m[3] });
        for (const n of m[2].split(',')) {
          const am = n.trim().match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
          if (am) out.named.set(am[2] || am[1], { path: m[3], imported: am[1] });
        }
      }
      const defOnlyRe = /import\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
      while ((m = defOnlyRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        touch();
        if (!out.default.has(m[1])) out.default.set(m[1], { path: m[2] });
      }
      const nsRe = /import\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
      while ((m = nsRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        touch();
        out.namespace.set(m[1], { path: m[2] });
      }
      const reqDestRe = /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((m = reqDestRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        touch();
        for (const n of m[1].split(',')) {
          const am = n.trim().match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([A-Za-z_$][\w$]*))?$/);
          if (am) out.named.set(am[2] || am[1], { path: m[2], imported: am[1] });
        }
      }
      const reqNsRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((m = reqNsRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        touch();
        if (!out.namespace.has(m[1])) out.namespace.set(m[1], { path: m[2] });
      }
    } else if (ext === '.py') {
      const fromRe = /from\s+([.\w]+)\s+import\s+([^\n#]+)/g;
      while ((m = fromRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        const mod = m[1].trim();
        const names = m[2].replace(/[()]/g, ' ').split(',').map((s) => s.trim()).filter(Boolean);
        for (const n of names) {
          if (n === '*') {
            touch();
            out.starImports.push({ path: mod });
            continue;
          }
          const am = n.match(/^([A-Za-z_][\w]*)(?:\s+as\s+([A-Za-z_][\w]*))?$/);
          if (am) {
            touch();
            out.named.set(am[2] || am[1], { path: mod, imported: am[1] });
          }
        }
      }
      const impRe = /^\s*import\s+([.\w]+)(?:\s+as\s+([A-Za-z_][\w]*))?/gm;
      while ((m = impRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        touch();
        const mod = m[1].trim();
        const alias = m[2] || mod.split('.').pop();
        out.namespace.set(alias, { path: mod });
      }
    } else if (ext === '.java') {
      const stRe = /import\s+static\s+([\w.]+)\.([A-Za-z_$][\w$]*)\s*;/g;
      while ((m = stRe.exec(content)) !== null) {
        touch();
        out.staticConsts.set(m[2], { cls: m[1].split('.').pop(), fq: m[1] });
      }
      const clRe = /import\s+([\w.]+)\s*;/g;
      while ((m = clRe.exec(content)) !== null) {
        if (/^import\s+static/.test(m[0])) continue;
        touch();
        const parts = m[1].split('.');
        out.classImports.set(parts[parts.length - 1], { fq: m[1] });
      }
    } else if (ext === '.go') {
      const blockRe = /import\s*\(\s*([\s\S]*?)\s*\)/;
      const bm = content.match(blockRe);
      const entries = [];
      if (bm) {
        for (const line of bm[1].split('\n')) {
          const lm = line.trim().match(/^(?:([A-Za-z_.][\w.]*)\s+)?"([^"]+)"/);
          if (lm) entries.push({ alias: lm[1], path: lm[2] });
        }
      } else {
        const sm = content.match(/import\s+(?:([A-Za-z_.][\w.]*)\s+)?"([^"]+)"/);
        if (sm) entries.push({ alias: sm[1], path: sm[2] });
      }
      for (const e of entries) {
        if (e.alias === '_') continue;
        touch();
        const base = e.path.split('/').pop();
        out.namespace.set(e.alias || base, { path: e.path, pkg: base });
      }
    } else if (ext === '.cs') {
      const stRe = /using\s+static\s+([\w.]+)\s*;/g;
      while ((m = stRe.exec(content)) !== null) {
        touch();
        out.staticConsts.set('__cls:' + m[1].split('.').pop(), { cls: m[1].split('.').pop(), fq: m[1] });
      }
      const uRe = /using\s+([\w.]+)\s*;/g;
      while ((m = uRe.exec(content)) !== null) {
        if (m[0].includes(' static ')) continue;
        touch();
      }
    }
    return out;
  }

  collectDeclaredTypes(content, ext) {
    const out = { classes: [], pkg: null };
    try {
      if (ext === '.java' || ext === '.cs') {
        const re = /(?:^|[}\s;])(?:public|protected|private|internal)?\s*(?:sealed\s+|abstract\s+|static\s+|final\s+|partial\s+)?(?:class|interface|enum)\s+([A-Za-z_][\w]*)/g;
        let m;
        while ((m = re.exec(content)) !== null) out.classes.push(m[1]);
      } else if (ext === '.go') {
        const pm = content.match(/^\s*package\s+(\w+)/m);
        if (pm) out.pkg = pm[1];
      }
    } catch {}
    return out;
  }

  /**
   * Braces-aware top-level comma splitter for JS object bodies, Drizzle
   * definitions, Alembic arg lists, etc. Tracks (), {}, [] and quotes.
   */
  splitTopLevel(str, delim = ',') {
    const parts = [];
    let current = '';
    let depthParen = 0, depthBrace = 0, depthBracket = 0;
    let inSingle = false, inDouble = false, inBacktick = false;
    const src = str || '';
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      const prev = src[i - 1];
      if (ch === "'" && prev !== '\\' && !inDouble && !inBacktick) inSingle = !inSingle;
      else if (ch === '"' && prev !== '\\' && !inSingle && !inBacktick) inDouble = !inDouble;
      else if (ch === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;
      else if (!inSingle && !inDouble && !inBacktick) {
        if (ch === '(') depthParen++;
        else if (ch === ')') depthParen--;
        else if (ch === '{') depthBrace++;
        else if (ch === '}') depthBrace--;
        else if (ch === '[') depthBracket++;
        else if (ch === ']') depthBracket--;
        else if (ch === delim && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
          if (current.trim()) parts.push(current.trim());
          current = '';
          continue;
        }
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  /**
   * Extract a balanced bracket body starting at the opening char index.
   * Returns { body, endIndex } or null when unbalanced.
   */
  extractBalanced(content, openIdx, openCh, closeCh) {
    if (openIdx === -1 || content[openIdx] !== openCh) return null;
    let depth = 0;
    let inSingle = false, inDouble = false, inBacktick = false;
    for (let i = openIdx; i < content.length; i++) {
      const ch = content[i];
      const prev = content[i - 1];
      if (ch === "'" && prev !== '\\' && !inDouble && !inBacktick) inSingle = !inSingle;
      else if (ch === '"' && prev !== '\\' && !inSingle && !inBacktick) inDouble = !inDouble;
      else if (ch === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;
      else if (!inSingle && !inDouble && !inBacktick) {
        if (ch === openCh) depth++;
        else if (ch === closeCh) {
          depth--;
          if (depth === 0) return { body: content.substring(openIdx + 1, i), endIndex: i };
        }
      }
    }
    return null;
  }

  /**
   * Column factory for code-discovered tables (Knex, Drizzle, migrations,
   * JPA entities, EF models, GORM structs, ...).
   */
  makeCodeColumn(name, type, opts = {}) {
    const colType = String(type || 'VARCHAR').toUpperCase();
    const isPrimaryKey = !!opts.isPrimaryKey;
    const defaultValue = opts.defaultValue !== undefined ? opts.defaultValue : (isPrimaryKey ? 'AUTO' : null);
    return {
      name,
      type: colType,
      isPrimaryKey,
      isNullable: opts.isNullable !== undefined ? !!opts.isNullable : !isPrimaryKey,
      isUnique: !!opts.isUnique,
      defaultValue,
      sampleValue: defaultValue || this.generateDefaultValueForType(name, colType),
      description: opts.description || `${name} (${colType}) [${opts.source || 'code'}]`
    };
  }

  registerCodeTable(tableName, columns, foreignKeys, filePath, sourceType, databaseType = 'Code-Defined Model') {
    if (!tableName || !columns || columns.length === 0) return;
    // Dedupe FKs (e.g. Alembic inline ForeignKey + explicit ForeignKeyConstraint)
    const seenFk = new Set();
    const uniqueFks = (foreignKeys || []).filter((f) => {
      const key = `${String(f.column || '').toLowerCase()}:${String(f.targetTable || '').toLowerCase()}:${String(f.targetColumn || 'id').toLowerCase()}`;
      if (seenFk.has(key)) return false;
      seenFk.add(key);
      return true;
    });
    this.upsertTable(tableName, {
      name: this.findTableKey(tableName) ? this.tables[this.findTableKey(tableName)].name : tableName,
      databaseType,
      sourceFile: filePath,
      sourceType,
      columns,
      foreignKeys: uniqueFks,
      primaryKey: columns.find((c) => c.isPrimaryKey)?.name || 'id',
      sampleRows: []
    });
  }

  /**
   * Resolve an FK target reference to a real table name when one exists,
   * tolerating case/plural/underscore differences (Django `auth.User`,
   * C# `Customer` vs table `customers`) so relations point at real tables.
   */
  resolveTableRef(name) {
    const lower = String(name || '').toLowerCase();
    const keys = Object.keys(this.tables);
    return keys.find((t) => t.toLowerCase() === lower)
      || keys.find((t) => this.tableKey(t) === this.tableKey(name))
      || name;
  }

  /**
   * Dispatcher: every code file is scanned for DB table definitions so
   * tables created in code (migrations, query builders, ORM models,
   * entities) land in the schema architecture delivered to the client.
   */
  parseCodeDefinedTables(content, filePath, ext) {
    try { this.parseEmbeddedCreateTables(content, filePath); } catch {}
    // Data-flow pass: DDL assigned to a variable and executed elsewhere
    // (const ddl = "CREATE TABLE ..."; db.query(ddl)) — all code dialects.
    try { this.parseVariableExecutedDDL(content, filePath); } catch {}
    try {
      if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
        this.parseKnexTables(content, filePath);
        this.parseSequelizeTables(content, filePath);
        this.parseDrizzleTables(content, filePath);
        this.parseMongooseModels(content, filePath);
        this.parseEntitySchemaTables(content, filePath);
      } else if (ext === '.py') {
        this.parsePythonCodeTables(content, filePath);
      } else if (ext === '.java') {
        this.parseJavaEntities(content, filePath);
      } else if (ext === '.cs') {
        this.parseCSharpTables(content, filePath);
      } else if (ext === '.go') {
        this.parseGoStructs(content, filePath);
      }
    } catch (err) {
      console.warn(`Code table scan skipped in ${filePath}:`, err.message);
    }
  }

  /**
   * Knex migrations: knex.schema.createTable('name', (t) => {
   *   t.increments('id'); t.string('email'); t.integer('user_id').references('users.id');
   * })
   */
  parseKnexTables(content, filePath) {
    const typeMap = { increments: 'INTEGER', bigincrements: 'BIGINT', string: 'VARCHAR(255)', text: 'TEXT', integer: 'INTEGER', biginteger: 'BIGINT', float: 'FLOAT', decimal: 'DECIMAL(10,2)', boolean: 'BOOLEAN', datetime: 'TIMESTAMP', timestamp: 'TIMESTAMP', date: 'DATE', time: 'TIME', json: 'JSON', jsonb: 'JSON', uuid: 'UUID', binary: 'BLOB' };
    const re = /\.createTable(?:IfNotExists)?\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const tableName = m[1];
      const extracted = this.extractBalanced(content, content.indexOf('(', m.index), '(', ')');
      if (!extracted) continue;
      const columns = [];
      const fks = [];
      const colRe = /\.\s*(increments|bigIncrements|string|text|integer|bigInteger|float|decimal|boolean|dateTime|date|timestamp|time|json|jsonb|uuid|binary)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`](?:\s*,[^)]*)?\)((?:\s*\.\s*[a-zA-Z0-9_]+\s*(?:\([^)]*\))?)*)/gi;
      let cm;
      while ((cm = colRe.exec(extracted.body)) !== null) {
        const colName = cm[2];
        const colType = typeMap[cm[1].toLowerCase()] || 'VARCHAR';
        const chain = cm[3] || '';
        const isPK = /increments/i.test(cm[1]) || /\.primary\s*\(/i.test(chain);
        const refMatch = chain.match(/\.references\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/i);
        if (refMatch) {
          const ref = refMatch[1];
          if (ref.includes('.')) {
            const [t, c] = ref.split('.');
            fks.push({ column: colName, targetTable: t, targetColumn: c || 'id' });
          } else {
            const inTable = chain.match(/\.inTable\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)/i);
            fks.push({ column: colName, targetTable: inTable ? inTable[1] : ref, targetColumn: 'id' });
          }
        }
        const defM = chain.match(/\.defaultTo\s*\(\s*([^)]+?)\)/i);
        columns.push(this.makeCodeColumn(colName, colType, {
          isPrimaryKey: isPK,
          isNullable: !/\.notNullable\s*\(/i.test(chain),
          isUnique: /\.unique\s*\(/i.test(chain),
          defaultValue: defM ? defM[1].trim().replace(/^['"]|['"]$/g, '') : (isPK ? 'AUTO' : null),
          source: 'Knex migration'
        }));
      }
      this.registerCodeTable(tableName, columns, fks, filePath, 'Knex Migration', 'Knex Query Builder');
    }
  }

  /**
   * Sequelize: sequelize.define('Name', { col: { type, allowNull, ... } })
   * and Model.init({ ... }) / X.init({ ... }).
   */
  parseSequelizeTables(content, filePath) {
    const typeMap = { STRING: 'VARCHAR(255)', CHAR: 'VARCHAR(255)', TEXT: 'TEXT', INTEGER: 'INTEGER', BIGINT: 'BIGINT', SMALLINT: 'SMALLINT', FLOAT: 'FLOAT', DOUBLE: 'DOUBLE', DECIMAL: 'DECIMAL(10,2)', BOOLEAN: 'BOOLEAN', DATE: 'TIMESTAMP', DATEONLY: 'DATE', TIME: 'TIME', UUID: 'UUID', JSON: 'JSON', JSONB: 'JSON', BLOB: 'BLOB', ENUM: 'VARCHAR(50)' };
    const defs = [];
    let m;
    const defineRe = /\.define\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*,\s*\{/gi;
    while ((m = defineRe.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const ex = this.extractBalanced(content, content.indexOf('{', m.index), '{', '}');
      if (ex) defs.push({ table: m[1], body: ex.body, kind: 'Sequelize Model' });
    }
    const initRe = /([A-Za-z0-9_]+)\.init\s*\(\s*\{/g;
    while ((m = initRe.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      if (/^(if|for|while|switch|catch)$/.test(m[1])) continue;
      const ex = this.extractBalanced(content, content.indexOf('{', m.index), '{', '}');
      if (ex) defs.push({ table: m[1], body: ex.body, kind: 'Sequelize Model' });
    }
    for (const def of defs) {
      const columns = [];
      const fks = [];
      for (const part of this.splitTopLevel(def.body)) {
        const nameM = part.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*([\s\S]+)$/);
        if (!nameM) continue;
        const colName = nameM[1];
        const spec = nameM[2].trim();
        if (/^(timestamps|paranoid|tableName|modelName|sequelize|underscored|freezeTableName|indexes)$/i.test(colName)) continue;
        let typeRaw = 'STRING';
        let flags = spec;
        if (spec.startsWith('{')) {
          const tM = spec.match(/type\s*:\s*(?:DataTypes\.)?([A-Za-z0-9_]+)/);
          if (tM) typeRaw = tM[1];
        } else {
          const sM = spec.match(/^(?:DataTypes\.)?([A-Za-z0-9_]+)/);
          if (sM) typeRaw = sM[1];
          flags = '';
        }
        const isPK = /primaryKey\s*:\s*true/i.test(flags);
        const refM = flags.match(/references\s*:\s*\{([^}]*)\}/i);
        if (refM) {
          const modelM = refM[1].match(/model\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/i);
          const keyM = refM[1].match(/key\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/i);
          if (modelM) fks.push({ column: colName, targetTable: modelM[1], targetColumn: keyM ? keyM[1] : 'id' });
        }
        const defM = flags.match(/defaultValue\s*:\s*([^,}]+)/i);
        columns.push(this.makeCodeColumn(colName, typeMap[typeRaw.toUpperCase()] || 'VARCHAR', {
          isPrimaryKey: isPK,
          isNullable: !/allowNull\s*:\s*false/i.test(flags),
          isUnique: /unique\s*:\s*true/i.test(flags),
          defaultValue: defM ? defM[1].trim().replace(/^['"]|['"]$/g, '') : (isPK ? 'AUTO' : null),
          source: def.kind
        }));
      }
      this.registerCodeTable(def.table, columns, fks, filePath, def.kind, 'Sequelize ORM');
    }
  }

  /**
   * Drizzle: pgTable / mysqlTable / sqliteTable('name', { id: serial('id').primaryKey(), ... })
   */
  parseDrizzleTables(content, filePath) {
    const typeMap = { serial: 'SERIAL', bigserial: 'BIGSERIAL', integer: 'INTEGER', int: 'INTEGER', bigint: 'BIGINT', smallint: 'SMALLINT', varchar: 'VARCHAR(255)', char: 'VARCHAR(255)', text: 'TEXT', boolean: 'BOOLEAN', timestamp: 'TIMESTAMP', date: 'DATE', time: 'TIME', numeric: 'DECIMAL(10,2)', decimal: 'DECIMAL(10,2)', real: 'FLOAT', doubleprecision: 'DOUBLE', json: 'JSON', jsonb: 'JSON', uuid: 'UUID', blob: 'BLOB' };
    const re = /(pgTable|mysqlTable|sqliteTable)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*,/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const tableName = m[2];
      const ex = this.extractBalanced(content, content.indexOf('(', m.index), '(', ')');
      if (!ex) continue;
      const braceIdx = ex.body.indexOf('{');
      if (braceIdx === -1) continue;
      const objEx = this.extractBalanced(ex.body, braceIdx, '{', '}');
      if (!objEx) continue;
      const columns = [];
      const fks = [];
      for (const part of this.splitTopLevel(objEx.body)) {
        const pm = part.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\s*\(\s*(?:['"`]([a-zA-Z0-9_]+)['"`]\s*,?)?([\s\S]*)$/);
        if (!pm || !typeMap[pm[2].toLowerCase()]) continue;
        const colName = pm[3] || pm[1];
        const rest = pm[4] || '';
        const refM = rest.match(/\.references\s*\(\s*\(\s*\)\s*=>\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
        if (refM) fks.push({ column: colName, targetTable: refM[1], targetColumn: refM[2] });
        const defM = rest.match(/\.default\s*\(\s*([^)]+?)\)/);
        const isPK = /\.primaryKey\s*\(/i.test(rest) || /^(serial|bigserial)$/i.test(pm[2]);
        columns.push(this.makeCodeColumn(colName, typeMap[pm[2].toLowerCase()], {
          isPrimaryKey: isPK,
          isNullable: !/\.notNull\s*\(/i.test(rest),
          isUnique: /\.unique\s*\(/i.test(rest),
          defaultValue: defM ? defM[1].trim().replace(/^['"]|['"]$/g, '') : (isPK ? 'AUTO' : null),
          source: 'Drizzle ORM'
        }));
      }
      this.registerCodeTable(tableName, columns, fks, filePath, 'Drizzle ORM', 'Drizzle ORM');
    }
  }

  /**
   * Mongoose: mongoose.model('Name', SchemaVar) — links a model name to an
   * already-parsed schema so `User` and `users` never double-count.
   */
  parseMongooseModels(content, filePath) {
    const re = /(?:mongoose\.)?model\s*\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*,\s*([A-Za-z0-9_]+)/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const modelName = m[1];
      const schemaVar = m[2];
      if (this.findTableKey(modelName)) continue;
      const schemaKey = Object.keys(this.tables).find((k) => {
        const t = this.tables[k];
        return t.modelName === schemaVar ||
          k.toLowerCase() === schemaVar.toLowerCase() ||
          k.toLowerCase() === schemaVar.replace(/Schema$/i, '').toLowerCase();
      });
      if (schemaKey) {
        const src = this.tables[schemaKey];
        this.registerCodeTable(
          modelName,
          (src.columns || []).map((c) => ({ ...c })),
          (src.foreignKeys || []).map((f) => ({ ...f })),
          filePath,
          'Mongoose Model',
          src.databaseType
        );
      }
    }
  }

  /**
   * TypeORM EntitySchema: new EntitySchema({ name: 'x', columns: { id: { type: 'int', primary: true } } })
   */
  parseEntitySchemaTables(content, filePath) {
    const re = /new\s+EntitySchema(?:<[^>]*>)?\s*\(\s*\{/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const ex = this.extractBalanced(content, content.indexOf('{', m.index), '{', '}');
      if (!ex) continue;
      const nameM = ex.body.match(/name\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/i);
      if (!nameM) continue;
      const colsM = ex.body.match(/columns\s*:\s*\{/i);
      if (!colsM) continue;
      const colEx = this.extractBalanced(ex.body, ex.body.indexOf('{', colsM.index), '{', '}');
      if (!colEx) continue;
      const columns = [];
      for (const part of this.splitTopLevel(colEx.body)) {
        const pm = part.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*\{([\s\S]*)\}\s*$/);
        if (!pm) continue;
        const typeM = pm[2].match(/type\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/i);
        const isPK = /primary\s*:\s*true/i.test(pm[2]);
        columns.push(this.makeCodeColumn(pm[1], typeM ? typeM[1] : 'VARCHAR', {
          isPrimaryKey: isPK,
          isNullable: isPK ? false : !/nullable\s*:\s*false/i.test(pm[2]),
          isUnique: /unique\s*:\s*true/i.test(pm[2]),
          source: 'TypeORM EntitySchema'
        }));
      }
      this.registerCodeTable(nameM[1], columns, [], filePath, 'TypeORM EntitySchema', 'TypeORM Entity');
    }
  }

  /**
   * Python code tables: Alembic op.create_table, SQLAlchemy Table(), and
   * Django migrations.CreateModel — the three ways tables get created in
   * Python code outside class-based models.
   */
  parsePythonCodeTables(content, filePath) {
    const saTypeMap = { Integer: 'INTEGER', BigInteger: 'BIGINT', SmallInteger: 'SMALLINT', String: 'VARCHAR(255)', Text: 'TEXT', Unicode: 'VARCHAR(255)', Boolean: 'BOOLEAN', Float: 'FLOAT', Numeric: 'DECIMAL(10,2)', DECIMAL: 'DECIMAL(10,2)', DateTime: 'TIMESTAMP', Date: 'DATE', Time: 'TIME', JSON: 'JSON', UUID: 'UUID', LargeBinary: 'BLOB', Enum: 'VARCHAR(50)' };
    // 1. op.create_table('x', sa.Column(...)) / Table('x', metadata, Column(...))
    const createRe = /(?:op\.create_table|Table)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
    let m;
    while ((m = createRe.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const tableName = m[1];
      const ex = this.extractBalanced(content, content.indexOf('(', m.index), '(', ')');
      if (!ex) continue;
      const columns = [];
      const fks = [];
      for (const part of this.splitTopLevel(ex.body)) {
        const cm = part.match(/(?:sa\.)?Column\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*,?\s*([\s\S]*)$/i);
        if (cm) {
          const colName = cm[1];
          const rest = cm[2] || '';
          const tM = rest.match(/(?:sa\.)?([A-Za-z0-9_]+)\s*(?:\([^)]*\))?/);
          const colType = (tM && saTypeMap[tM[1]]) ? saTypeMap[tM[1]] : 'VARCHAR';
          const fkM = rest.match(/(?:sa\.)?ForeignKey\s*\(\s*['"`]([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)['"`]/i);
          if (fkM) fks.push({ column: colName, targetTable: fkM[1], targetColumn: fkM[2] });
          const defM = rest.match(/(?:server_default|default)\s*=\s*([^,)]+)/i);
          const isPK = /primary_key\s*=\s*True/i.test(rest);
          columns.push(this.makeCodeColumn(colName, colType, {
            isPrimaryKey: isPK,
            isNullable: !/nullable\s*=\s*False/i.test(rest),
            isUnique: /unique\s*=\s*True/i.test(rest),
            defaultValue: defM ? defM[1].trim().replace(/^['"]|['"]$/g, '') : (isPK ? 'AUTO' : null),
            source: 'Alembic / SQLAlchemy migration'
          }));
          continue;
        }
        const fkM = part.match(/(?:sa\.)?ForeignKeyConstraint\s*\(\s*\[([^\]]*)\]\s*,\s*\[([^\]]*)\]/i);
        if (fkM) {
          const cols = fkM[1].match(/['"`]([a-zA-Z0-9_]+)['"`]/g) || [];
          const refs = fkM[2].match(/['"`]([a-zA-Z0-9_.]+)['"`]/g) || [];
          cols.forEach((c, i) => {
            const cn = c.replace(/['"`]/g, '');
            const ref = (refs[i] || refs[0] || '').replace(/['"`]/g, '');
            const [t, tc] = ref.includes('.') ? ref.split('.') : [ref, 'id'];
            if (t) fks.push({ column: cn, targetTable: t, targetColumn: tc || 'id' });
          });
        }
      }
      this.registerCodeTable(tableName, columns, fks, filePath, 'Alembic / SQLAlchemy Migration', 'Python Migration (Alembic)');
    }
    // 2. Django migrations.CreateModel(name='X', fields=[('id', models.AutoField(...)), ...])
    const djMap = { AutoField: 'INTEGER', BigAutoField: 'BIGINT', CharField: 'VARCHAR(255)', TextField: 'TEXT', IntegerField: 'INTEGER', BigIntegerField: 'BIGINT', SmallIntegerField: 'SMALLINT', BooleanField: 'BOOLEAN', DateTimeField: 'TIMESTAMP', DateField: 'DATE', TimeField: 'TIME', DecimalField: 'DECIMAL(10,2)', FloatField: 'FLOAT', JSONField: 'JSON', UUIDField: 'UUID', BinaryField: 'BLOB', EmailField: 'VARCHAR(255)', ForeignKey: 'INTEGER', OneToOneField: 'INTEGER' };
    const cmRe = /CreateModel\s*\(\s*/g;
    while ((m = cmRe.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const ex = this.extractBalanced(content, content.indexOf('(', m.index), '(', ')');
      if (!ex) continue;
      const nameM = ex.body.match(/name\s*=\s*['"`]([a-zA-Z0-9_]+)['"`]/i);
      if (!nameM) continue;
      const fieldsM = ex.body.match(/fields\s*=\s*\[/i);
      if (!fieldsM) continue;
      const arrEx = this.extractBalanced(ex.body, ex.body.indexOf('[', fieldsM.index), '[', ']');
      if (!arrEx) continue;
      const columns = [];
      const fks = [];
      for (const part of this.splitTopLevel(arrEx.body)) {
        const fm = part.match(/\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*,\s*(?:models\.)?([A-Za-z0-9_]+)\s*\(?([\s\S]*)$/i);
        if (!fm || fm[2] === 'ManyToManyField') continue;
        const colName = fm[1];
        const fieldType = fm[2];
        const rest = fm[3] || '';
        if (/^(ForeignKey|OneToOneField)$/i.test(fieldType)) {
          const toM = rest.match(/to\s*=\s*['"`](?:[a-z_]+\.)?([A-Za-z0-9_]+)['"`]/i);
          if (toM) fks.push({ column: colName, targetTable: toM[1].toLowerCase(), targetColumn: 'id' });
        }
        const isPK = /primary_key\s*=\s*True/i.test(rest) || /AutoField/i.test(fieldType);
        const defM = rest.match(/default\s*=\s*([^,)]+)/i);
        columns.push(this.makeCodeColumn(colName, djMap[fieldType] || 'VARCHAR', {
          isPrimaryKey: isPK,
          isNullable: isPK ? false : /null\s*=\s*True/i.test(rest),
          isUnique: /unique\s*=\s*True/i.test(rest),
          defaultValue: defM ? defM[1].trim().replace(/^['"]|['"]$/g, '') : (isPK ? 'AUTO' : null),
          source: 'Django Migration'
        }));
      }
      this.registerCodeTable(nameM[1], columns, fks, filePath, 'Django Migration', 'Django Migration');
    }
  }

  /**
   * Java JPA/Hibernate: @Entity [@Table(name="x")] class X {
   *   @Id @Column(name="id") Long id;
   *   @ManyToOne @JoinColumn(name="user_id") User user;
   * }
   */
  parseJavaEntities(content, filePath) {
    const typeMap = { String: 'VARCHAR(255)', Long: 'BIGINT', long: 'BIGINT', Integer: 'INTEGER', int: 'INTEGER', Short: 'SMALLINT', short: 'SMALLINT', Double: 'DOUBLE', double: 'DOUBLE', Float: 'FLOAT', float: 'FLOAT', BigDecimal: 'DECIMAL(19,2)', Boolean: 'BOOLEAN', boolean: 'BOOLEAN', Date: 'TIMESTAMP', LocalDateTime: 'TIMESTAMP', Timestamp: 'TIMESTAMP', LocalDate: 'DATE', LocalTime: 'TIME', UUID: 'UUID' };
    const re = /@Entity\s*(?:\([^)]*\))?\s*((?:@\w+(?:\([^)]*\))?\s*)*)(?:public|protected|private)?\s*(?:final\s+)?class\s+([A-Za-z0-9_]+)\s*(?:extends\s+[A-Za-z0-9_<>,\s]+)?\s*\{/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const annotations = m[1] || '';
      const className = m[2];
      const tableM = annotations.match(/@Table\s*\(\s*(?:name\s*=\s*)?["']([a-zA-Z0-9_]+)["']/);
      const tableName = tableM ? tableM[1] : className;
      const ex = this.extractBalanced(content, content.indexOf('{', m.index), '{', '}');
      if (!ex) continue;
      const columns = [];
      const fks = [];
      const fieldRe = /((?:@\w+(?:\([^)]*\))?\s*)*)(?:private|protected|public)\s+([A-Za-z0-9_<>\[\]?,\s]+?)\s+([a-zA-Z0-9_]+)\s*(?:=[^;]*)?;/g;
      let fm;
      while ((fm = fieldRe.exec(ex.body)) !== null) {
        const annos = fm[1] || '';
        const rawType = fm[2].trim();
        const fieldName = fm[3];
        if (/^(static|final|transient)\b/.test(rawType)) continue;
        if (/\bclass\b|\binterface\b|\benum\b/.test(rawType.split(/\s+/)[0])) continue;
        const baseType = rawType.replace(/<.*>/, '').replace(/\[\]/g, '').trim().split(/\s+/).pop();
        const joinM = annos.match(/@JoinColumn\s*\([^)]*name\s*=\s*["']([a-zA-Z0-9_]+)["'][^)]*\)/);
        if (/@ManyToOne|@OneToOne/.test(annos)) {
          const colName = joinM ? joinM[1] : `${fieldName}_id`;
          const refM = (joinM ? joinM[0] : '').match(/referencedColumnName\s*=\s*["']([a-zA-Z0-9_]+)["']/);
          fks.push({ column: colName, targetTable: baseType, targetColumn: refM ? refM[1] : 'id' });
          columns.push(this.makeCodeColumn(colName, 'BIGINT', { isNullable: true, source: 'JPA Entity' }));
          continue;
        }
        if (/@Transient/.test(annos)) continue;
        const colM = annos.match(/@Column\s*\(([^)]*)\)/);
        const colAttrs = colM ? colM[1] : '';
        const nameAttr = colAttrs.match(/name\s*=\s*["']([a-zA-Z0-9_]+)["']/);
        const isPK = /@Id\b/.test(annos);
        columns.push(this.makeCodeColumn(nameAttr ? nameAttr[1] : fieldName, typeMap[baseType] || 'VARCHAR', {
          isPrimaryKey: isPK,
          isNullable: isPK ? false : !/nullable\s*=\s*false/i.test(colAttrs),
          isUnique: /unique\s*=\s*true/i.test(colAttrs),
          source: 'JPA Entity'
        }));
      }
      this.registerCodeTable(tableName, columns, fks, filePath, 'JPA / Hibernate Entity', 'Java ORM (Hibernate/JPA)');
    }
  }

  /**
   * C# EF Core: public DbSet<Order> Orders { get; set; } + entity class
   * ([Table("x")], [Key]/[Column]/[Required] attributes, XxxId conventions).
   */
  indexCSharpClasses(content, filePath) {
    // Global class -> properties index (feeds EF Fluent API typing across files)
    if (!this._csClasses) this._csClasses = new Map();
    const classRe = /((?:\[[^\]]*\]\s*)*)(?:public|internal|private|protected)\s+(?:sealed\s+|abstract\s+|static\s+)?class\s+([A-Za-z0-9_]+)\b[^{]*\{/g;
    let cm;
    while ((cm = classRe.exec(content)) !== null) {
      if (this.isInComment(content, cm.index)) continue;
      const className = cm[2];
      const ex = this.extractBalanced(content, content.indexOf('{', cm.index), '{', '}');
      if (!ex) continue;
      const props = new Map();
      const propRe = /((?:\[[^\]]*\]\s*)*)public\s+(?:virtual\s+)?([\w<>\?,\s]+?)\s+([A-Za-z0-9_]+)\s*\{\s*get\s*;/g;
      let pm;
      while ((pm = propRe.exec(ex.body)) !== null) {
        props.set(pm[3], { type: pm[2].trim().replace(/\s+/g, ''), attrs: pm[1] || '' });
      }
      const tableAttr = (cm[1] || '').match(/\[Table\s*\(\s*["']([a-zA-Z0-9_]+)["']/)?.[1] || null;
      const prev = this._csClasses.get(className);
      if (prev) {
        for (const [k, v] of props) if (!prev.props.has(k)) prev.props.set(k, v);
        if (!prev.tableAttr && tableAttr) prev.tableAttr = tableAttr;
      } else {
        this._csClasses.set(className, { file: filePath, props, tableAttr });
      }
    }
  }

  parseCSharpTables(content, filePath) {
    const typeMap = { int: 'INTEGER', long: 'BIGINT', short: 'SMALLINT', string: 'VARCHAR(255)', Guid: 'UUID', bool: 'BOOLEAN', DateTime: 'TIMESTAMP', DateTimeOffset: 'TIMESTAMP', DateOnly: 'DATE', TimeOnly: 'TIME', decimal: 'DECIMAL(18,2)', double: 'DOUBLE', float: 'FLOAT' };
    this.indexCSharpClasses(content, filePath);
    const dbSets = [];
    const dsRe = /public\s+(?:virtual\s+)?DbSet\s*<\s*([A-Za-z0-9_]+)\s*>\s+([A-Za-z0-9_]+)\s*\{/g;
    let dm;
    while ((dm = dsRe.exec(content)) !== null) {
      if (this.isInComment(content, dm.index)) continue;
      dbSets.push({ entity: dm[1], table: dm[2] });
    }
    if (dbSets.length === 0) return;
    const byEntity = new Map(dbSets.map((d) => [d.entity, d.table]));
    const classRe = /((?:\[[^\]]*\]\s*)*)(?:public|internal|private|protected)\s+(?:sealed\s+|abstract\s+|static\s+)?class\s+([A-Za-z0-9_]+)\b[^{]*\{/g;
    let cm;
    while ((cm = classRe.exec(content)) !== null) {
      const classAttrs = cm[1] || '';
      const className = cm[2];
      if (!byEntity.has(className)) continue;
      const tableAttr = classAttrs.match(/\[Table\s*\(\s*["']([a-zA-Z0-9_]+)["']/);
      const tableName = tableAttr ? tableAttr[1] : byEntity.get(className);
      const ex = this.extractBalanced(content, content.indexOf('{', cm.index), '{', '}');
      if (!ex) continue;
      const columns = [];
      const fks = [];
      const propRe = /((?:\[[^\]]*\]\s*)*)public\s+(?:virtual\s+)?([\w<>\?,\s]+?)\s+([A-Za-z0-9_]+)\s*\{\s*get\s*;/g;
      let pm;
      while ((pm = propRe.exec(ex.body)) !== null) {
        const attrs = pm[1] || '';
        const rawType = pm[2].trim();
        const propName = pm[3];
        const normType = rawType.replace(/\s+/g, '');
        if (/^(DbSet|ICollection|List<|IEnumerable|HashSet|ISet)/.test(normType)) continue;
        if (/\[NotMapped\]/.test(attrs)) continue;
        if (byEntity.has(normType)) continue;
        const colM = attrs.match(/\[Column\s*\(\s*["']([a-zA-Z0-9_]+)["']/);
        const colName = colM ? colM[1] : propName;
        const isPK = /\[Key\]/.test(attrs) || /^Id$/i.test(propName);
        const fkConv = propName.match(/^([A-Za-z0-9_]+)Id$/);
        if (!isPK && fkConv && byEntity.has(fkConv[1])) {
          fks.push({ column: colName, targetTable: fkConv[1], targetColumn: 'id' });
        }
        const baseNorm = normType.replace(/\?$/, '');
        const isRefType = /^(string|byte\[\]|object)/i.test(baseNorm);
        columns.push(this.makeCodeColumn(colName, typeMap[baseNorm] || typeMap[normType] || 'VARCHAR', {
          isPrimaryKey: isPK,
          isNullable: !isPK && (normType.endsWith('?') || (isRefType && !/\[Required\]/.test(attrs))),
          isUnique: /\[Index\([^)]*IsUnique\s*=\s*true/.test(attrs),
          source: 'EF Core Model'
        }));
      }
      this.registerCodeTable(tableName, columns, fks, filePath, 'EF Core Model', 'C# ORM (EF Core)');
    }
  }

  /**
   * EF Core Fluent API: modelBuilder.Entity<Order>(b => {
   *   b.ToTable("orders"); b.HasKey(e => e.Id);
   *   b.Property(e => e.Title).IsRequired().HasMaxLength(200);
   *   b.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId);
   * })
   * Typing comes from the global class index, so the entity class may live
   * in another file. Without a known class, Property() names still register.
   */
  parseFluentAPI(content, filePath) {
    const typeMap = { int: 'INTEGER', long: 'BIGINT', short: 'SMALLINT', string: 'VARCHAR(255)', Guid: 'UUID', bool: 'BOOLEAN', DateTime: 'TIMESTAMP', DateTimeOffset: 'TIMESTAMP', DateOnly: 'DATE', TimeOnly: 'TIME', decimal: 'DECIMAL(18,2)', double: 'DOUBLE', float: 'FLOAT' };
    const dbSets = new Map();
    const dsRe = /public\s+(?:virtual\s+)?DbSet\s*<\s*([A-Za-z0-9_]+)\s*>\s+([A-Za-z0-9_]+)\s*\{/g;
    let dm;
    while ((dm = dsRe.exec(content)) !== null) {
      if (this.isInComment(content, dm.index)) continue;
      if (!dbSets.has(dm[1])) dbSets.set(dm[1], dm[2]);
    }
    const re = /modelBuilder\s*\.\s*Entity\s*(?:<\s*([A-Za-z_][\w]*)\s*>)?\s*\(\s*(?:["']([a-zA-Z0-9_]+)["']\s*,\s*)?(?:\(?\s*\w+\s*\)?\s*=>\s*)?\{/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (this.isInComment(content, m.index)) continue;
      const entityClass = m[1] || null;
      let tableName = m[2] || null;
      const ex = this.extractBalanced(content, content.indexOf('{', m.index), '{', '}');
      if (!ex) continue;
      re.lastIndex = ex.endIndex + 1;
      const clsInfo = (entityClass && this._csClasses?.get(entityClass)) || null;
      if (!tableName) tableName = (entityClass && dbSets.get(entityClass)) || clsInfo?.tableAttr || entityClass;
      if (!tableName) continue;
      const columns = [];
      const fks = [];
      const colMods = new Map(); // prop -> { required, unique, default, type }
      const pkProps = new Set();
      const propOrder = [];
      let pendingNav = null;
      for (const stmtRaw of this.splitTopLevel(ex.body, ';')) {
        const stmt = stmtRaw.trim();
        if (!stmt) continue;
        let sm;
        if ((sm = stmt.match(/ToTable\s*\(\s*["']([a-zA-Z0-9_]+)["']/))) {
          tableName = sm[1];
          continue;
        }
        if (/HasKey\s*\(/.test(stmt)) {
          for (const em of stmt.matchAll(/=>\s*([A-Za-z_][\w]*)/g)) pkProps.add(em[1]);
          for (const qm of stmt.matchAll(/["']([a-zA-Z0-9_]+)["']/g)) pkProps.add(qm[1]);
          continue;
        }
        if ((sm = stmt.match(/Property\s*\(\s*(?:\w+\s*=>\s*\w+\.([A-Za-z_][\w]*)|["']([a-zA-Z0-9_]+)["'])/))) {
          const prop = sm[1] || sm[2];
          if (!colMods.has(prop)) { colMods.set(prop, {}); propOrder.push(prop); }
          const mod = colMods.get(prop);
          if (/\.IsRequired\s*\(/.test(stmt)) mod.required = true;
          if (/\.IsUnique\s*\(/.test(stmt)) mod.unique = true;
          const dtM = stmt.match(/\.HasColumnType\s*\(\s*["']([^"']+)["']/);
          if (dtM) mod.type = dtM[1].toUpperCase();
          const dvM = stmt.match(/\.HasDefaultValue(?:Sql)?\s*\(\s*([^)]+?)\)/);
          if (dvM) mod.default = dvM[1].trim().replace(/^["']|["']$/g, '');
          continue;
        }
        const hoM = stmt.match(/HasOne\s*(?:<\s*([A-Za-z_][\w]*)\s*>)?\s*\(\s*([^)]*)\)/);
        if (hoM) {
          pendingNav = { type: hoM[1] || null, expr: hoM[2] || '' };
        }
        const fkM = stmt.match(/HasForeignKey\s*\(\s*(?:\w+\s*=>\s*\w+\.([A-Za-z_][\w]*)|["']([a-zA-Z0-9_]+)["'])?/);
        if (fkM && (fkM[1] || fkM[2])) {
          const fkProp = fkM[1] || fkM[2];
          let target = pendingNav?.type || null;
          if (!target && pendingNav?.expr) {
            const navM = pendingNav.expr.match(/=>\s*\w+\.([A-Za-z_][\w]*)/);
            if (navM && clsInfo?.props.has(navM[1])) {
              target = clsInfo.props.get(navM[1]).type.replace(/^(virtual\s+)?/, '').split('<')[0];
            }
          }
          if (!colMods.has(fkProp)) { colMods.set(fkProp, {}); propOrder.push(fkProp); }
          if (target) fks.push({ column: fkProp, targetTable: target, targetColumn: 'id' });
          pendingNav = null;
          continue;
        }
        const ixM = stmt.match(/HasIndex\s*\(([\s\S]*?)\)\s*([\s\S]*)$/);
        if (ixM && /IsUnique\s*\(/.test(ixM[2] || '')) {
          for (const em of ixM[1].matchAll(/=>\s*([A-Za-z_][\w]*)/g)) {
            if (!colMods.has(em[1])) { colMods.set(em[1], {}); propOrder.push(em[1]); }
            colMods.get(em[1]).unique = true;
          }
          for (const qm of ixM[1].matchAll(/["']([a-zA-Z0-9_]+)["']/g)) {
            if (!colMods.has(qm[1])) { colMods.set(qm[1], {}); propOrder.push(qm[1]); }
            colMods.get(qm[1]).unique = true;
          }
        }
      }
      if (clsInfo) {
        for (const [propName, pinfo] of clsInfo.props) {
          const normType = pinfo.type;
          if (/^(DbSet|ICollection|List<|IEnumerable|HashSet|ISet)/.test(normType)) continue;
          if (/\[NotMapped\]/.test(pinfo.attrs)) continue;
          if (this._csClasses?.has(normType)) continue;
          const colM = pinfo.attrs.match(/\[Column\s*\(\s*["']([a-zA-Z0-9_]+)["']/);
          const colName = colM ? colM[1] : propName;
          const mod = colMods.get(propName) || {};
          const isPK = pkProps.has(propName) || /\[Key\]/.test(pinfo.attrs) || /^Id$/i.test(propName);
          const baseNorm = normType.replace(/\?$/, '');
          const isRefType = /^(string|byte\[\]|object)/i.test(baseNorm);
          const fkConv = propName.match(/^([A-Za-z0-9_]+)Id$/);
          if (!isPK && fkConv && this._csClasses?.has(fkConv[1])) {
            fks.push({ column: colName, targetTable: fkConv[1], targetColumn: 'id' });
          }
          columns.push(this.makeCodeColumn(colName, mod.type || typeMap[baseNorm] || typeMap[normType] || 'VARCHAR', {
            isPrimaryKey: isPK,
            isNullable: !isPK && (mod.required ? false : (normType.endsWith('?') || (isRefType && !/\[Required\]/.test(pinfo.attrs)))),
            isUnique: mod.unique || /\[Index\([^)]*IsUnique\s*=\s*true/.test(pinfo.attrs),
            defaultValue: mod.default !== undefined ? mod.default : (isPK ? 'AUTO' : null),
            source: 'EF Core Fluent API'
          }));
        }
      }
      for (const prop of propOrder) {
        if (clsInfo?.props.has(prop)) continue;
        const mod = colMods.get(prop) || {};
        columns.push(this.makeCodeColumn(prop, mod.type || 'VARCHAR', {
          isPrimaryKey: pkProps.has(prop),
          isNullable: pkProps.has(prop) ? false : !mod.required,
          isUnique: !!mod.unique,
          defaultValue: mod.default !== undefined ? mod.default : (pkProps.has(prop) ? 'AUTO' : null),
          source: 'EF Core Fluent API'
        }));
      }
      this.registerCodeTable(tableName, columns, fks, filePath, 'EF Core Fluent API', 'C# ORM (EF Core)');
    }
  }

  resolveFluentAPI() {
    if (!this._xfile) return;
    for (const [fp, info] of this._xfile) {
      if (info.ext !== '.cs') continue;
      let content;
      try {
        content = fs.readFileSync(fp, 'utf-8');
      } catch { continue; }
      if (!/modelBuilder\s*\.\s*Entity/i.test(content)) continue;
      try { this.parseFluentAPI(content, fp); } catch {}
    }
  }

  /**
   * Go GORM: type Order struct { ID uint `gorm:"primaryKey"` ... } plus
   * optional func (Order) TableName() string { return "orders" }.
   * Only structs with a TableName() method, gorm tags, or (gorm import +
   * 2+ exported fields) are treated as tables to avoid struct noise.
   */
  parseGoStructs(content, filePath) {
    const hasGormImport = /gorm\.io\/gorm/.test(content);
    const tableNames = {};
    const tnRe = /func\s*\(\s*(?:\w+\s+)?([A-Za-z0-9_]+)\s*\)\s*TableName\s*\(\s*\)\s*string\s*\{\s*return\s*["'`]([a-zA-Z0-9_]+)["'`]/g;
    let tm;
    while ((tm = tnRe.exec(content)) !== null) {
      if (this.isInComment(content, tm.index)) continue;
      tableNames[tm[1]] = tm[2];
    }
    const typeMap = { int: 'INTEGER', int8: 'INTEGER', int16: 'INTEGER', int32: 'INTEGER', int64: 'BIGINT', uint: 'INTEGER', uint8: 'INTEGER', uint16: 'INTEGER', uint32: 'INTEGER', uint64: 'BIGINT', string: 'VARCHAR(255)', bool: 'BOOLEAN', float32: 'FLOAT', float64: 'DOUBLE', 'time.Time': 'TIMESTAMP' };
    const stRe = /type\s+([A-Za-z0-9_]+)\s+struct\s*\{/g;
    let sm;
    while ((sm = stRe.exec(content)) !== null) {
      if (this.isInComment(content, sm.index)) continue;
      const structName = sm[1];
      const ex = this.extractBalanced(content, content.indexOf('{', sm.index), '{', '}');
      if (!ex) continue;
      const rawFields = [];
      for (const line of ex.body.split('\n')) {
        const lm = line.match(/^\s*([A-Z][A-Za-z0-9_]*)\s+([^\s`]+)(?:\s+`([^`]*)`)?/);
        if (!lm || /^(func|chan|map\[|interface)/.test(lm[2])) continue;
        rawFields.push({ name: lm[1], type: lm[2].replace(/^\*/, ''), tags: lm[3] || '' });
      }
      const structHasGorm = rawFields.some((f) => /gorm:/.test(f.tags));
      if (!tableNames[structName] && !structHasGorm && !(hasGormImport && rawFields.length >= 2)) continue;
      // Map field name -> column name so relation foreignKey tags resolve to
      // the real local column (e.g. OwnerID -> owner_id), not a lowercased guess.
      const fieldColumn = new Map();
      for (const f of rawFields) {
        const gTag = (f.tags.match(/gorm:"([^"]*)"/) || [])[1] || '';
        const cM = gTag.match(/column:([a-zA-Z0-9_]+)/);
        const jM = f.tags.match(/json:"([a-zA-Z0-9_]+)/);
        fieldColumn.set(f.name.toLowerCase(), cM ? cM[1] : (jM ? jM[1] : f.name.toLowerCase()));
      }
      const columns = [];
      const fks = [];
      for (const f of rawFields) {
        const gormTag = (f.tags.match(/gorm:"([^"]*)"/) || [])[1] || '';
        if (gormTag === '-' || /(^|;)->(;|$)/.test(gormTag)) continue;
        const baseT = f.type.replace(/\[\]/g, '');
        if (f.type.startsWith('[]')) continue;
        if (!typeMap[baseT] && /^[A-Z]/.test(baseT) && baseT !== 'Time') {
          const fkTag = gormTag.match(/foreignKey:([A-Za-z0-9_]+)/);
          if (fkTag) {
            fks.push({
              column: fieldColumn.get(fkTag[1].toLowerCase()) || fkTag[1].toLowerCase(),
              targetTable: baseT,
              targetColumn: 'id'
            });
          }
          continue;
        }
        const colM = gormTag.match(/column:([a-zA-Z0-9_]+)/);
        const jsonM = f.tags.match(/json:"([a-zA-Z0-9_]+)/);
        const isPK = /primaryKey/i.test(gormTag) || /^(ID|Id)$/.test(f.name);
        columns.push(this.makeCodeColumn(colM ? colM[1] : (jsonM ? jsonM[1] : f.name.toLowerCase()), typeMap[baseT] || 'VARCHAR', {
          isPrimaryKey: isPK,
          isNullable: !isPK && !/not null/i.test(gormTag),
          isUnique: /unique/i.test(gormTag),
          source: 'GORM Struct'
        }));
      }
      this.registerCodeTable(tableNames[structName] || structName, columns, fks, filePath, 'GORM Struct Model', 'Go ORM (GORM)');
    }
  }

  normKey(p) {
    return String(p || '').replace(/\\/g, '/');
  }

  /**
   * Resolve an import specifier to an analyzed file: relative paths (with
   * extension/index/__init__ probing), @/~/ aliases under the project root,
   * and bare/dotted specifiers via unique suffix match. Null when ambiguous.
   */
  resolveImportPath(fromFile, raw) {
    const files = this._files || [];
    if (!raw || files.length === 0) return null;
    const norm = (p) => this.normKey(path.resolve(p));
    const byNorm = new Map(files.map((f) => [norm(f), f]));
    if (/^\.\.?\//.test(raw)) {
      const abs = norm(path.resolve(path.dirname(fromFile), raw));
      const cands = [abs,
        ...['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.java', '.go', '.cs'].map((e) => abs + e),
        ...['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'].map((e) => abs + '/index' + e),
        abs + '/__init__.py'];
      for (const c of cands) if (byNorm.has(c)) return byNorm.get(c);
      return null;
    }
    let rel = raw;
    if (/^@\//.test(raw)) rel = raw.slice(2);
    else if (/^~\//.test(raw)) rel = raw.slice(2);
    else {
      rel = raw.replace(/^\.+/, '');
      if (/^[A-Za-z_][\w]*(\.[A-Za-z_][\w]*)+$/.test(rel) && !rel.includes('/')) rel = rel.replace(/\./g, '/');
    }
    const suffixes = [];
    for (const e of ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.java', '.go', '.cs', '']) {
      suffixes.push('/' + rel + e);
    }
    suffixes.push('/' + rel + '/__init__.py');
    const hits = [];
    for (const [, f] of byNorm) {
      if (suffixes.some((s) => this.normKey(f).endsWith(s))) hits.push(f);
    }
    if (hits.length === 0 && !rel.includes('/')) {
      const esc = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const baseRe = new RegExp('/' + esc + '\\.(py|js|ts|go|java|cs|tsx|jsx|mjs|cjs)$');
      for (const [, f] of byNorm) {
        if (baseRe.test(this.normKey(f))) hits.push(f);
      }
    }
    const uniq = [...new Set(hits)];
    return uniq.length === 1 ? uniq[0] : null;
  }

  /**
   * Chase an exported name to its defining file (follows `export {X} from`,
   * `export * from`, CJS require-barrels). Null when unresolvable.
   */
  lookupExport(file, name, seen) {
    if (!file || !name) return null;
    if (!seen) seen = new Set();
    const stamp = file + '#' + name;
    if (seen.has(stamp) || seen.size > 8) return null;
    seen.add(stamp);
    const info = this._xfile ? this._xfile.get(file) : null;
    if (!info) return null;
    const ex = info.exports || {};
    if (ex.named && ex.named.has(name)) return { file, name: ex.named.get(name) };
    if (name === 'default' && ex.default) return { file, name: ex.default };
    if (ex.all && this._ddlVarsByFile && this._ddlVarsByFile.get(file)?.has(name)) {
      return { file, name };
    }
    const Hoist = (r) => {
      const target = this.resolveImportPath(file, r.path);
      if (!target) return null;
      if (r.star) return this.lookupExport(target, name, seen);
      const local = (r.names && r.names.get(name)) || name;
      if (this._ddlVarsByFile && this._ddlVarsByFile.get(target)?.has(local)) {
        return { file: target, name: local };
      }
      return this.lookupExport(target, local, seen);
    };
    for (const r of (ex.reExports || [])) {
      const hit = Hoist(r);
      if (hit) return hit;
    }
    for (const p of (ex.star || [])) {
      const hit = Hoist({ path: p, star: true });
      if (hit) return hit;
    }
    return null;
  }

  findClassFile(className) {
    if (!this._xfile || !className) return null;
    const hits = [];
    for (const [fp, info] of this._xfile) {
      if ((info.declared?.classes || []).includes(className)) hits.push(fp);
    }
    return hits.length === 1 ? hits[0] : null;
  }

  findGoPackage(pkg) {
    if (!this._xfile || !pkg) return null;
    const hits = [];
    for (const [fp, info] of this._xfile) {
      if (info.ext === '.go' && info.declared?.pkg === pkg) hits.push(fp);
    }
    return hits.length === 1 ? hits[0] : null;
  }

  resolveMemberOnFile(target, a1, a2) {
    if (!target) return null;
    if (!a2) return this.lookupExport(target, a1);
    const dd = this._dictVarsByFile?.get(target)?.get(a1);
    if (dd && dd.has(a2)) return { file: target, dict: a1, key: a2 };
    const hit = this.lookupExport(target, a1);
    if (hit) {
      const dd2 = this._dictVarsByFile?.get(hit.file)?.get(hit.name);
      if (dd2 && dd2.has(a2)) return { file: hit.file, dict: hit.name, key: a2 };
    }
    return null;
  }

  /**
   * Resolve one executor argument to its defining location:
   * { file, name } for variables, { file, dict, key } for dict entries.
   * In-file hits owned by the same-file passes return null (no double work).
   */
  resolveCrossFileArg(info, filePath, arg) {
    const t = String(arg || '').trim();
    if (!t || /^['"`]/.test(t)) return null;
    const inFileDDL = this._ddlVarsByFile?.get(filePath);
    const inFileDict = this._dictVarsByFile?.get(filePath);
    const imp = (info && info.imports) || { named: new Map(), namespace: new Map(), default: new Map(), starImports: [], staticConsts: new Map() };
    const bare = t.match(/^([A-Za-z_$][\w$]*)$/);
    if (bare) {
      const id = bare[1];
      if (inFileDDL?.has(id) || inFileDict?.has(id)) return null;
      if (imp.named.has(id)) {
        const r = imp.named.get(id);
        const target = this.resolveImportPath(filePath, r.path);
        if (!target) return null;
        return this.lookupExport(target, r.imported);
      }
      if (imp.default.has(id)) {
        const r = imp.default.get(id);
        const target = this.resolveImportPath(filePath, r.path);
        if (!target) return null;
        return this.lookupExport(target, 'default');
      }
      if (imp.staticConsts.has(id)) {
        const cf = this.findClassFile(imp.staticConsts.get(id).cls);
        return cf ? { file: cf, name: id } : null;
      }
      for (const s of (imp.starImports || [])) {
        const target = this.resolveImportPath(filePath, s.path);
        if (target && this._ddlVarsByFile?.get(target)?.has(id)) return { file: target, name: id };
      }
      return null;
    }
    const parts = this.splitMemberAccess(t);
    if (!parts || parts.length < 2 || parts.length > 3) return null;
    const [base, a1, a2] = parts;
    if (inFileDict?.has(base)) return null;
    if (inFileDDL?.has(base) && !a1) return null;
    // Named-imported dict/object: QUERIES['audits'], Q.key
    if (imp.named.has(base)) {
      const r = imp.named.get(base);
      const target = this.resolveImportPath(filePath, r.path);
      if (!target) return null;
      if (!a2) {
        const dd = this._dictVarsByFile?.get(target)?.get(r.imported);
        if (dd && dd.has(a1)) return { file: target, dict: r.imported, key: a1 };
        return null;
      }
      return null;
    }
    // Namespace / module alias: NS.X, mod.X, NS.X['k']
    if (imp.namespace.has(base)) {
      const nsInfo = imp.namespace.get(base);
      const target = this.resolveImportPath(filePath, nsInfo.path);
      if (target) return this.resolveMemberOnFile(target, a1, a2);
      // Import path is not a file path (Go package path, module alias):
      // fall back to package-name search (alias or recorded package base)
      const gf = this.findGoPackage(base) || (nsInfo.pkg && this.findGoPackage(nsInfo.pkg));
      if (gf && a1 && !a2 && this._ddlVarsByFile?.get(gf)?.has(a1)) {
        return { file: gf, name: a1 };
      }
      return null;
    }
    // Class / package fallback (Java/C#/Go, Python module used unaliased)
    if (a1 && !a2) {
      const gf = this.findGoPackage(base);
      if (gf && this._ddlVarsByFile?.get(gf)?.has(a1)) return { file: gf, name: a1 };
      const cf = this.findClassFile(base);
      if (cf) {
        if (this._ddlVarsByFile?.get(cf)?.has(a1)) return { file: cf, name: a1 };
        const hit = this.lookupExport(cf, a1);
        if (hit && this._ddlVarsByFile?.get(hit.file)?.has(hit.name)) return hit;
      }
    }
    return null;
  }

  fetchResolvedText(ref) {
    if (!ref) return null;
    try {
      if (ref.dict) {
        return this._dictVarsByFile?.get(ref.file)?.get(ref.dict)?.get(ref.key) || null;
      }
      return this._ddlVarsByFile?.get(ref.file)?.get(ref.name) || null;
    } catch { return null; }
  }

  /**
   * Cross-file driver: for every file with imports, match executor calls
   * whose argument resolves to DDL defined in another file (named/default/
   * namespace imports, re-export barrels, static imports, Go packages,
   * C#/Java class constants, Python modules/dicts) and parse it as schema.
   * Defining-file provenance is kept as sourceFile.
   */
  resolveCrossFileDDL() {
    if (!this._xfile || this._xfile.size === 0) return;
    const execRe = /(\braw|\bquery|\bexecute|\bexec|\brun|\bsql)\w*\s*\(\s*([^,()]+?)\s*[,)]/gi;
    for (const [filePath, info] of this._xfile) {
      // Prefilter: needs an executor call plus imports or a member-form
      // argument (class/package fallback works without import statements)
      if (!info.hasExecutorCall || (!info.hasMemberExecutor && (!info.imports || !info.imports.hasAny))) continue;
      let content;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch { continue; }
      execRe.lastIndex = 0;
      let m;
      while ((m = execRe.exec(content)) !== null) {
        if (this.isInComment(content, m.index)) continue;
        const arg = (m[2] || '').trim();
        if (!arg || /^['"`]/.test(arg)) continue;
        let ref = null;
        try {
          ref = this.resolveCrossFileArg(info, filePath, arg);
        } catch { ref = null; }
        if (!ref) continue;
        const text = this.fetchResolvedText(ref);
        if (!text) continue;
        try { this.parseEmbeddedCreateTables(text, ref.file, true); } catch {}
      }
    }
  }

  /**
   * Parse INSERT INTO statements to extract actual sample data rows
   */
  parseSQLInserts(content) {
    const insertRegex = /INSERT\s+INTO\s+(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*(?:\(([\s\S]*?)\))?\s*VALUES\s*\(([\s\S]*?)\);/gi;
    let match;

    while ((match = insertRegex.exec(content)) !== null) {
      const tableName = match[1];
      const colsPart = match[2];
      const valuesPart = match[3];

      const values = this.splitValues(valuesPart);
      let colNames = [];

      const existingInsertKey = this.findTableKey(tableName);
      if (colsPart) {
        colNames = colsPart.split(',').map(c => c.trim().replace(/[`"\[\]]/g, ''));
      } else if (existingInsertKey) {
        colNames = this.tables[existingInsertKey].columns.map(c => c.name);
      }

      const row = {};
      colNames.forEach((col, idx) => {
        if (values[idx] !== undefined) {
          row[col] = values[idx];
          if (existingInsertKey) {
            const tableCol = this.tables[existingInsertKey].columns.find(c => c.name === col);
            if (tableCol) tableCol.sampleValue = values[idx];
          }
        }
      });

      if (!this.sampleData[tableName]) this.sampleData[tableName] = [];
      this.sampleData[tableName].push(row);
    }
  }

  /**
   * SQLite Binary Reader
   */
  parseSqliteBinary(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      const header = buffer.toString('utf-8', 0, 16);
      if (header.startsWith('SQLite format 3')) {
        // Read ASCII strings from sqlite_master schema definitions in the file
        const textContent = buffer.toString('binary');
        this.parseSQL(textContent, filePath);
        
        // Tag found tables as SQLite database
        for (const table of Object.values(this.tables)) {
          if (table.sourceFile === filePath) {
            table.databaseType = 'SQLite Database (.db/.sqlite)';
          }
        }
      }
    } catch {}
  }

  /**
   * Prisma Schemas
   */
  parsePrisma(content, filePath) {
    const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const body = match[2];
      const columns = [];
      const foreignKeys = [];

      const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

      for (const line of lines) {
        if (line.startsWith('@@')) continue;

        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const colName = parts[0];
          const colType = parts[1];
          const isPK = line.includes('@id');
          const isUnique = line.includes('@unique');
          const isNullable = colType.endsWith('?');

          const relationMatch = line.match(/@relation\([^)]*fields:\s*\[([^\]]+)\],\s*references:\s*\[([^\]]+)\]/);
          if (relationMatch) {
            foreignKeys.push({
              column: relationMatch[1].trim(),
              targetTable: colType.replace('?', ''),
              targetColumn: relationMatch[2].trim()
            });
          }

          if (!['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal', 'Bytes'].includes(colType.replace('?', '').replace('[]', ''))) {
            continue;
          }

          columns.push({
            name: colName,
            type: colType,
            isPrimaryKey: isPK,
            isNullable,
            isUnique,
            defaultValue: isPK ? 'autoincrement()' : null,
            sampleValue: this.generateDefaultValueForType(colName, colType),
            description: `Prisma field ${colName}`
          });
        }
      }

      this.upsertTable(modelName, {
        name: this.findTableKey(modelName) ? this.tables[this.findTableKey(modelName)].name : modelName,
        databaseType: 'Prisma ORM (Postgres/MySQL/SQLite/Mongo)',
        sourceFile: filePath,
        sourceType: 'Prisma Schema',
        columns,
        foreignKeys,
        primaryKey: columns.find(c => c.isPrimaryKey)?.name || 'id',
        sampleRows: []
      });
    }
  }

  /**
   * Python ORMs: SQLAlchemy, Django, Tortoise, SQLModel, Pydantic
   */
  parsePythonORM(content, filePath) {
    const classRegex = /class\s+([a-zA-Z0-9_]+)\s*\((?:Base|models\.Model|db\.Model|DeclarativeBase|SQLModel|BaseModel|Model)(?:\s*,[^)]*)?\):\s*([\s\S]*?)(?=\nclass|\n\w|$)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const modelName = match[1];
      const body = match[2];
      const columns = [];
      const foreignKeys = [];

      const tableMatch = body.match(/__tablename__\s*=\s*['"]([a-zA-Z0-9_]+)['"]/) ||
        body.match(/table_name\s*=\s*['"]([a-zA-Z0-9_]+)['"]/) ||
        body.match(/db_table\s*=\s*['"]([a-zA-Z0-9_]+)['"]/);
      const tableName = tableMatch ? tableMatch[1] : modelName.toLowerCase();

      // Column definitions (SQLAlchemy Column(...), Django/Peewee XxxField(...),
      // Django models.ForeignKey(...) / models.OneToOneField(...))
      const colRegex = /([a-zA-Z0-9_]+)\s*(?::\s*([A-Za-z0-9_\[\]]+)\s*)?=\s*(?:[A-Za-z_][\w]*\.)?(Column|[A-Za-z0-9]+Field|ForeignKey|OneToOneField)\s*\(([\s\S]*?)\)/g;
      let colMatch;

      while ((colMatch = colRegex.exec(body)) !== null) {
        const colName = colMatch[1];
        const typeHint = colMatch[2];
        const fieldType = colMatch[3] || '';
        const colArgs = colMatch[4];
        const isPK = /primary_key\s*=\s*True/i.test(colArgs) || /^AutoField$/i.test(fieldType);
        const isUnique = /unique\s*=\s*True/i.test(colArgs);
        const isNullable = !/nullable\s*=\s*False/i.test(colArgs) && !/null\s*=\s*False/i.test(colArgs);

        let type = typeHint || 'VARCHAR';
        if (/Integer/i.test(colArgs) || /^(Integer|Auto)Field$/i.test(fieldType)) type = 'INTEGER';
        else if (/BigInteger/i.test(colArgs) || /^Big(Auto|Integer)Field$/i.test(fieldType)) type = 'BIGINT';
        else if (/String|CharField|TextField|Text/i.test(colArgs) || /^(Char|Text)Field$/i.test(fieldType)) type = 'VARCHAR(255)';
        else if (/DateTime/i.test(colArgs) || /^DateTimeField$/i.test(fieldType)) type = 'TIMESTAMP';
        else if (/Boolean/i.test(colArgs) || /^BooleanField$/i.test(fieldType)) type = 'BOOLEAN';
        else if (/Float|Decimal|Numeric/i.test(colArgs) || /^(Float|Decimal)Field$/i.test(fieldType)) type = 'DECIMAL(10,2)';
        else if (/JSON/i.test(colArgs) || /^JSONField$/i.test(fieldType)) type = 'JSON';
        else if (/UUID/i.test(colArgs) || /^UUIDField$/i.test(fieldType)) type = 'UUID';
        else if (/^(ForeignKey|OneToOne)(Field)?$/i.test(fieldType)) type = 'INTEGER';

        const fkMatch = colArgs.match(/ForeignKey\(['"]([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)['"]\)/) ||
                        colArgs.match(/models\.ForeignKey\(['"]([a-zA-Z0-9_]+)['"]/) ||
                        colArgs.match(/^['"]?([A-Za-z0-9_.]+)['"]?\s*(?:,|$)/);
        // Column-embedded form: Column(Integer, ForeignKey('users.id'), ...)
        // (lazy paren capture drops its closing bracket, so match open-ended)
        const strFk = colArgs.match(/ForeignKey\s*\(\s*['"]([A-Za-z0-9_.]+)['"]/);
        const isFkField = /^(ForeignKey|OneToOne)(Field)?$/i.test(fieldType);
        if ((isFkField && fkMatch) || strFk) {
          const dotted = strFk ? strFk[1] : fkMatch[1];
          const explicitCol = (!strFk && fkMatch[2]) ? fkMatch[2] : null;
          const bits = String(dotted).split('.');
          let targetTable;
          let targetColumn;
          if (explicitCol) {
            targetTable = bits[0];
            targetColumn = explicitCol;
          } else if (bits.length === 2 && /^[a-z_][a-z0-9_]*$/.test(bits[0]) && /^[A-Z]/.test(bits[1])) {
            targetTable = bits[1]; // Django 'app.Model' convention
            targetColumn = 'id';
          } else if (bits.length === 2) {
            targetTable = bits[0]; // 'table.column' convention
            targetColumn = bits[1];
          } else {
            targetTable = bits[0];
            targetColumn = 'id';
          }
          foreignKeys.push({ column: colName, targetTable, targetColumn });
        }

        columns.push({
          name: colName,
          type,
          isPrimaryKey: isPK,
          isNullable,
          isUnique,
          defaultValue: isPK ? 'auto()' : null,
          sampleValue: this.generateDefaultValueForType(colName, type),
          description: `Python ORM ${colName}`
        });
      }

      if (columns.length > 0) {
        this.upsertTable(tableName, {
          name: this.findTableKey(tableName) ? this.tables[this.findTableKey(tableName)].name : tableName,
          modelName,
          databaseType: 'Python ORM (SQLAlchemy/Django/SQLModel)',
          sourceFile: filePath,
          sourceType: 'Python ORM',
          columns,
          foreignKeys,
          primaryKey: columns.find(c => c.isPrimaryKey)?.name || 'id',
          sampleRows: []
        });
      }
    }

    // PyMongo Collections (e.g. db["users"], db.orders.find(), init_mongodb)
    const mongoCollRegex = /(?:db|database|client\[['"][^'"]+['"]\]|default_db)\[['"]([a-zA-Z0-9_]+)['"]\]|(?:db|database|default_db)\.([a-zA-Z0-9_]+)\.(?:insert|find|update|delete|create_index|aggregate)/g;
    let mongoMatch;
    while ((mongoMatch = mongoCollRegex.exec(content)) !== null) {
      const collName = mongoMatch[1] || mongoMatch[2];
      if (collName && !['collection', 'command', 'admin', 'test'].includes(collName.toLowerCase()) && !this.findTableKey(collName)) {
        this.upsertTable(collName, {
          name: collName,
          modelName: collName.charAt(0).toUpperCase() + collName.slice(1),
          databaseType: 'MongoDB Collection (PyMongo)',
          sourceFile: filePath,
          sourceType: 'PyMongo Document Model',
          columns: [
            { name: '_id', type: 'ObjectId', isPrimaryKey: true, isNullable: false, isUnique: true, defaultValue: 'ObjectId()', sampleValue: '65e89a01f92e4c001a4b', description: 'Document unique ID' },
            { name: 'document', type: 'BSON / Document', isPrimaryKey: false, isNullable: true, isUnique: false, defaultValue: null, sampleValue: '{"status": "active"}', description: 'JSON Document Schema' }
          ],
          foreignKeys: [],
          primaryKey: '_id',
          sampleRows: []
        });
      }
    }
  }

  /**
   * TypeScript / JavaScript: TypeORM, Sequelize, Mongoose, Drizzle
   */
  parseTypeScriptORM(content, filePath) {
    // 1. Mongoose Schema (MongoDB)
    const mongooseRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+Schema)\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(\{([\s\S]*?)\}\)/g;
    let mMatch;
    while ((mMatch = mongooseRegex.exec(content)) !== null) {
      const schemaName = mMatch[1].replace(/Schema$/i, '');
      const body = mMatch[2];
      const columns = [];

      const propRegex = /([a-zA-Z0-9_]+)\s*:\s*\{([^}]+)\}|([a-zA-Z0-9_]+)\s*:\s*([A-Za-z]+)/g;
      let pMatch;
      while ((pMatch = propRegex.exec(body)) !== null) {
        const colName = pMatch[1] || pMatch[3];
        const details = pMatch[2] || pMatch[4];
        let type = 'String';
        if (/Number/i.test(details)) type = 'Number';
        else if (/Date/i.test(details)) type = 'Date';
        else if (/Boolean/i.test(details)) type = 'Boolean';
        else if (/ObjectId/i.test(details)) type = 'ObjectId (FK)';

        columns.push({
          name: colName,
          type,
          isPrimaryKey: colName === '_id',
          isNullable: !/required:\s*true/i.test(details),
          isUnique: /unique:\s*true/i.test(details),
          defaultValue: null,
          sampleValue: this.generateDefaultValueForType(colName, type),
          description: `MongoDB Field`
        });
      }

      if (columns.length > 0) {
        // Mongoose always injects an implicit _id ObjectId primary key
        if (!columns.some((c) => c.name === '_id')) {
          columns.unshift({
            name: '_id',
            type: 'ObjectId',
            isPrimaryKey: true,
            isNullable: false,
            isUnique: true,
            defaultValue: 'ObjectId()',
            sampleValue: '65e89a01f92e4c001a4b',
            description: 'MongoDB implicit primary key'
          });
        }
        const canonical = this.findTableKey(schemaName) ? this.tables[this.findTableKey(schemaName)].name : schemaName.toLowerCase();
        this.upsertTable(schemaName, {
          name: canonical,
          modelName: schemaName,
          databaseType: 'MongoDB (Mongoose NoSQL)',
          sourceFile: filePath,
          sourceType: 'Mongoose Schema',
          columns,
          foreignKeys: [],
          primaryKey: '_id',
          sampleRows: []
        });
      }
    }

    // 2. TypeORM Entity (@Entity('name') or bare @Entity; class body extracted
    // with balanced braces so @Column({...}) options no longer truncate it)
    const entityHeadRe = /@Entity\s*(?:\(\s*['"]?([a-zA-Z0-9_]*)['"]?\s*\))?\s*(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = entityHeadRe.exec(content)) !== null) {
      const explicitName = match[1];
      const className = match[2];
      const tableName = explicitName || className.toLowerCase();
      const braceIdx = content.indexOf('{', match.index);
      const ex = this.extractBalanced(content, braceIdx, '{', '}');
      if (!ex) continue;
      const body = ex.body;
      entityHeadRe.lastIndex = ex.endIndex;
      const columns = [];
      const foreignKeys = [];

      // Each column: decorator (@PrimaryGeneratedColumn / @PrimaryColumn /
      // @Column({...})) followed by `field: type`
      const colRegex = /@(PrimaryGeneratedColumn|PrimaryColumn|Column)\s*(\([^)]*\))?\s*([a-zA-Z0-9_]+)(\?)?:\s*([a-zA-Z0-9_<>[\]]+)/g;
      let colMatch;

      while ((colMatch = colRegex.exec(body)) !== null) {
        const decorator = colMatch[1];
        const decoratorArgs = colMatch[2] || '';
        const isPK = decorator === 'PrimaryGeneratedColumn' || decorator === 'PrimaryColumn';
        const nameAttr = decoratorArgs.match(/name\s*:\s*['"`]([a-zA-Z0-9_]+)['"`]/);
        const colName = nameAttr ? nameAttr[1] : colMatch[3];
        const colType = colMatch[5];
        const optional = !!colMatch[4];

        columns.push({
          name: colName,
          type: colType.toUpperCase(),
          isPrimaryKey: isPK,
          isNullable: isPK ? false : (optional || !/nullable\s*:\s*false/i.test(decoratorArgs)),
          isUnique: /unique\s*:\s*true/i.test(decoratorArgs),
          defaultValue: isPK ? 'generated' : null,
          sampleValue: this.generateDefaultValueForType(colName, colType),
          description: `TypeORM field ${colName}`
        });
      }

      if (columns.length > 0) {
        this.upsertTable(tableName, {
          name: this.findTableKey(tableName) ? this.tables[this.findTableKey(tableName)].name : tableName,
          modelName: className,
          databaseType: 'TypeORM Entity (Postgres/MySQL)',
          sourceFile: filePath,
          sourceType: 'TypeORM Entity',
          columns,
          foreignKeys,
          primaryKey: columns.find(c => c.isPrimaryKey)?.name || 'id',
          sampleRows: []
        });
      }
    }
  }

  parseJSONFixture(content, baseName) {
    try {
      const data = JSON.parse(content);
      const tableName = baseName.replace(/\.(json|seed|fixture)$/g, '').replace(/_seed|_fixture/g, '');
      if (Array.isArray(data) && data.length > 0) {
        this.sampleData[tableName] = data;
      }
    } catch {}
  }

  generateDefaultValueForType(colName, colType) {
    const name = colName.toLowerCase();
    const type = (colType || '').toString().toLowerCase();

    if (name === 'id' || name === '_id' || name.endsWith('_id')) return '101';
    if (name.includes('email')) return 'user@example.com';
    if (name.includes('name') || name.includes('title')) return 'John Doe';
    if (name.includes('price') || name.includes('amount') || name.includes('total')) return '49.99';
    if (name.includes('status')) return 'active';
    if (name.includes('quantity') || name.includes('count') || name.includes('stock')) return '10';
    if (name.includes('date') || name.includes('time') || name.includes('at')) return '2026-08-23 10:30:00';
    if (name.includes('is_') || name.includes('has_') || type.includes('bool')) return 'true';
    if (type.includes('int') || type.includes('number')) return '1';
    if (type.includes('json')) return '{"key": "value"}';
    return 'sample_val';
  }

  generateFallbackSampleValues() {
    for (const table of Object.values(this.tables)) {
      if (!table.sampleRows || table.sampleRows.length === 0) {
        const row1 = {};
        const row2 = {};
        for (const col of table.columns) {
          row1[col.name] = col.sampleValue || this.generateDefaultValueForType(col.name, col.type);
          row2[col.name] = col.name === 'id' ? '102' : (col.sampleValue || this.generateDefaultValueForType(col.name, col.type));
        }
        table.sampleRows = [row1, row2];
      }
    }
  }

  inferRelations() {
    this.relations = [];
    const tableKeys = Object.keys(this.tables);
    const relationKeys = new Set();

    const addRelation = (relation) => {
      const key = [relation.sourceTable, relation.sourceColumn, relation.targetTable, relation.targetColumn]
        .map(value => String(value || '').toLowerCase()).join(':');
      if (!relationKeys.has(key)) {
        relationKeys.add(key);
        this.relations.push(relation);
      }
    };

    for (const [tableName, table] of Object.entries(this.tables)) {
      for (const fk of table.foreignKeys || []) {
        const target = this.resolveTableRef(fk.targetTable);
        addRelation({
          sourceTable: tableName,
          sourceColumn: fk.column,
          targetTable: target,
          targetColumn: fk.targetColumn || 'id',
          type: '1:N',
          label: `${tableName}.${fk.column} -> ${target}.${fk.targetColumn || 'id'}`
        });
      }

      for (const col of table.columns) {
        if (col.name.endsWith('_id') && !table.foreignKeys.some(f => f.column === col.name)) {
          const prefix = col.name.replace(/_id$/, '');
          const target = tableKeys.find(t => 
            t.toLowerCase() === prefix.toLowerCase() ||
            t.toLowerCase() === `${prefix}s`.toLowerCase() ||
            t.toLowerCase() === `${prefix}es`.toLowerCase()
          );

          if (target && target !== tableName) {
            addRelation({
              sourceTable: tableName,
              sourceColumn: col.name,
              targetTable: target,
              targetColumn: 'id',
              type: '1:N (Inferred)',
              label: `${tableName}.${col.name} -> ${target}.id`
            });
          }
        }
      }
    }
  }
}

module.exports = SchemaParser;
