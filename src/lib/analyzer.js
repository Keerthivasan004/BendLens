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
  static scanDirectory(targetDir) {
    const fileList = [];
    const IGNORED_DIRS = new Set([
      'node_modules', '.git', '.next', 'dist', 'build', '.idea', '.vscode',
      '__pycache__', 'venv', '.venv', 'env', '.env', 'coverage', '.turbo', 
      'target', 'bin', 'obj', 'vendor', '.terraform', '.cache', 'tmp', 'temp', 'logs', 'out',
      '__MACOSX', '.DS_Store', 'Thumbs.db', 'PaxHeaders'
    ]);

    const MAX_FILES = 10000;
    const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB per code file max

    function walk(currentDir) {
      if (!fs.existsSync(currentDir) || fileList.length >= MAX_FILES) return;
      
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (fileList.length >= MAX_FILES) break;
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            // Check file size to avoid minified / gigantic binary dumps
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size <= MAX_FILE_SIZE_BYTES) {
                fileList.push(fullPath);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn(`Skipping unreadable folder ${currentDir}:`, err.message);
      }
    }

    walk(targetDir);
    return fileList;
  }

  static analyze(projectPath) {
    // Sanitize path by removing surrounding double quotes, single quotes, and extra whitespace
    const cleanPath = (projectPath || '').toString().trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    const absPath = path.resolve(cleanPath);
    
    if (!fs.existsSync(absPath)) {
      throw new Error(`Directory not found: ${absPath}`);
    }

    const fileList = this.scanDirectory(absPath);

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
