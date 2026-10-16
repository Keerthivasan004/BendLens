const fs = require('fs');
const path = require('path');
const SchemaParser = require('./parsers/schemaParser');
const PolyglotParser = require('./parsers/polyglotParser');
const InfraParser = require('./parsers/infraParser');
const KnowledgeGraph = require('./graph/knowledgeGraph');
const DiagramGenerator = require('./generators/diagramGenerator');
const ImpactAnalyzer = require('./generators/impactAnalyzer');
const PersonaMapper = require('./generators/personaMapper');

const yieldEventLoop = () => new Promise((resolve) => setImmediate(resolve));

/**
 * Universal High-Scale Codebase Analyzer Coordinator
 * Supports analyzing massive multi-gigabyte repositories seamlessly.
 */
class ProjectAnalyzer {
  static IGNORED_DIRS = new Set([
    'node_modules', '.git', '.next', 'dist', 'build', '.idea', '.vscode',
    '__pycache__', 'venv', '.venv', 'env', '.env', 'coverage', '.turbo',
    'target', 'bin', 'obj', 'vendor', '.terraform', '.cache', 'tmp', 'temp', 'logs', 'out',
    '__MACOSX', '.DS_Store', 'Thumbs.db', 'PaxHeaders',
    '.gradle', '.m2', 'Pods', 'Carthage', 'DerivedData',
    '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox', 'site-packages',
    '.yarn', '.pnpm-store', 'bower_components', '.parcel-cache',
    '.docusaurus', 'storybook-static', '.nuxt', '.svelte-kit', '.output',
    'playwright-report', 'test-results', 'cypress', '.nyc_output',
    '.serverless', '.sst', '.aws-sam'
  ]);

  static IGNORED_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.bmp', '.tiff', '.svg', '.psd', '.ai',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm', '.ogg', '.flac', '.m4a',
    '.zip', '.tar', '.gz', '.tgz', '.7z', '.rar', '.bz2', '.xz',
    '.exe', '.dll', '.so', '.dylib', '.bin', '.iso', '.wasm', '.class', '.jar', '.war',
    '.pdf', '.map', '.log', '.txt', '.md', '.markdown', '.mdx', '.rst', '.doc', '.docx',
    '.css', '.scss', '.sass', '.less', '.styl',
    '.html', '.htm',
    '.lock', '.sum', '.patch', '.diff'
  ]);

  static isSqlLikeFile(fullPath) {
    const ext = path.extname(fullPath).toLowerCase();
    return ['.sql', '.ddl', '.dump', '.dmp', '.pgsql', '.psql', '.mysql', '.tsql', '.mssql', '.cql', '.hql', '.ora', '.db.sql', '.sqlite.sql'].includes(ext)
      || /(^|[/\\])[^/\\]*\.(sql|ddl)(\.(gz|txt))?$/i.test(fullPath);
  }

  static isSchemaPriorityFile(fullPath) {
    const ext = path.extname(fullPath).toLowerCase();
    if (['.sql', '.ddl', '.dump', '.dmp', '.pgsql', '.psql', '.mysql', '.tsql', '.mssql', '.cql', '.hql', '.ora', '.prisma', '.sqlite', '.sqlite3', '.db'].includes(ext)) return true;
    if (ProjectAnalyzer.isSqlLikeFile(fullPath)) return true;
    if (/(^|[/\\])(schema\.rb|db\.xml|changelog[^/\\]*\.xml)$/i.test(fullPath)) return true;
    return /migrat|schema|seed|ddl|prisma/i.test(fullPath);
  }

  static isIgnoredDirectory(dirName) {
    if (ProjectAnalyzer.IGNORED_DIRS.has(dirName)) return true;
    const lower = dirName.toLowerCase();
    // Exclude automated browser test profiles and scratch caches
    if (lower.startsWith('edge_profile') || lower.startsWith('chrome_profile')) return true;
    if (lower === 'gpucache' || lower === 'dawnwebgpucache' || lower === 'dawngraphitecache' || lower === 'blob_storage' || lower === 'indexeddb') return true;
    return false;
  }

  static isIgnoredAssetFile(fullPath) {
    const ext = path.extname(fullPath).toLowerCase();
    if (ProjectAnalyzer.IGNORED_EXTS.has(ext)) return true;
    if (/[\\/](?:edge_profile[^\\]*|chrome_profile[^\\]*)[\\/]/i.test(fullPath)) return true;
    return false;
  }

  static isIgnoredCodeFile(fullPath) {
    const base = path.basename(fullPath).toLowerCase();
    // TypeScript declarations have no executable schema or runtime endpoints
    if (base.endsWith('.d.ts') || base.endsWith('.d.mts') || base.endsWith('.d.cts')) return true;
    // Minified JS/CSS bundles (e.g. mermaid.min.js, bundle.min.js, chunk-xyz.min.js)
    if (/\.(?:min|bundle|chunk|vendor)\.(?:js|mjs|cjs)$/i.test(base)) return true;
    if (base.endsWith('.js.map') || base.endsWith('.css.map')) return true;
    return false;
  }

  static isInfraTarget(fullPath) {
    const base = path.basename(fullPath).toLowerCase();
    return base === 'docker-compose.yml' ||
      base === 'docker-compose.yaml' ||
      base === 'dockerfile' ||
      base.startsWith('dockerfile.') ||
      base.includes('openapi') ||
      base.includes('swagger') ||
      base.includes('api-docs') ||
      base.includes('api-spec') ||
      base === 'package.json' ||
      base === 'requirements.txt';
  }

  static isCodeCandidate(fullPath) {
    const ext = path.extname(fullPath).toLowerCase();
    const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.java', '.go', '.cs', '.php', '.rb']);
    return CODE_EXTS.has(ext);
  }

  static isRelevantFile(fullPath) {
    if (ProjectAnalyzer.isIgnoredAssetFile(fullPath)) return false;
    if (ProjectAnalyzer.isSchemaPriorityFile(fullPath)) return true;
    if (ProjectAnalyzer.isIgnoredCodeFile(fullPath)) return false;
    if (ProjectAnalyzer.isCodeCandidate(fullPath)) return true;
    if (ProjectAnalyzer.isInfraTarget(fullPath)) return true;
    const ext = path.extname(fullPath).toLowerCase();
    const base = path.basename(fullPath).toLowerCase();
    if (ext === '.json' && (base.includes('seed') || base.includes('fixture') || base.includes('mock'))) return true;
    if (ext === '.xml' && (base.includes('liquibase') || base.includes('changelog') || base === 'db.xml')) return true;
    if (ext === '.csv' && (base.includes('seed') || base.includes('fixture') || base.includes('mock'))) return true;
    return false;
  }

  /**
   * Asynchronous directory scan.
   *
   * Performance-critical design decisions for massive repositories:
   * - Uses `fs.promises.readdir` with `withFileTypes` so no extra `stat()`
   *   round-trips are needed to distinguish files from directories.
   * - Directory reads run CONCURRENTLY (bounded pool) instead of a serial
   *   BFS queue — on network drives / slow disks this is a large win.
   * - ZERO per-file `fs.stat()` calls whenever possible: `Dirent` entries
   *   expose a size hint straight from the directory listing on platforms
   *   that support it (Windows returns real sizes; POSIX returns 0/undefined).
   *   When no hint exists we fall back to ONE batched `lstat()` wave per
   *   directory via `Promise.all` — parallel, bounded, and event-loop
   *   friendly, unlike a serialized or unbounded stat storm.
   * - Oversize files are still detected and reported exactly like the
   *   synchronous scanner, so results remain identical.
   */
  static async scanDirectoryAsync(targetDir) {
    const schemaFiles = [];
    const codeFiles = [];
    const infraFiles = [];
    const otherFiles = [];
    const skippedOversize = [];
    let skippedOversizeCount = 0;
    let seenTotal = 0;

    const MAX_FILES = 100000;
    const MAX_SCHEMA_FILES = 100000;
    const MAX_CODE_SIZE = 5 * 1024 * 1024;
    const MAX_SCHEMA_SIZE = 500 * 1024 * 1024;
    const DIR_CONCURRENCY = 32; // parallel readdir operations

    // Single-file scans
    try {
      const targetStat = await fs.promises.stat(targetDir);
      if (targetStat.isFile()) {
        const isPriority = ProjectAnalyzer.isSchemaPriorityFile(targetDir);
        const isCode = ProjectAnalyzer.isCodeCandidate(targetDir);
        const isInfra = ProjectAnalyzer.isInfraTarget(targetDir);
        return {
          fileList: [targetDir],
          categorized: {
            schemaFiles: isPriority ? [targetDir] : [],
            codeFiles: isCode ? [targetDir] : [],
            infraFiles: isInfra ? [targetDir] : []
          },
          stats: {
            seenTotal: 1,
            schemaPriorityCount: isPriority ? 1 : 0,
            truncatedByMaxFiles: false,
            skippedOversizeCount: 0,
            skippedOversize: []
          }
        };
      }
    } catch {}

    const categorize = (fullPath, priority) => {
      if (priority) {
        if (schemaFiles.length < MAX_SCHEMA_FILES) schemaFiles.push(fullPath);
      }
      if (ProjectAnalyzer.isCodeCandidate(fullPath)) {
        if (codeFiles.length < MAX_FILES) codeFiles.push(fullPath);
      } else if (ProjectAnalyzer.isInfraTarget(fullPath)) {
        if (infraFiles.length < MAX_FILES) infraFiles.push(fullPath);
      } else if (!priority && otherFiles.length < MAX_FILES) {
        otherFiles.push(fullPath);
      }
    };

    const handleRelevantFile = (fullPath, size, priority) => {
      if (!priority && size > MAX_CODE_SIZE) {
        skippedOversizeCount++;
        if (skippedOversize.length < 25) {
          skippedOversize.push(path.relative(targetDir, fullPath).replace(/\\/g, '/'));
        }
        return;
      }
      if (priority && size > MAX_SCHEMA_SIZE) {
        if (skippedOversize.length < 25) {
          skippedOversize.push(path.relative(targetDir, fullPath).replace(/\\/g, '/') + ' (streamed)');
        }
      }
      categorize(fullPath, priority);
    };

    // Concurrent directory walker: pending dirs are processed in bounded
    // batches so many folders are read from disk in parallel, while the
    // libuv thread pool stays responsive for the rest of the app.
    // `pending` is the FIFO of not-yet-read directories; `nextFrontier`
    // accumulates subdirectories discovered during the current wave.
    let frontier = [targetDir];
    let pending = [];
    let processedSinceYield = 0;

    while (frontier.length > 0 || pending.length > 0) {
      if (frontier.length === 0) frontier = pending.splice(0, pending.length);

      const batch = frontier.splice(0, DIR_CONCURRENCY);
      const results = await Promise.all(batch.map(async (dir) => {
        try {
          return await fs.promises.readdir(dir, { withFileTypes: true });
        } catch (err) {
          console.warn(`Skipping unreadable folder ${dir}:`, err.message);
          return null;
        }
      }));

      for (let b = 0; b < batch.length; b++) {
        const dir = batch[b];
        const entries = results[b];
        if (!entries) continue;

        // Pass 1: pure in-memory classification (no syscalls at all).
        const relevant = []; // { fullPath, size, priority } | { fullPath, needStat: true, priority }
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (!ProjectAnalyzer.isIgnoredDirectory(entry.name) && !entry.name.startsWith('.')) {
              pending.push(path.join(dir, entry.name));
            }
            continue;
          }
          if (!entry.isFile()) continue;

          seenTotal++;

          const fullPath = path.join(dir, entry.name);
          // High-speed pre-filtering: skip non-relevant assets entirely
          if (!ProjectAnalyzer.isRelevantFile(fullPath)) continue;

          const priority = ProjectAnalyzer.isSchemaPriorityFile(fullPath);
          const hintedSize = typeof entry.size === 'number' ? entry.size : 0;
          if (hintedSize > 0) {
            // Windows & friends give us the size straight from readdir.
            relevant.push({ fullPath, size: hintedSize, priority });
          } else {
            relevant.push({ fullPath, needStat: true, priority });
          }
        }

        // Pass 2: ONE batched lstat() per directory for the few files
        // that actually need an oversize check (POSIX fallback).
        const needStat = relevant.filter((r) => r.needStat);
        if (needStat.length > 0) {
          const stats = await Promise.all(
            needStat.map((r) =>
              fs.promises.lstat(r.fullPath).then((s) => s.size).catch(() => -1)
            )
          );
          needStat.forEach((r, idx) => { r.size = stats[idx]; });
        }

        for (const r of relevant) {
          if (r.size === -1) continue; // vanished/unreadable file
          handleRelevantFile(r.fullPath, r.size, r.priority);
        }
      }

      processedSinceYield++;
      if (processedSinceYield % 8 === 0) await yieldEventLoop();
    }

    const fileList = [
      ...schemaFiles.slice(0, MAX_SCHEMA_FILES),
      ...codeFiles.slice(0, Math.max(0, MAX_FILES - Math.min(schemaFiles.length, MAX_FILES))),
      ...infraFiles,
      ...otherFiles
    ];

    return {
      fileList,
      categorized: {
        schemaFiles: schemaFiles.slice(0, MAX_SCHEMA_FILES),
        codeFiles: codeFiles.slice(0, MAX_FILES),
        infraFiles
      },
      stats: {
        seenTotal,
        schemaPriorityCount: schemaFiles.length,
        truncatedByMaxFiles: codeFiles.length > Math.max(0, MAX_FILES - Math.min(schemaFiles.length, MAX_FILES)),
        skippedOversizeCount,
        skippedOversize
      }
    };
  }

  static scanDirectory(targetDir) {
    const schemaFiles = [];
    const codeFiles = [];
    const infraFiles = [];
    const otherFiles = [];
    const skippedOversize = [];
    let skippedOversizeCount = 0;
    let seenTotal = 0;

    const MAX_FILES = 100000;
    const MAX_SCHEMA_FILES = 100000;
    const MAX_CODE_SIZE = 5 * 1024 * 1024;
    const MAX_SCHEMA_SIZE = 500 * 1024 * 1024;

    function walk(currentDir) {
      if (!fs.existsSync(currentDir)) return;

      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            if (!ProjectAnalyzer.IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            seenTotal++;

            if (!ProjectAnalyzer.isRelevantFile(fullPath)) {
              continue;
            }

            try {
              const priority = ProjectAnalyzer.isSchemaPriorityFile(fullPath);
              const stat = fs.statSync(fullPath);

              if (!priority && stat.size > MAX_CODE_SIZE) {
                skippedOversizeCount++;
                if (skippedOversize.length < 25) {
                  skippedOversize.push(path.relative(targetDir, fullPath).replace(/\\/g, '/'));
                }
                continue;
              }

              if (priority && stat.size > MAX_SCHEMA_SIZE) {
                if (skippedOversize.length < 25) {
                  skippedOversize.push(path.relative(targetDir, fullPath).replace(/\\/g, '/') + ' (streamed)');
                }
              }

              if (priority) {
                if (schemaFiles.length < MAX_SCHEMA_FILES) schemaFiles.push(fullPath);
              }
              if (ProjectAnalyzer.isCodeCandidate(fullPath)) {
                if (codeFiles.length < MAX_FILES) codeFiles.push(fullPath);
              } else if (ProjectAnalyzer.isInfraTarget(fullPath)) {
                if (infraFiles.length < MAX_FILES) infraFiles.push(fullPath);
              } else if (!priority && otherFiles.length < MAX_FILES) {
                otherFiles.push(fullPath);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn(`Skipping unreadable folder ${currentDir}:`, err.message);
      }
    }

    try {
      const targetStat = fs.statSync(targetDir);
      if (targetStat.isFile()) {
        const isPriority = ProjectAnalyzer.isSchemaPriorityFile(targetDir);
        const isCode = ProjectAnalyzer.isCodeCandidate(targetDir);
        const isInfra = ProjectAnalyzer.isInfraTarget(targetDir);
        return {
          fileList: [targetDir],
          categorized: {
            schemaFiles: isPriority ? [targetDir] : [],
            codeFiles: isCode ? [targetDir] : [],
            infraFiles: isInfra ? [targetDir] : []
          },
          stats: {
            seenTotal: 1,
            schemaPriorityCount: isPriority ? 1 : 0,
            truncatedByMaxFiles: false,
            skippedOversizeCount: 0,
            skippedOversize: []
          }
        };
      }
    } catch {}

    walk(targetDir);
    const fileList = [
      ...schemaFiles.slice(0, MAX_SCHEMA_FILES),
      ...codeFiles.slice(0, Math.max(0, MAX_FILES - Math.min(schemaFiles.length, MAX_FILES))),
      ...infraFiles,
      ...otherFiles
    ];

    return {
      fileList,
      categorized: {
        schemaFiles: schemaFiles.slice(0, MAX_SCHEMA_FILES),
        codeFiles: codeFiles.slice(0, MAX_FILES),
        infraFiles
      },
      stats: {
        seenTotal,
        schemaPriorityCount: schemaFiles.length,
        truncatedByMaxFiles: codeFiles.length > Math.max(0, MAX_FILES - Math.min(schemaFiles.length, MAX_FILES)),
        skippedOversizeCount,
        skippedOversize
      }
    };
  }

  static async analyzeAsync(projectPath) {
    const cleanPath = (projectPath || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    const absPath = path.resolve(cleanPath);
    
    if (!fs.existsSync(absPath)) {
      throw new Error(`Directory not found: ${absPath}`);
    }

    const scan = await this.scanDirectoryAsync(absPath);
    const fileList = scan.fileList;
    const scanStats = scan.stats;
    await yieldEventLoop();

    const schemaTargetFiles = scan.categorized
      ? [...scan.categorized.schemaFiles, ...scan.categorized.codeFiles]
      : fileList;
    const codeTargetFiles = scan.categorized
      ? scan.categorized.codeFiles
      : fileList;
    const infraTargetFiles = scan.categorized
      ? scan.categorized.infraFiles
      : fileList;

    // 1. Run Parsers with event loop micro-yields
    const schemaParser = new SchemaParser();
    const schemaData = schemaParser.parseDirectory(absPath, schemaTargetFiles);
    await yieldEventLoop();

    const polyglotParser = new PolyglotParser();
    const codeData = polyglotParser.parseDirectory(absPath, codeTargetFiles);
    await yieldEventLoop();

    const infraParser = new InfraParser();
    const infraData = infraParser.parseDirectory(absPath, infraTargetFiles);
    await yieldEventLoop();

    // Merge external APIs discovered from OpenAPI / Swagger specs if not already present in code
    if (infraData && infraData.externalAPIs && infraData.externalAPIs.length > 0) {
      const existingKeys = new Set(codeData.endpoints.map(e => `${(e.method || 'GET').toUpperCase()} ${e.path}`));
      for (const api of infraData.externalAPIs) {
        const method = (api.method || 'GET').toUpperCase();
        const normPath = api.path.startsWith('/') ? api.path : '/' + api.path;
        const key = `${method} ${normPath}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          const kind = PolyglotParser.classifyApiKind(method, normPath, 'OpenAPI/Swagger Spec');
          const level = PolyglotParser.classifyApiLevel(method, normPath, kind);
          const epObj = {
            method,
            path: normPath,
            module: path.relative(absPath, api.source).replace(/\\/g, '/'),
            source: 'OpenAPI/Swagger Spec',
            summary: api.summary || '',
            kind,
            level,
            connectedTables: [],
            crawlTier: api.crawlTier || 'normal',
            isLazyLoaded: api.isLazyLoaded === true,
            discoveryScope: api.discoveryScope || (api.isLazyLoaded ? 'Deep Crawl (Lazy-Loaded)' : 'Standard Crawl (Normal)')
          };
          codeData.endpoints.push(epObj);
          if (codeData.stats) codeData.stats.totalEndpoints = codeData.endpoints.length;
        }
      }
    }

    // 2. Build Bi-Directional In-Memory Knowledge Graph
    const graph = new KnowledgeGraph();
    graph.build(schemaData, codeData, infraData);
    await yieldEventLoop();

    // 3. Generate Multi-Level Architecture Diagrams
    const erd = DiagramGenerator.generateERD(schemaData);
    await yieldEventLoop();
    const hld = DiagramGenerator.generateHLD(infraData, codeData, schemaData);
    await yieldEventLoop();
    const lld = DiagramGenerator.generateLLD(codeData, schemaData);
    await yieldEventLoop();
    const seqTarget = codeData.endpoints[0] || (schemaData.tables[0] ? `/api/${schemaData.tables[0].name}` : null);
    const seq = DiagramGenerator.generateSequence(seqTarget, codeData, schemaData);
    await yieldEventLoop();

    // 4. Default Sample What-If Blast Radius
    let sampleTarget = null;
    let sampleType = 'table';
    if (schemaData.tables.length > 0) {
      sampleTarget = schemaData.tables[0].name;
    } else if (codeData.endpoints.length > 0) {
      sampleTarget = codeData.endpoints[0].path;
      sampleType = 'endpoint';
    }

    const sampleImpact = ImpactAnalyzer.simulate(graph, sampleTarget, sampleType, schemaData, codeData);
    await yieldEventLoop();

    // 5. Generate 3-Tier Persona Intelligence Views
    const developerView = PersonaMapper.getDeveloperView(schemaData, codeData, infraData, graph);
    await yieldEventLoop();
    const managerView = PersonaMapper.getManagerView(schemaData, codeData, infraData, graph);
    await yieldEventLoop();
    const businessView = PersonaMapper.getBusinessView(schemaData, codeData, infraData, graph);

    // High-Scale Payload Optimization:
    // Retain full statistics, counts, classes, and endpoints, but cap raw auxiliary arrays
    // so JSON serialization, HTTP transfer, and browser sessionStorage stay instantaneous.
    const sanitizedCode = {
      ...codeData,
      functions: (codeData.functions && codeData.functions.length > 500)
        ? codeData.functions.slice(0, 500)
        : (codeData.functions || []),
      modules: (codeData.modules && codeData.modules.length > 250)
        ? codeData.modules.slice(0, 250).map((m) => ({
            filePath: m.filePath,
            relativePath: m.relativePath,
            extension: m.extension,
            linesOfCode: m.linesOfCode,
            endpoints: m.endpoints,
            classes: m.classes?.slice(0, 10) || []
          }))
        : (codeData.modules || [])
    };

    if (developerView) {
      developerView.functions = sanitizedCode.functions;
      developerView.modules = sanitizedCode.modules;
    }

    return {
      timestamp: new Date().toISOString(),
      projectPath: absPath,
      projectName: path.basename(absPath),
      scannedFilesCount: fileList.length,
      scanStats,
      schema: schemaData,
      code: sanitizedCode,
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

  static analyze(projectPath) {
    const cleanPath = (projectPath || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    const absPath = path.resolve(cleanPath);
    
    if (!fs.existsSync(absPath)) {
      throw new Error(`Directory not found: ${absPath}`);
    }

    const scan = this.scanDirectory(absPath);
    const fileList = scan.fileList;
    const scanStats = scan.stats;

    const schemaTargetFiles = scan.categorized
      ? [...scan.categorized.schemaFiles, ...scan.categorized.codeFiles]
      : fileList;
    const codeTargetFiles = scan.categorized
      ? scan.categorized.codeFiles
      : fileList;
    const infraTargetFiles = scan.categorized
      ? scan.categorized.infraFiles
      : fileList;

    // 1. Run Parsers
    const schemaParser = new SchemaParser();
    const schemaData = schemaParser.parseDirectory(absPath, schemaTargetFiles);

    const polyglotParser = new PolyglotParser();
    const codeData = polyglotParser.parseDirectory(absPath, codeTargetFiles);

    const infraParser = new InfraParser();
    const infraData = infraParser.parseDirectory(absPath, infraTargetFiles);

    // Merge external APIs discovered from OpenAPI / Swagger specs if not already present in code
    if (infraData && infraData.externalAPIs && infraData.externalAPIs.length > 0) {
      const existingKeys = new Set(codeData.endpoints.map(e => `${(e.method || 'GET').toUpperCase()} ${e.path}`));
      for (const api of infraData.externalAPIs) {
        const method = (api.method || 'GET').toUpperCase();
        const normPath = api.path.startsWith('/') ? api.path : '/' + api.path;
        const key = `${method} ${normPath}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          const kind = PolyglotParser.classifyApiKind(method, normPath, 'OpenAPI/Swagger Spec');
          const level = PolyglotParser.classifyApiLevel(method, normPath, kind);
          const epObj = {
            method,
            path: normPath,
            module: path.relative(absPath, api.source).replace(/\\/g, '/'),
            source: 'OpenAPI/Swagger Spec',
            summary: api.summary || '',
            kind,
            level,
            connectedTables: [],
            crawlTier: api.crawlTier || 'normal',
            isLazyLoaded: api.isLazyLoaded === true,
            discoveryScope: api.discoveryScope || (api.isLazyLoaded ? 'Deep Crawl (Lazy-Loaded)' : 'Standard Crawl (Normal)')
          };
          codeData.endpoints.push(epObj);
          if (codeData.stats) codeData.stats.totalEndpoints = codeData.endpoints.length;
        }
      }
    }

    // 2. Build Bi-Directional In-Memory Knowledge Graph
    const graph = new KnowledgeGraph();
    graph.build(schemaData, codeData, infraData);

    // 3. Generate Multi-Level Architecture Diagrams
    const erd = DiagramGenerator.generateERD(schemaData);
    const hld = DiagramGenerator.generateHLD(infraData, codeData, schemaData);
    const lld = DiagramGenerator.generateLLD(codeData, schemaData);
    const seqTarget = codeData.endpoints[0] || (schemaData.tables[0] ? `/api/${schemaData.tables[0].name}` : null);
    const seq = DiagramGenerator.generateSequence(seqTarget, codeData, schemaData);

    // 4. Default Sample What-If Blast Radius
    let sampleTarget = null;
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

    const sanitizedCode = {
      ...codeData,
      functions: (codeData.functions && codeData.functions.length > 500)
        ? codeData.functions.slice(0, 500)
        : (codeData.functions || []),
      modules: (codeData.modules && codeData.modules.length > 250)
        ? codeData.modules.slice(0, 250).map((m) => ({
            filePath: m.filePath,
            relativePath: m.relativePath,
            extension: m.extension,
            linesOfCode: m.linesOfCode,
            endpoints: m.endpoints,
            classes: m.classes?.slice(0, 10) || []
          }))
        : (codeData.modules || [])
    };

    if (developerView) {
      developerView.functions = sanitizedCode.functions;
      developerView.modules = sanitizedCode.modules;
    }

    return {
      timestamp: new Date().toISOString(),
      projectPath: absPath,
      projectName: path.basename(absPath),
      scannedFilesCount: fileList.length,
      scanStats,
      schema: schemaData,
      code: sanitizedCode,
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
