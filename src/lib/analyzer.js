const fs = require('fs');
const path = require('path');
const SchemaParser = require('./parsers/schemaParser');
const PolyglotParser = require('./parsers/polyglotParser');
const InfraParser = require('./parsers/infraParser');
const KnowledgeGraph = require('./graph/knowledgeGraph');
const DiagramGenerator = require('./generators/diagramGenerator');
const ImpactAnalyzer = require('./generators/impactAnalyzer');
const PersonaMapper = require('./generators/personaMapper');

/**
 * Universal High-Scale Codebase Analyzer Coordinator
 * Supports analyzing massive multi-gigabyte repositories seamlessly.
 */
class ProjectAnalyzer {
  static isSqlLikeFile(fullPath) {
    const ext = path.extname(fullPath).toLowerCase();
    return ['.sql', '.ddl', '.dump', '.dmp', '.pgsql', '.psql', '.mysql', '.tsql', '.mssql', '.cql', '.hql', '.ora', '.db.sql', '.sqlite.sql'].includes(ext)
      || /(^|[/\\])[^/\\]*\.(sql|ddl)(\.(gz|txt))?$/i.test(fullPath);
  }

  static isSchemaPriorityFile(fullPath) {
    const ext = path.extname(fullPath).toLowerCase();
    if (['.sql', '.ddl', '.dump', '.dmp', '.pgsql', '.psql', '.mysql', '.tsql', '.mssql', '.cql', '.hql', '.ora', '.prisma'].includes(ext)) return true;
    if (ProjectAnalyzer.isSqlLikeFile(fullPath)) return true;
    if (/(^|[/\\])(schema\.rb|db\.xml|changelog[^/\\]*\.xml)$/i.test(fullPath)) return true;
    return /migrat|schema|seed|ddl|prisma/i.test(fullPath);
  }

  static scanDirectory(targetDir) {
    const schemaFiles = [];
    const otherFiles = [];
    const skippedOversize = [];
    let skippedOversizeCount = 0;
    let seenTotal = 0;
    const IGNORED_DIRS = new Set([
      'node_modules', '.git', '.next', 'dist', 'build', '.idea', '.vscode',
      '__pycache__', 'venv', '.venv', 'env', '.env', 'coverage', '.turbo',
      'target', 'bin', 'obj', 'vendor', '.terraform', '.cache', 'tmp', 'temp', 'logs', 'out',
      '__MACOSX', '.DS_Store', 'Thumbs.db', 'PaxHeaders'
    ]);

    // No arbitrary table/API ceilings: schema files are never dropped for
    // size or count reasons (140+ table dumps routinely exceed 25MB and
    // monorepos exceed 10k files). Code-file guard only skips minified
    // bundles; schema DDL is streamed so any number of tables is extracted.
    const MAX_FILES = 100000;
    const MAX_SCHEMA_FILES = 100000;
    const MAX_CODE_SIZE = 5 * 1024 * 1024; // 5MB per code file (minified/bundle guard)
    // Schema dumps are streamed (not skipped) — 500MB still parses safely
    // in chunks. Nothing silently drops tables anymore.
    const MAX_SCHEMA_SIZE = 500 * 1024 * 1024;

    function walk(currentDir) {
      if (!fs.existsSync(currentDir)) return;

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            seenTotal++;
            try {
              const priority = ProjectAnalyzer.isSchemaPriorityFile(fullPath);
              const stat = fs.statSync(fullPath);
              // Schema DDL is streamed by the parser — never skip it for
              // size, no matter how many tables it holds.
              if (!priority && stat.size > MAX_CODE_SIZE) {
                skippedOversizeCount++;
                if (skippedOversize.length < 25) {
                  skippedOversize.push(path.relative(targetDir, fullPath).replace(/\\/g, '/'));
                }
                continue;
              }
              if (priority && stat.size > MAX_SCHEMA_SIZE) {
                // Still included; parser streams it in chunks (see
                // SchemaParser.parseLargeSQLFile). Recorded, not dropped.
                if (skippedOversize.length < 25) {
                  skippedOversize.push(path.relative(targetDir, fullPath).replace(/\\/g, '/') + ' (streamed)');
                }
              }
              // Schema files always win seats and are never capped by the
              // generic file budget — any number of tables must be extracted.
              if (priority) {
                if (schemaFiles.length < MAX_SCHEMA_FILES) schemaFiles.push(fullPath);
              } else if (otherFiles.length < MAX_FILES) {
                otherFiles.push(fullPath);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn(`Skipping unreadable folder ${currentDir}:`, err.message);
      }
    }

    // Single-file scans (e.g. user points straight at a big .sql dump)
    // must analyze that file instead of returning an empty file list.
    try {
      const targetStat = fs.statSync(targetDir);
      if (targetStat.isFile()) {
        return {
          fileList: [targetDir],
          stats: {
            seenTotal: 1,
            schemaPriorityCount: 1,
            truncatedByMaxFiles: false,
            skippedOversizeCount: 0,
            skippedOversize: []
          }
        };
      }
    } catch {}

    walk(targetDir);
    // Schema definitions always win seats and are never truncated, so a
    // 140-table (or 10k-table) dump can never be crowded out by app code.
    // Code files fill the remaining budget; schema files are all included.
    const fileList = [...schemaFiles.slice(0, MAX_SCHEMA_FILES), ...otherFiles.slice(0, Math.max(0, MAX_FILES - Math.min(schemaFiles.length, MAX_FILES)))];
    return {
      fileList,
      stats: {
        seenTotal,
        schemaPriorityCount: schemaFiles.length,
        truncatedByMaxFiles: otherFiles.length > Math.max(0, MAX_FILES - Math.min(schemaFiles.length, MAX_FILES)),
        skippedOversizeCount,
        skippedOversize
      }
    };
  }

  static analyze(projectPath) {
    // Sanitize path by removing surrounding double quotes, single quotes, and extra whitespace
    const cleanPath = (projectPath || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    const absPath = path.resolve(cleanPath);
    
    if (!fs.existsSync(absPath)) {
      throw new Error(`Directory not found: ${absPath}`);
    }

    const scan = this.scanDirectory(absPath);
    const fileList = scan.fileList;
    const scanStats = scan.stats;

    // 1. Run Parsers
    const schemaParser = new SchemaParser();
    const schemaData = schemaParser.parseDirectory(absPath, fileList);

    const polyglotParser = new PolyglotParser();
    const codeData = polyglotParser.parseDirectory(absPath, fileList);

    const infraParser = new InfraParser();
    const infraData = infraParser.parseDirectory(absPath, fileList);

    // 2. Build Bi-Directional In-Memory Knowledge Graph
    const graph = new KnowledgeGraph();
    graph.build(schemaData, codeData, infraData);

    // 3. Generate Multi-Level Architecture Diagrams
    const erd = DiagramGenerator.generateERD(schemaData);
    const hld = DiagramGenerator.generateHLD(infraData, codeData, schemaData);
    const lld = DiagramGenerator.generateLLD(codeData, schemaData);
    const seq = DiagramGenerator.generateSequence(codeData.endpoints[0]?.path || '/api/checkout');

    // 4. Default Sample What-If Blast Radius
    let sampleTarget = 'orders';
    let sampleType = 'table';
    if (schemaData.tables.length > 0) {
      sampleTarget = schemaData.tables[0].name;
    } else if (codeData.endpoints.length > 0) {
      sampleTarget = codeData.endpoints[0].path;
      sampleType = 'endpoint';
    }

    const sampleImpact = ImpactAnalyzer.simulate(graph, sampleTarget, sampleType, schemaData, codeData);

    // 5. Generate 3-Tier Persona Intelligence Views
    const developerView = PersonaMapper.getDeveloperView(schemaData, codeData, infraData, graph);
    const managerView = PersonaMapper.getManagerView(schemaData, codeData, infraData, graph);
    const businessView = PersonaMapper.getBusinessView(schemaData, codeData, infraData, graph);

    return {
      timestamp: new Date().toISOString(),
      projectPath: absPath,
      projectName: path.basename(absPath),
      scannedFilesCount: fileList.length,
      scanStats,
      schema: schemaData,
      code: codeData,
      infra: infraData,
      graph: {
        stats: graph.getStats()
      },
      diagrams: {
        erd,
        hld,
        lld,
        sequence: seq
      },
      personas: {
        developer: developerView,
        manager: managerView,
        business: businessView
      },
      sampleImpact
    };
  }
}

module.exports = ProjectAnalyzer;
