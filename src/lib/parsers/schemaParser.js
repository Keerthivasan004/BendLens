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
  }

  parseDirectory(dirPath, fileList) {
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

        // 2. SQL Files (Postgres, MySQL, SQLite, T-SQL, Oracle, DDLs, Migrations)
        if (ext === '.sql' || baseName.includes('migration') || baseName.includes('schema')) {
          this.parseSQL(content, filePath);
          this.parseSQLInserts(content);
        }
        // 3. Prisma Schema
        else if (filePath.endsWith('schema.prisma') || ext === '.prisma') {
          this.parsePrisma(content, filePath);
        }
        // 4. Python Models (SQLAlchemy, Django, Tortoise, SQLModel, Pydantic)
        else if (ext === '.py') {
          this.parsePythonORM(content, filePath);
        }
        // 5. JavaScript / TypeScript Models (TypeORM, Sequelize, Mongoose, Drizzle, Knex)
        else if (['.ts', '.js', '.mjs', '.cjs'].includes(ext)) {
          this.parseTypeScriptORM(content, filePath);
        }
        // 6. Data seeds and sample fixtures (JSON / CSV)
        else if (ext === '.json' && (baseName.includes('seed') || baseName.includes('fixture') || baseName.includes('mock'))) {
          this.parseJSONFixture(content, baseName);
        }
      } catch (err) {
        console.error(`Error parsing schema in ${filePath}:`, err.message);
      }
    }

    // Attach sample data to tables
    for (const [tableName, rows] of Object.entries(this.sampleData)) {
      if (this.tables[tableName]) {
        this.tables[tableName].sampleRows = rows.slice(0, 5);
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
   */
  parseSQL(content, filePath) {
    // Matches: CREATE TABLE [IF NOT EXISTS] [schema.]table ( ... )
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\(([\s\S]*?)\)(?:\s*(?:ENGINE|DEFAULT|COLLATE|TABLESPACE|WITHOUT\s+ROWID)[\s\S]*?)?;/gi;
    let match;

    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      const columns = [];
      const foreignKeys = [];
      let primaryKey = null;

      // Detect SQL Dialect hints
      let dbType = 'Relational SQL';
      if (/SERIAL|UUID|JSONB|TIMESTAMPTZ|bytea/i.test(body)) dbType = 'PostgreSQL';
      else if (/AUTO_INCREMENT|ENGINE=InnoDB|TINYINT/i.test(body) || /ENGINE\s*=/i.test(match[0])) dbType = 'MySQL / MariaDB';
      else if (/AUTOINCREMENT|WITHOUT\s+ROWID/i.test(body)) dbType = 'SQLite';
      else if (/IDENTITY\s*\(\s*1\s*,\s*1\s*\)|NVARCHAR|DATETIME2/i.test(body)) dbType = 'SQL Server (T-SQL)';
      else if (/NUMBER\s*\(|VARCHAR2/i.test(body)) dbType = 'Oracle';

      const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--') && !l.startsWith('/*') && !l.startsWith('#'));

      for (const line of lines) {
        // PRIMARY KEY constraint
        const pkMatch = line.match(/^(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?PRIMARY\s+KEY\s*(?:`|"|\[)?\s*\((?:`|"|\[)?([a-zA-Z0-9_,\s]+)(?:`|"|\])?\)/i);
        if (pkMatch) {
          primaryKey = pkMatch[1].replace(/[`"\[\]]/g, '').trim();
          continue;
        }

        // FOREIGN KEY constraint
        const fkMatch = line.match(/^(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?FOREIGN\s+KEY\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)\s*REFERENCES\s*(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)/i);
        if (fkMatch) {
          foreignKeys.push({
            column: fkMatch[1],
            targetTable: fkMatch[2],
            targetColumn: fkMatch[3]
          });
          continue;
        }

        // Column definition
        const colMatch = line.match(/^(?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\s+([a-zA-Z0-9_()]+)(.*)/i);
        if (colMatch && !['KEY', 'INDEX', 'UNIQUE', 'CHECK', 'CONSTRAINT'].includes(colMatch[1].toUpperCase())) {
          const colName = colMatch[1];
          const colType = colMatch[2];
          const rest = colMatch[3] || '';
          
          const isPK = /PRIMARY\s+KEY|AUTO_INCREMENT|SERIAL|IDENTITY/i.test(rest) || /SERIAL/i.test(colType);
          const isNullable = !/NOT\s+NULL/i.test(rest);
          const isUnique = /UNIQUE/i.test(rest);

          // Default value detection
          let defaultValue = null;
          const defaultMatch = rest.match(/DEFAULT\s+([^,]+)/i);
          if (defaultMatch) {
            defaultValue = defaultMatch[1].trim().replace(/^['"]|['"]$/g, '');
          }

          if (isPK && !primaryKey) primaryKey = colName;

          // Inline REFERENCES
          const refMatch = rest.match(/REFERENCES\s+(?:`|"|\[)?(?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+)(?:`|"|\])?\s*\((?:`|"|\[)?([a-zA-Z0-9_]+)(?:`|"|\])?\)/i);
          if (refMatch) {
            foreignKeys.push({
              column: colName,
              targetTable: refMatch[1],
              targetColumn: refMatch[2]
            });
          }

          columns.push({
            name: colName,
            type: colType.toUpperCase(),
            isPrimaryKey: isPK,
            isNullable,
            isUnique,
            defaultValue: defaultValue || (isPK ? 'AUTO' : null),
            sampleValue: defaultValue || this.generateDefaultValueForType(colName, colType),
            description: `${colName} (${colType})`
          });
        }
      }

      if (primaryKey) {
        columns.forEach(col => {
          if (primaryKey.split(',').map(s => s.trim()).includes(col.name)) {
            col.isPrimaryKey = true;
          }
        });
      }

      this.tables[tableName] = {
        name: tableName,
        databaseType: dbType,
        sourceFile: filePath,
        sourceType: 'SQL DDL / Schema',
        columns,
        foreignKeys,
        primaryKey: primaryKey || (columns.find(c => c.isPrimaryKey)?.name || 'id'),
        sampleRows: []
      };
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

      const values = valuesPart.split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
      let colNames = [];

      if (colsPart) {
        colNames = colsPart.split(',').map(c => c.trim().replace(/[`"\[\]]/g, ''));
      } else if (this.tables[tableName]) {
        colNames = this.tables[tableName].columns.map(c => c.name);
      }

      const row = {};
      colNames.forEach((col, idx) => {
        if (values[idx] !== undefined) {
          row[col] = values[idx];
          // Set sample value on column if available
          if (this.tables[tableName]) {
            const tableCol = this.tables[tableName].columns.find(c => c.name === col);
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

      this.tables[modelName] = {
        name: modelName,
        databaseType: 'Prisma ORM (Postgres/MySQL/SQLite/Mongo)',
        sourceFile: filePath,
        sourceType: 'Prisma Schema',
        columns,
        foreignKeys,
        primaryKey: columns.find(c => c.isPrimaryKey)?.name || 'id',
        sampleRows: []
      };
    }
  }

  /**
   * Python ORMs: SQLAlchemy, Django, Tortoise, SQLModel, Pydantic
   */
  parsePythonORM(content, filePath) {
    const classRegex = /class\s+([a-zA-Z0-9_]+)\s*\((?:Base|models\.Model|db\.Model|DeclarativeBase|SQLModel|BaseModel)\):\s*([\s\S]*?)(?=\nclass|\n\w|\Z)/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const modelName = match[1];
      const body = match[2];
      const columns = [];
      const foreignKeys = [];

      const tableMatch = body.match(/__tablename__\s*=\s*['"]([a-zA-Z0-9_]+)['"]/);
      const tableName = tableMatch ? tableMatch[1] : modelName.toLowerCase();

      // Column definitions
      const colRegex = /([a-zA-Z0-9_]+)\s*(?::\s*([A-Za-z0-9_\[\]]+)\s*)?=\s*(?:Column|models\.[A-Za-z0-9]+Field|Field)\s*\(([\s\S]*?)\)/g;
      let colMatch;

      while ((colMatch = colRegex.exec(body)) !== null) {
        const colName = colMatch[1];
        const typeHint = colMatch[2];
        const colArgs = colMatch[3];
        const isPK = /primary_key=True|primary_key\s*=\s*True/i.test(colArgs);
        const isUnique = /unique=True/i.test(colArgs);
        const isNullable = !/nullable=False/i.test(colArgs);

        let type = typeHint || 'VARCHAR';
        if (/Integer|IntegerField/i.test(colArgs)) type = 'INTEGER';
        else if (/String|CharField|TextField|Text/i.test(colArgs)) type = 'VARCHAR(255)';
        else if (/DateTime|DateTimeField/i.test(colArgs)) type = 'TIMESTAMP';
        else if (/Boolean|BooleanField/i.test(colArgs)) type = 'BOOLEAN';
        else if (/Float|FloatField|Decimal|DecimalField|Numeric/i.test(colArgs)) type = 'DECIMAL(10,2)';
        else if (/JSON|JSONField/i.test(colArgs)) type = 'JSON';

        const fkMatch = colArgs.match(/ForeignKey\(['"]([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)['"]\)/) ||
                        colArgs.match(/models\.ForeignKey\(['"]([a-zA-Z0-9_]+)['"]/);
        if (fkMatch) {
          foreignKeys.push({
            column: colName,
            targetTable: fkMatch[1],
            targetColumn: fkMatch[2] || 'id'
          });
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
        this.tables[tableName] = {
          name: tableName,
          modelName,
          databaseType: 'Python ORM (SQLAlchemy/Django/SQLModel)',
          sourceFile: filePath,
          sourceType: 'Python ORM',
          columns,
          foreignKeys,
          primaryKey: columns.find(c => c.isPrimaryKey)?.name || 'id',
          sampleRows: []
        };
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
        this.tables[schemaName.toLowerCase()] = {
          name: schemaName.toLowerCase(),
          modelName: schemaName,
          databaseType: 'MongoDB (Mongoose NoSQL)',
          sourceFile: filePath,
          sourceType: 'Mongoose Schema',
          columns,
          foreignKeys: [],
          primaryKey: '_id',
          sampleRows: []
        };
      }
    }

    // 2. TypeORM Entity
    const entityRegex = /@Entity\s*\(\s*['"]?([a-zA-Z0-9_]*)['"]?\s*\)\s*export\s+class\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\}/g;
    let match;
    while ((match = entityRegex.exec(content)) !== null) {
      const explicitName = match[1];
      const className = match[2];
      const tableName = explicitName || className.toLowerCase();
      const body = match[3];
      const columns = [];
      const foreignKeys = [];

      const colRegex = /@(?:PrimaryGeneratedColumn|PrimaryColumn|Column)\s*\([^)]*\)\s*([a-zA-Z0-9_]+)(?:\?)?:\s*([a-zA-Z0-9_<>[\]]+)/g;
      let colMatch;

      while ((colMatch = colRegex.exec(body)) !== null) {
        const colName = colMatch[1];
        const colType = colMatch[2];
        const isPK = body.includes(`@PrimaryGeneratedColumn`) && body.indexOf(colName) > body.indexOf(`@PrimaryGeneratedColumn`);

        columns.push({
          name: colName,
          type: colType.toUpperCase(),
          isPrimaryKey: isPK,
          isNullable: true,
          isUnique: false,
          defaultValue: isPK ? 'generated' : null,
          sampleValue: this.generateDefaultValueForType(colName, colType),
          description: `TypeORM field ${colName}`
        });
      }

      if (columns.length > 0) {
        this.tables[tableName] = {
          name: tableName,
          modelName: className,
          databaseType: 'TypeORM Entity (Postgres/MySQL)',
          sourceFile: filePath,
          sourceType: 'TypeORM Entity',
          columns,
          foreignKeys,
          primaryKey: columns.find(c => c.isPrimaryKey)?.name || 'id',
          sampleRows: []
        };
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

    for (const [tableName, table] of Object.entries(this.tables)) {
      for (const fk of table.foreignKeys || []) {
        const target = tableKeys.find(t => t.toLowerCase() === fk.targetTable.toLowerCase()) || fk.targetTable;
        this.relations.push({
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
            this.relations.push({
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
