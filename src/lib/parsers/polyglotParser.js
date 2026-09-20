const fs = require('fs');
const path = require('path');

/**
 * Polyglot Code Scanner & AST Pattern Analyzer
 * Extracts classes, functions, methods, imports, dependencies, API endpoints,
 * and database call sites across Python, JavaScript/TypeScript, Java, Go, C#, PHP.
 */
class PolyglotParser {
  constructor() {
    this.modules = [];
    this.classes = [];
    this.functions = [];
    this.endpoints = [];
    this.dependencies = [];
    this.callSites = [];
  }

  parseDirectory(dirPath, fileList) {
    const SUPPORTED_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.java', '.go', '.cs', '.php', '.rb']);
    for (const filePath of fileList) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        if (!SUPPORTED_EXTS.has(ext)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(dirPath, filePath).replace(/\\/g, '/');

        const moduleInfo = {
          filePath,
          relativePath,
          extension: ext,
          linesOfCode: content.split('\n').length,
          classes: [],
          functions: [],
          imports: [],
          endpoints: [],
          dbAccesses: []
        };

        if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
          this.parseJavaScript(content, moduleInfo);
        } else if (ext === '.py') {
          this.parsePython(content, moduleInfo);
        } else if (ext === '.java') {
          this.parseJava(content, moduleInfo);
        } else if (ext === '.go') {
          this.parseGo(content, moduleInfo);
        } else if (ext === '.cs') {
          this.parseCSharp(content, moduleInfo);
        } else if (ext === '.php') {
          this.parsePhp(content, moduleInfo);
        } else if (ext === '.rb') {
          this.parseRuby(content, moduleInfo);
        }

        this.modules.push(moduleInfo);
      } catch (err) {
        console.error(`Error parsing code in ${filePath}:`, err.message);
      }
    }

    return {
      modules: this.modules,
      classes: this.classes,
      functions: this.functions,
      endpoints: this.endpoints,
      callSites: this.callSites,
      stats: {
        totalModules: this.modules.length,
        totalClasses: this.classes.length,
        totalFunctions: this.functions.length,
        totalEndpoints: this.endpoints.length,
        totalLinesOfCode: this.modules.reduce((acc, m) => acc + m.linesOfCode, 0)
      }
    };
  }

  parseJavaScript(content, moduleInfo) {
    const lines = content.split('\n');

    // 1. Imports
    const importRegex = /(?:import\s+(?:(?:\{[^}]*\}|\*\s+as\s+[\w]+|[\w]+)\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const target = match[1] || match[2];
      moduleInfo.imports.push(target);
    }

    // 2. Classes
    const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const cls = {
        name: match[1],
        extends: match[2] || null,
        module: moduleInfo.relativePath,
        methods: []
      };
      moduleInfo.classes.push(cls);
      this.classes.push(cls);
    }

    // 3. Functions & Arrow Functions
    const funcRegex = /(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)|(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[1] || match[3];
      const params = (match[2] || match[4] || '').split(',').map(s => s.trim()).filter(Boolean);
      if (name && !['require', 'import'].includes(name)) {
        const fn = {
          name,
          parameters: params,
          module: moduleInfo.relativePath,
          async: match[0].includes('async')
        };
        moduleInfo.functions.push(fn);
        this.functions.push(fn);
      }
    }

    // 4. API Endpoints (Express, Fastify, Next.js route handlers)
    const routeRegex = /(?:app|router|server)\.(get|post|put|delete|patch|options)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)/gi;
    while ((match = routeRegex.exec(content)) !== null) {
      const ep = {
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Express/Node route'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }

    // Next.js App Router (export async function GET/POST...)
    const nextRouteRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD)\s*\(/g;
    while ((match = nextRouteRegex.exec(content)) !== null) {
      if (moduleInfo.relativePath.includes('api/')) {
        let routePath = '/' + moduleInfo.relativePath.replace(/\.(js|ts|jsx|tsx)$/, '').replace(/route$/, '').replace(/\/$/, '');
        const ep = {
          method: match[1].toUpperCase(),
          path: routePath,
          module: moduleInfo.relativePath,
          source: 'Next.js App Router'
        };
        moduleInfo.endpoints.push(ep);
        this.endpoints.push(ep);
      }
    }

    // .NET minimal APIs: app.MapGet/MapPost/MapPut/MapDelete/MapPatch('/x', ...)
    const mapRegex = /\.(?:MapGet|MapPost|MapPut|MapDelete|MapPatch)\s*\(\s*['"]([^'"]+)['"]/gi;
    while ((match = mapRegex.exec(content)) !== null) {
      const m = match[0].match(/Map(Get|Post|Put|Delete|Patch)/i);
      const ep = {
        method: (m ? m[1] : 'GET').toUpperCase(),
        path: match[1],
        module: moduleInfo.relativePath,
        source: '.NET Minimal API'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }

    // Hapi / Koa style: server.route({ method: 'GET', path: '/x' })
    const hapiRegex = /method\s*:\s*['"](GET|POST|PUT|DELETE|PATCH|ALL)['"]\s*,\s*path\s*:\s*['"]([^'"]+)['"]/gi;
    while ((match = hapiRegex.exec(content)) !== null) {
      const ep = {
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Hapi/Koa route'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }

    // 5. DB Queries & ORM accesses
    const dbRegex = /(?:db|prisma|sequelize|knex|mongoose|model|User|Order|Payment|Product)\.([A-Za-z0-9_]+)\s*\(/gi;
    while ((match = dbRegex.exec(content)) !== null) {
      moduleInfo.dbAccesses.push(match[0]);
    }
  }

  parsePython(content, moduleInfo) {
    // 1. Imports
    const importRegex = /(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_.]+))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      moduleInfo.imports.push(match[1] || match[2]);
    }

    // 2. Classes
    const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s*\(([^)]*)\))?\s*:/g;
    while ((match = classRegex.exec(content)) !== null) {
      const cls = {
        name: match[1],
        extends: match[2] ? match[2].trim() : null,
        module: moduleInfo.relativePath,
        methods: []
      };
      moduleInfo.classes.push(cls);
      this.classes.push(cls);
    }

    // 3. Functions
    const funcRegex = /def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean);
      const fn = {
        name,
        parameters: params,
        module: moduleInfo.relativePath,
        async: content.includes(`async def ${name}`)
      };
      moduleInfo.functions.push(fn);
      this.functions.push(fn);
    }

    // 4. FastAPI / Flask / Django Endpoints
    const apiRegex = /@(?:app|router|api)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
    while ((match = apiRegex.exec(content)) !== null) {
      const ep = {
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'FastAPI route'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }

    // Flask @app.route('/path', methods=['GET', 'POST'])
    const flaskRouteRegex = /@(?:app|blueprint|bp|router|api)\.route\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?/gi;
    while ((match = flaskRouteRegex.exec(content)) !== null) {
      const routePath = match[1];
      const methodsStr = match[2];
      const methods = methodsStr 
        ? methodsStr.split(',').map(m => m.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean)
        : ['GET'];

      for (const m of methods) {
        const ep = {
          method: m,
          path: routePath,
          module: moduleInfo.relativePath,
          source: 'Flask route'
        };
        moduleInfo.endpoints.push(ep);
        this.endpoints.push(ep);
      }
    }

    // Django path('url', view)
    const djangoPathRegex = /(?:path|re_path)\s*\(\s*r?['"]([^'"]*)['"]\s*,\s*([A-Za-z0-9_.]+)/g;
    while ((match = djangoPathRegex.exec(content)) !== null) {
      const ep = {
        method: 'ALL',
        path: '/' + match[1].replace(/^\/|\/$/g, ''),
        module: moduleInfo.relativePath,
        source: `Django path (${match[2]})`
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }

    // Django REST framework: @api_view(['GET','POST']) / @action(methods=[...])
    const drfRegex = /@(?:api_view|action)\s*\(\s*\[([^\]]+)\]/gi;
    while ((match = drfRegex.exec(content)) !== null) {
      const methods = match[1].split(',').map((s) => s.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean);
      const fnAfter = content.slice(match.index + match[0].length, match.index + match[0].length + 300).match(/def\s+([A-Za-z0-9_]+)/);
      for (const m of methods.length ? methods : ['GET']) {
        const ep = {
          method: m,
          path: `/${fnAfter ? fnAfter[1] : 'drf-action'}`,
          module: moduleInfo.relativePath,
          source: 'DRF api_view'
        };
        moduleInfo.endpoints.push(ep);
        this.endpoints.push(ep);
      }
    }

    // Flask add_url_rule('/x', ..., methods=[...])
    const urlRuleRegex = /add_url_rule\s*\(\s*['"]([^'"]+)['"](?:[^)]*methods\s*=\s*\[([^\]]+)\])?/gi;
    while ((match = urlRuleRegex.exec(content)) !== null) {
      const methods = match[2]
        ? match[2].split(',').map((s) => s.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean)
        : ['GET'];
      for (const m of methods) {
        const ep = {
          method: m,
          path: match[1],
          module: moduleInfo.relativePath,
          source: 'Flask add_url_rule'
        };
        moduleInfo.endpoints.push(ep);
        this.endpoints.push(ep);
      }
    }

    // 5. DB Queries
    const dbRegex = /(?:session|db|models|objects|cursor)\.([A-Za-z0-9_]+)\s*\(/gi;
    while ((match = dbRegex.exec(content)) !== null) {
      moduleInfo.dbAccesses.push(match[0]);
    }
  }

  parseJava(content, moduleInfo) {
    // Classes
    const classRegex = /(?:public|protected|private)?\s*class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const cls = {
        name: match[1],
        extends: match[2] || null,
        module: moduleInfo.relativePath,
        methods: []
      };
      moduleInfo.classes.push(cls);
      this.classes.push(cls);
    }

    // Spring Boot Endpoints (incl. @RequestMapping(method=GET) + PatchMapping)
    const springRegex = /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*\(\s*([^)]*)\)/g;
    while ((match = springRegex.exec(content)) !== null) {
      let method = match[1].replace('Mapping', '').toUpperCase();
      if (method === 'REQUEST') {
        const mm = match[2].match(/RequestMethod\.([A-Z]+)/);
        method = mm ? mm[1] : 'GET/POST';
      }
      const pathM = match[2].match(/['"]([^'"]+)['"]/) || ['', '/'];
      const ep = {
        method,
        path: pathM[1],
        module: moduleInfo.relativePath,
        source: 'Spring Boot'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }
  }

  parseGo(content, moduleInfo) {
    // Go Structs & Functions
    const structRegex = /type\s+([A-Za-z0-9_]+)\s+struct\s*\{/g;
    let match;
    while ((match = structRegex.exec(content)) !== null) {
      const cls = {
        name: match[1],
        module: moduleInfo.relativePath,
        type: 'Go Struct'
      };
      moduleInfo.classes.push(cls);
      this.classes.push(cls);
    }

    const funcRegex = /func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_]+)\s*\(/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const fn = {
        name: match[1],
        module: moduleInfo.relativePath
      };
      moduleInfo.functions.push(fn);
      this.functions.push(fn);
    }

    // Gin / Fiber / Echo routes (any receiver name, incl. HandleFunc + PATCH)
    const ginRegex = /(?:\w+)\.(GET|POST|PUT|DELETE|PATCH|HEAD|HandleFunc)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = ginRegex.exec(content)) !== null) {
      const ep = {
        method: match[1],
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Go Web Framework'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }
  }

  parseCSharp(content, moduleInfo) {
    // C# Classes & ASP.NET Controllers
    const classRegex = /(?:public|internal|private)\s+class\s+([A-Za-z0-9_]+)(?:\s*:\s*([A-Za-z0-9_,\s]+))?/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const cls = {
        name: match[1],
        extends: match[2] || null,
        module: moduleInfo.relativePath
      };
      moduleInfo.classes.push(cls);
      this.classes.push(cls);
    }

    const routeRegex = /\[Http(Get|Post|Put|Delete|Patch|Head)\s*(?:\(['"]([^'"]*)['"]\))?\]/g;
    while ((match = routeRegex.exec(content)) !== null) {
      const ep = {
        method: match[1].toUpperCase(),
        path: match[2] || '/',
        module: moduleInfo.relativePath,
        source: 'ASP.NET Core'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }
  }

  parsePhp(content, moduleInfo) {
    let match;
    // Classes
    const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_\\]+))?/g;
    while ((match = classRegex.exec(content)) !== null) {
      const cls = {
        name: match[1],
        extends: match[2] || null,
        module: moduleInfo.relativePath
      };
      moduleInfo.classes.push(cls);
      this.classes.push(cls);
    }

    // Functions / methods
    const funcRegex = /(?:public|protected|private)?\s*function\s+([A-Za-z0-9_]+)\s*\(/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const fn = { name: match[1], module: moduleInfo.relativePath };
      moduleInfo.functions.push(fn);
      this.functions.push(fn);
    }

    // Laravel: Route::get/post/put/patch/delete/options/any('/path', ...)
    const routeRegex = /Route\s*::\s*(get|post|put|patch|delete|options|any)\s*\(\s*['"]([^'"]+)['"]/gi;
    while ((match = routeRegex.exec(content)) !== null) {
      const ep = {
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Laravel Route'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }

    // Laravel resource routes expand to conventional REST endpoints
    const resRegex = /Route\s*::\s*(?:apiR|r)esource\s*\(\s*['"]([^'"]+)['"]/gi;
    while ((match = resRegex.exec(content)) !== null) {
      const base = '/' + match[1].replace(/^\/|\/$/g, '');
      for (const [m, p] of [['GET', base], ['POST', base], ['GET', `${base}/{id}`], ['PUT', `${base}/{id}`], ['DELETE', `${base}/{id}`]]) {
        const ep = { method: m, path: p, module: moduleInfo.relativePath, source: 'Laravel Resource' };
        moduleInfo.endpoints.push(ep);
        this.endpoints.push(ep);
      }
    }
  }

  parseRuby(content, moduleInfo) {
    let match;
    // Classes and methods (line-anchored to avoid matches inside strings)
    const classRegex = /^\s*class\s+([A-Za-z0-9_:]+)/gm;
    while ((match = classRegex.exec(content)) !== null) {
      const cls = { name: match[1], module: moduleInfo.relativePath };
      moduleInfo.classes.push(cls);
      this.classes.push(cls);
    }

    const funcRegex = /^\s*def\s+([A-Za-z0-9_?!]+)/gm;
    while ((match = funcRegex.exec(content)) !== null) {
      const fn = { name: match[1], module: moduleInfo.relativePath };
      moduleInfo.functions.push(fn);
      this.functions.push(fn);
    }

    // Rails routes.rb + Sinatra: get/post/put/patch/delete '/path'
    const routeRegex = /^\s*(get|post|put|patch|delete)\s+['"]([^'"]+)['"]/gim;
    while ((match = routeRegex.exec(content)) !== null) {
      const ep = {
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Rails Route'
      };
      moduleInfo.endpoints.push(ep);
      this.endpoints.push(ep);
    }

    // Rails `resources :things` expands to conventional REST endpoints
    const resRegex = /^\s*resources\s+:([a-z_]+)/gm;
    while ((match = resRegex.exec(content)) !== null) {
      const base = '/' + match[1];
      for (const [m, p] of [['GET', base], ['POST', base], ['GET', `${base}/{id}`], ['PUT', `${base}/{id}`], ['DELETE', `${base}/{id}`]]) {
        const ep = { method: m, path: p, module: moduleInfo.relativePath, source: 'Rails Resources' };
        moduleInfo.endpoints.push(ep);
        this.endpoints.push(ep);
      }
    }
  }
}

module.exports = PolyglotParser;
