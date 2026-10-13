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

  static classifyApiKind(method, routePath, source = '') {
    const p = String(routePath || '').toLowerCase();
    const m = String(method || '').toUpperCase();
    const s = String(source || '').toLowerCase();

    if (m === 'WS' || s.includes('websocket') || /(?:\/|^)(?:ws|socket|stream|subscriptions?)(?:\/|$)/.test(p)) {
      return 'WEBSOCKET';
    }
    if (/(?:\/|^)(?:graphql)(?:\/|$)/.test(p)) {
      return 'GRAPHQL';
    }
    if (/(?:webhook|callback|ipn|events?\/(?:incoming|receiver)|stripe|razorpay|paypal|github\/events)/.test(p)) {
      return 'WEBHOOK';
    }
    if (/(?:auth|login|logout|signup|register|oauth|token|refresh|session|password|mfa|otp|verify|sso|credentials|me\b)/.test(p)) {
      return 'AUTH';
    }
    if (/(?:upload|download|files?|avatars?|images?|media|exports?|imports?|pdf|assets?|signed-url|s3|blob|attachment|documents?)/.test(p)) {
      return 'STORAGE';
    }
    if (/(?:admin|audit|governance|roles?|permissions?|settings|configs?|tenants?|system-config|sysadmin|access-control)/.test(p)) {
      return 'ADMIN';
    }
    if (/(?:health|ping|status|metrics|version|heartbeat|live|ready|diagnostics?|telemetry|liveness|readiness)/.test(p)) {
      return 'SYSTEM';
    }
    return 'REST';
  }

  static classifyApiLevel(method, routePath, kind = 'REST') {
    const p = String(routePath || '').toLowerCase();
    const m = String(method || '').toUpperCase();

    // 1. Low-Level: System utilities, health checks, telemetry, simple diagnostics
    if (kind === 'SYSTEM') return 'LOW';
    if (/(?:health|ping|status|metrics|version|heartbeat|live|ready|diagnostics?|telemetry|liveness|readiness)/.test(p)) {
      return 'LOW';
    }
    if (m === 'GET' && /(?:enums?|meta|version|time|ping|status|heartbeat|refresh|dropdown|constants)/.test(p)) {
      return 'LOW';
    }

    // 2. High-Level: Business Orchestration, composite transactions, payments, workflows, admin & webhooks
    if (kind === 'WEBHOOK' || kind === 'ADMIN') return 'HIGH';
    if (/(?:checkout|orders?|payments?|billings?|transactions?|invoices?|subscriptions?|drives?|assessments?|evaluations?|batches?|enrollments?|placements?|copilot|agents?|workflows?|pipelines?|sync|bulk|batch|dispatch|submit)/.test(p)) {
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(m)) return 'HIGH';
      if (/(?:checkout|billing|report|analytics|summary|pipeline|workflow)/.test(p)) return 'HIGH';
    }

    // 3. Medium-Level: Standard domain CRUD operations
    return 'MEDIUM';
  }

  registerEndpoint(ep, moduleInfo) {
    if (!ep || !ep.path) return;
    let normPath = String(ep.path).trim();
    if (!normPath.startsWith('/') && !normPath.startsWith('http')) {
      normPath = '/' + normPath;
    }
    normPath = normPath.replace(/\/+/g, '/');
    if (normPath.length > 1 && normPath.endsWith('/')) {
      normPath = normPath.slice(0, -1);
    }

    const method = (ep.method || 'GET').toUpperCase();
    const kind = ep.kind || PolyglotParser.classifyApiKind(method, normPath, ep.source);
    const level = ep.level || PolyglotParser.classifyApiLevel(method, normPath, kind);

    const endpointObj = {
      method,
      path: normPath,
      module: ep.module || moduleInfo.relativePath,
      source: ep.source || (kind === 'WEBSOCKET' ? 'WebSocket Stream' : 'REST API'),
      kind,
      level,
      connectedTables: ep.connectedTables || []
    };

    // Avoid duplicate entries within the same module
    const existsInModule = moduleInfo.endpoints.some(
      (e) => e.method === endpointObj.method && e.path === endpointObj.path
    );
    if (!existsInModule) {
      moduleInfo.endpoints.push(endpointObj);
    }

    // Avoid duplicate entries globally for the same method, path, and module
    const existsGlobally = this.endpoints.some(
      (e) => e.method === endpointObj.method && e.path === endpointObj.path && e.module === endpointObj.module
    );
    if (!existsGlobally) {
      this.endpoints.push(endpointObj);
    }
  }

  parseDirectory(dirPath, fileList) {
    const SUPPORTED_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.java', '.go', '.cs', '.php', '.rb']);
    for (const filePath of fileList) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        if (!SUPPORTED_EXTS.has(ext)) continue;

        const baseName = path.basename(filePath).toLowerCase();
        if (baseName.endsWith('.d.ts') || baseName.endsWith('.d.mts') || baseName.endsWith('.d.cts')) continue;
        if (/\.(?:min|bundle|chunk|vendor)\.(?:js|mjs|cjs)$/i.test(baseName)) continue;
        if (baseName.endsWith('.js.map') || baseName.endsWith('.css.map')) continue;

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
    // 1. Imports
    if (content.includes('import') || content.includes('require')) {
      const importRegex = /(?:import\s+(?:(?:\{[^}]*\}|\*\s+as\s+[\w]+|[\w]+)\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const target = match[1] || match[2];
        moduleInfo.imports.push(target);
      }
    }

    // 2. Classes
    if (content.includes('class ')) {
      const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?\s*\{/g;
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
    }

    // 3. Functions & Arrow Functions
    if (content.includes('function') || content.includes('=>')) {
      const funcRegex = /(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)|(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
      let match;
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
    }

    // 4. API Endpoints (Express, Fastify, Next.js, NestJS, .NET minimal APIs, Hapi/Koa, WebSockets)
    if (/(?:app|router|server|fastify|api|export|Controller|Map|method|WebSocket|WS_PATH)\b/i.test(content)) {
      // Express / Fastify / Koa / Router method handlers
      // Supports single paths, array of paths, template literals, and multiline handler declarations
      const routeRegex = /(?:app|router|server|fastify|api)\s*\.\s*(get|post|put|delete|patch|options|head|all)\s*\(\s*(\[[^\]]+\]|`[^`]+`|'[^']+'|"[^"]+")/gis;
      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const raw = match[2].trim();
        let paths = [];
        if (raw.startsWith('[')) {
          paths = [...raw.matchAll(/[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]);
        } else {
          paths = [raw.replace(/^[`'"]|[`'"]$/g, '')];
        }
        for (const p of paths) {
          this.registerEndpoint({
            method,
            path: p,
            module: moduleInfo.relativePath,
            source: 'Express/Node route'
          }, moduleInfo);
        }
      }

      // Express chained routes: router.route('/path').get(...).post(...)
      const routeChainRegex = /(?:app|router|server|fastify|api)\s*\.\s*route\s*\(\s*(`[^`]+`|'[^']+'|"[^"]+")\s*\)/gis;
      let routeMatch;
      while ((routeMatch = routeChainRegex.exec(content)) !== null) {
        const basePath = routeMatch[1].replace(/^[`'"]|[`'"]$/g, '');
        const chainSection = content.slice(routeMatch.index + routeMatch[0].length, routeMatch.index + routeMatch[0].length + 600);
        const methodMatches = [...chainSection.matchAll(/\.(get|post|put|delete|patch|options|head|all)\s*\(/gi)];
        for (const mm of methodMatches) {
          this.registerEndpoint({
            method: mm[1].toUpperCase(),
            path: basePath,
            module: moduleInfo.relativePath,
            source: 'Express chained route'
          }, moduleInfo);
        }
      }

      // Fastify / Hapi / Koa object route registrations: fastify.route({ method: 'GET', url: '/x' })
      const objRouteRegex = /(?:fastify|server|app|router)\s*\.\s*route\s*\(\s*\{([^}]+)\}/gis;
      let objMatch;
      while ((objMatch = objRouteRegex.exec(content)) !== null) {
        const block = objMatch[1];
        const pathM = block.match(/(?:url|path)\s*:\s*[`'"]([^`'"]+)[`'"]/i);
        const methodM = block.match(/method\s*:\s*(?:\[([^\]]+)\]|[`'"]([^`'"]+)[`'"])/i);
        if (pathM) {
          const routePath = pathM[1];
          let methods = ['GET'];
          if (methodM) {
            if (methodM[1]) {
              methods = [...methodM[1].matchAll(/[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1].toUpperCase());
            } else if (methodM[2]) {
              methods = [methodM[2].toUpperCase()];
            }
          }
          for (const m of methods) {
            this.registerEndpoint({
              method: m,
              path: routePath,
              module: moduleInfo.relativePath,
              source: 'Fastify/Hapi route'
            }, moduleInfo);
          }
        }
      }

      // Next.js App Router (export async function GET / export const GET...)
      if (/(?:api[\\/]|app[\\/]).*route\.[jt]sx?$/i.test(moduleInfo.relativePath)) {
        const nextRouteRegex = /export\s+(?:(?:async\s+)?function|(?:const|let|var))\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/g;
        let nm;
        while ((nm = nextRouteRegex.exec(content)) !== null) {
          let routePath = moduleInfo.relativePath
            .replace(/\\/g, '/')
            .replace(/^(?:src\/)?(?:app\/)?/, '/')
            .replace(/\/route\.[jt]sx?$/, '')
            .replace(/\/+$/, '') || '/';
          if (!routePath.startsWith('/')) routePath = '/' + routePath;
          this.registerEndpoint({
            method: nm[1].toUpperCase(),
            path: routePath,
            module: moduleInfo.relativePath,
            source: 'Next.js App Router'
          }, moduleInfo);
        }
      }

      // Next.js Pages Router (pages/api/**/*)
      if (/(?:^|[\\/])(?:src[\\/])?pages[\\/]api[\\/].*\.[jt]sx?$/i.test(moduleInfo.relativePath)) {
        if (/export\s+default\s+/i.test(content)) {
          let routePath = moduleInfo.relativePath
            .replace(/\\/g, '/')
            .replace(/^(?:src\/)?pages\//, '/')
            .replace(/\.[jt]sx?$/, '')
            .replace(/\/index$/, '') || '/';
          this.registerEndpoint({
            method: 'ALL',
            path: routePath,
            module: moduleInfo.relativePath,
            source: 'Next.js Pages API'
          }, moduleInfo);
        }
      }

      // NestJS Controllers (@Controller + @Get, @Post, etc.)
      if (content.includes('@Controller')) {
        const ctrlMatch = content.match(/@Controller\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/);
        const prefix = ctrlMatch && ctrlMatch[1] ? ('/' + ctrlMatch[1].replace(/^\/|\/$/g, '')) : '';
        const nestMethodRegex = /@(Get|Post|Put|Delete|Patch|Options|Head|All)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/gi;
        let nm;
        while ((nm = nestMethodRegex.exec(content)) !== null) {
          const subPath = nm[2] ? ('/' + nm[2].replace(/^\/|\/$/g, '')) : '';
          const fullPath = (prefix + subPath) || '/';
          this.registerEndpoint({
            method: nm[1].toUpperCase(),
            path: fullPath,
            module: moduleInfo.relativePath,
            source: 'NestJS Controller'
          }, moduleInfo);
        }
      }

      // WebSockets in Node.js / Express
      if (content.includes('WebSocket') || content.includes('WS_PATH') || content.includes('/ws')) {
        const wsPathRegex = /(?:path\s*:\s*|WS_PATH\s*=\s*|pathname\s*===?\s*|url\s*===?\s*)['"`](\/(?:ws|api\/ws|stream)[^'"`]*)['"`]/gi;
        let wm;
        while ((wm = wsPathRegex.exec(content)) !== null) {
          this.registerEndpoint({
            method: 'WS',
            path: wm[1],
            module: moduleInfo.relativePath,
            source: 'WebSocket route'
          }, moduleInfo);
        }
      }

      // .NET minimal APIs: app.MapGet/MapPost/MapPut/MapDelete/MapPatch('/x', ...)
      const mapRegex = /\.(?:MapGet|MapPost|MapPut|MapDelete|MapPatch)\s*\(\s*['"]([^'"]+)['"]/gi;
      while ((match = mapRegex.exec(content)) !== null) {
        const m = match[0].match(/Map(Get|Post|Put|Delete|Patch)/i);
        this.registerEndpoint({
          method: (m ? m[1] : 'GET').toUpperCase(),
          path: match[1],
          module: moduleInfo.relativePath,
          source: '.NET Minimal API'
        }, moduleInfo);
      }

      // Hapi / Koa legacy style: method: 'GET', path: '/x'
      const hapiRegex = /method\s*:\s*['"](GET|POST|PUT|DELETE|PATCH|ALL)['"]\s*,\s*path\s*:\s*['"]([^'"]+)['"]/gi;
      while ((match = hapiRegex.exec(content)) !== null) {
        this.registerEndpoint({
          method: match[1].toUpperCase(),
          path: match[2],
          module: moduleInfo.relativePath,
          source: 'Hapi/Koa route'
        }, moduleInfo);
      }
    }

    // 5. DB Queries & ORM accesses
    if (/(?:db|prisma|sequelize|knex|mongoose|model|User|Order|Payment|Product)\./i.test(content)) {
      const dbRegex = /(?:db|prisma|sequelize|knex|mongoose|model|User|Order|Payment|Product)\.([A-Za-z0-9_]+)\s*\(/gi;
      let match;
      while ((match = dbRegex.exec(content)) !== null) {
        moduleInfo.dbAccesses.push(match[0]);
      }
    }
  }

  parsePython(content, moduleInfo) {
    let match;
    // 1. Imports
    if (content.includes('import')) {
      const importRegex = /(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_.]+))/g;
      while ((match = importRegex.exec(content)) !== null) {
        moduleInfo.imports.push(match[1] || match[2]);
      }
    }

    // 2. Classes
    if (content.includes('class ')) {
      const classRegex = /class\s+([A-Za-z0-9_]+)(?:\s*\(([^)]*)\))?\s*:/g;
      let match;
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
    }

    // 3. Functions
    if (content.includes('def ')) {
      const funcRegex = /def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?\s*:/g;
      let match;
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
    }

    // 4. FastAPI / Flask / Django Endpoints
    if (/@(?:app|router|api|api_router|blueprint|bp)\b/i.test(content) || /(?:path|re_path|add_url_rule)\s*\(/i.test(content)) {
      // FastAPI / Starlette decorators (supports multiline)
      const apiRegex = /@(?:app|router|api|api_router)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"]([^'"]+)['"]/gis;
      let match;
      while ((match = apiRegex.exec(content)) !== null) {
        this.registerEndpoint({
          method: match[1].toUpperCase(),
          path: match[2],
          module: moduleInfo.relativePath,
          source: 'FastAPI route'
        }, moduleInfo);
      }

      // FastAPI @router.api_route('/x', methods=['GET', 'POST'])
      const apiRouteRegex = /@(?:app|router|api|api_router)\.api_route\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?/gis;
      while ((match = apiRouteRegex.exec(content)) !== null) {
        const routePath = match[1];
        const methods = match[2]
          ? match[2].split(',').map((m) => m.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean)
          : ['GET'];
        for (const m of methods) {
          this.registerEndpoint({
            method: m,
            path: routePath,
            module: moduleInfo.relativePath,
            source: 'FastAPI api_route'
          }, moduleInfo);
        }
      }

      // Flask @app.route('/path', methods=['GET', 'POST'])
      const flaskRouteRegex = /@(?:app|blueprint|bp|router|api)\.route\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?/gis;
      while ((match = flaskRouteRegex.exec(content)) !== null) {
        const routePath = match[1];
        const methods = match[2] 
          ? match[2].split(',').map(m => m.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean)
          : ['GET'];

        for (const m of methods) {
          this.registerEndpoint({
            method: m,
            path: routePath,
            module: moduleInfo.relativePath,
            source: 'Flask route'
          }, moduleInfo);
        }
      }

      // Django path('url', view) / re_path(r'^url', view)
      const djangoPathRegex = /(?:path|re_path)\s*\(\s*r?['"]([^'"]*)['"]/g;
      while ((match = djangoPathRegex.exec(content)) !== null) {
        const cleanPath = '/' + match[1].replace(/^\/|\/$/g, '');
        this.registerEndpoint({
          method: 'ALL',
          path: cleanPath,
          module: moduleInfo.relativePath,
          source: 'Django path'
        }, moduleInfo);
      }

      // Django REST framework: @api_view(['GET','POST']) / @action(methods=[...])
      const drfRegex = /@(?:api_view|action)\s*\(\s*(?:methods\s*=\s*)?\[([^\]]+)\]/gi;
      while ((match = drfRegex.exec(content)) !== null) {
        const methods = match[1].split(',').map((s) => s.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean);
        const fnAfter = content.slice(match.index + match[0].length, match.index + match[0].length + 300).match(/def\s+([A-Za-z0-9_]+)/);
        for (const m of methods.length ? methods : ['GET']) {
          this.registerEndpoint({
            method: m,
            path: `/${fnAfter ? fnAfter[1] : 'drf-action'}`,
            module: moduleInfo.relativePath,
            source: 'DRF api_view'
          }, moduleInfo);
        }
      }

      // Flask add_url_rule('/x', ..., methods=[...])
      const urlRuleRegex = /add_url_rule\s*\(\s*['"]([^'"]+)['"](?:[^)]*methods\s*=\s*\[([^\]]+)\])?/gi;
      while ((match = urlRuleRegex.exec(content)) !== null) {
        const methods = match[2]
          ? match[2].split(',').map((s) => s.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean)
          : ['GET'];
        for (const m of methods) {
          this.registerEndpoint({
            method: m,
            path: match[1],
            module: moduleInfo.relativePath,
            source: 'Flask add_url_rule'
          }, moduleInfo);
        }
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

    // Spring Boot & JAX-RS Endpoints (incl. class-level @RequestMapping / @Path prefix)
    if (content.includes('Mapping') || content.includes('@Path') || content.includes('@GET')) {
      const classReq = content.match(/@RequestMapping\s*\(\s*(?:(?:value|path)\s*=\s*)?['"]([^'"]+)['"]/);
      const classPrefix = classReq ? ('/' + classReq[1].replace(/^\/|\/$/g, '')) : '';

      const springRegex = /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*(?:\(\s*([^)]*)\))?/g;
      while ((match = springRegex.exec(content)) !== null) {
        let method = match[1].replace('Mapping', '').toUpperCase();
        if (method === 'REQUEST') {
          const mm = (match[2] || '').match(/RequestMethod\.([A-Z]+)/);
          method = mm ? mm[1] : 'GET/POST';
        }
        const pathM = (match[2] || '').match(/['"]([^'"]+)['"]/) || ['', ''];
        const subPath = pathM[1] ? ('/' + pathM[1].replace(/^\/|\/$/g, '')) : '';
        const fullPath = (classPrefix + subPath) || '/';
        this.registerEndpoint({
          method,
          path: fullPath,
          module: moduleInfo.relativePath,
          source: 'Spring Boot'
        }, moduleInfo);
      }

      // JAX-RS / Quarkus / Micronaut: @Path("/users")
      const jaxPathMatch = content.match(/@Path\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      const jaxPrefix = jaxPathMatch ? ('/' + jaxPathMatch[1].replace(/^\/|\/$/g, '')) : '';
      const jaxMethodRegex = /@(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b(?:\s*@Path\s*\(\s*['"]([^'"]+)['"]\s*\))?/gi;
      while ((match = jaxMethodRegex.exec(content)) !== null) {
        const sub = match[2] ? ('/' + match[2].replace(/^\/|\/$/g, '')) : '';
        const fullPath = (jaxPrefix + sub) || '/';
        this.registerEndpoint({
          method: match[1].toUpperCase(),
          path: fullPath,
          module: moduleInfo.relativePath,
          source: 'JAX-RS'
        }, moduleInfo);
      }
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

    // Gin / Fiber / Echo / Chi / Mux routes
    const ginRegex = /(?:\w+)\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|Get|Post|Put|Delete|Patch|Options|Head|HandleFunc|Handle)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = ginRegex.exec(content)) !== null) {
      let method = match[1].toUpperCase();
      if (method === 'HANDLEFUNC' || method === 'HANDLE') method = 'ALL';
      this.registerEndpoint({
        method,
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Go Web Framework'
      }, moduleInfo);
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

    const classRouteMatch = content.match(/\[Route\s*\(\s*['"]([^'"]+)['"]\s*\)\]/);
    const classPrefix = classRouteMatch ? ('/' + classRouteMatch[1].replace(/^\/|\/$/g, '')) : '';

    const routeRegex = /\[Http(Get|Post|Put|Delete|Patch|Head|Options)\s*(?:\(['"]([^'"]*)['"]\))?\]/g;
    while ((match = routeRegex.exec(content)) !== null) {
      const sub = match[2] ? ('/' + match[2].replace(/^\/|\/$/g, '')) : '';
      const fullPath = (classPrefix + sub) || '/';
      this.registerEndpoint({
        method: match[1].toUpperCase(),
        path: fullPath,
        module: moduleInfo.relativePath,
        source: 'ASP.NET Core'
      }, moduleInfo);
    }

    const mapRegex = /\.(?:MapGet|MapPost|MapPut|MapDelete|MapPatch)\s*\(\s*['"]([^'"]+)['"]/gi;
    while ((match = mapRegex.exec(content)) !== null) {
      const m = match[0].match(/Map(Get|Post|Put|Delete|Patch)/i);
      this.registerEndpoint({
        method: (m ? m[1] : 'GET').toUpperCase(),
        path: match[1],
        module: moduleInfo.relativePath,
        source: '.NET Minimal API'
      }, moduleInfo);
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
      this.registerEndpoint({
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Laravel Route'
      }, moduleInfo);
    }

    // Laravel resource routes expand to conventional REST endpoints
    const resRegex = /Route\s*::\s*(?:apiR|r)esource\s*\(\s*['"]([^'"]+)['"]/gi;
    while ((match = resRegex.exec(content)) !== null) {
      const base = '/' + match[1].replace(/^\/|\/$/g, '');
      for (const [m, p] of [['GET', base], ['POST', base], ['GET', `${base}/{id}`], ['PUT', `${base}/{id}`], ['DELETE', `${base}/{id}`]]) {
        this.registerEndpoint({ method: m, path: p, module: moduleInfo.relativePath, source: 'Laravel Resource' }, moduleInfo);
      }
    }

    // Symfony #[Route('/path', methods: ['GET', 'POST'])]
    const symfonyRegex = /#\[Route\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*methods:\s*\[([^\]]+)\])?/gi;
    while ((match = symfonyRegex.exec(content)) !== null) {
      const pathUrl = match[1];
      const methods = match[2]
        ? match[2].split(',').map((s) => s.replace(/['"\s]/g, '').toUpperCase()).filter(Boolean)
        : ['GET'];
      for (const m of methods) {
        this.registerEndpoint({ method: m, path: pathUrl, module: moduleInfo.relativePath, source: 'Symfony Route' }, moduleInfo);
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
      this.registerEndpoint({
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleInfo.relativePath,
        source: 'Rails Route'
      }, moduleInfo);
    }

    // Rails `resources :things` expands to conventional REST endpoints
    const resRegex = /^\s*resources\s+:([a-z_]+)/gm;
    while ((match = resRegex.exec(content)) !== null) {
      const base = '/' + match[1];
      for (const [m, p] of [['GET', base], ['POST', base], ['GET', `${base}/{id}`], ['PUT', `${base}/{id}`], ['DELETE', `${base}/{id}`]]) {
        this.registerEndpoint({ method: m, path: p, module: moduleInfo.relativePath, source: 'Rails Resources' }, moduleInfo);
      }
    }
  }
}

module.exports = PolyglotParser;
