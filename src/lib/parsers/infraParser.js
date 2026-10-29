const fs = require('fs');
const path = require('path');

/**
 * Infrastructure & Configuration Parser
 * Extracts microservices, containers, databases, external ports,
 * and service boundaries from Docker, Compose, OpenAPI, and manifests.
 */
class InfraParser {
  constructor() {
    this.services = [];
    this.databases = [];
    this.configs = [];
    this.externalAPIs = [];
    this.subdomains = [];
  }

  parseDirectory(dirPath, fileList) {
    for (const filePath of fileList) {
      try {
        const fileName = path.basename(filePath).toLowerCase();
        const isInfraTarget = fileName === 'docker-compose.yml' ||
          fileName === 'docker-compose.yaml' ||
          fileName === 'dockerfile' ||
          fileName.startsWith('dockerfile.') ||
          fileName.includes('openapi') ||
          fileName.includes('swagger') ||
          fileName.includes('api-docs') ||
          fileName.includes('api-spec') ||
          fileName === 'package.json' ||
          fileName === 'requirements.txt';

        if (!isInfraTarget) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') {
          this.parseDockerCompose(content, filePath);
        } else if (fileName === 'dockerfile' || fileName.startsWith('dockerfile.')) {
          this.parseDockerfile(content, filePath);
        } else if (fileName.includes('openapi') || fileName.includes('swagger') || fileName.includes('api-docs') || fileName.includes('api-spec')) {
          this.parseOpenAPI(content, filePath);
        } else if (fileName === 'package.json') {
          this.parsePackageJson(content, filePath);
        } else if (fileName === 'requirements.txt') {
          this.parseRequirementsTxt(content, filePath);
        }
      } catch (err) {
        console.error(`Error parsing infra in ${filePath}:`, err.message);
      }
    }

    return {
      services: this.services,
      databases: this.databases,
      externalAPIs: this.externalAPIs,
      configs: this.configs,
      subdomains: Array.from(new Set(this.subdomains))
    };
  }

  parseDockerCompose(content, filePath) {
    // Simple YAML parser for services block
    const lines = content.split('\n');
    let inServices = false;
    let currentService = null;
    let currentIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('#')) continue;

      if (line.startsWith('services:')) {
        inServices = true;
        continue;
      }

      if (inServices) {
        // Service definition level (usually 2 spaces indent)
        const serviceMatch = line.match(/^  ([a-zA-Z0-9_-]+):/);
        if (serviceMatch) {
          currentService = {
            name: serviceMatch[1],
            image: null,
            ports: [],
            environment: [],
            dependsOn: [],
            isDatabase: false,
            sourceFile: filePath
          };

          // Check if it's a known database/queue image
          this.services.push(currentService);
          continue;
        }

        if (currentService) {
          // image: postgres:15
          const imageMatch = line.match(/^\s+image:\s*([^\s]+)/);
          if (imageMatch) {
            currentService.image = imageMatch[1];
            if (/postgres|mysql|mariadb|mongo|redis|cassandra|cockroach|sqlite/i.test(imageMatch[1])) {
              currentService.isDatabase = true;
              this.databases.push({
                name: currentService.name,
                type: imageMatch[1].split(':')[0],
                source: 'docker-compose'
              });
            }
          }

          // ports: ["5432:5432"]
          const portMatch = line.match(/^\s+-\s*["']?([0-9]+:[0-9]+)["']?/);
          if (portMatch) {
            currentService.ports.push(portMatch[1]);
          }

          // depends_on: - db
          const dependsMatch = line.match(/^\s+-\s*([a-zA-Z0-9_-]+)/);
          if (dependsMatch && lines[i - 1] && lines[i - 1].includes('depends_on:')) {
            currentService.dependsOn.push(dependsMatch[1]);
          }
        }
      }
    }
  }

  parseDockerfile(content, filePath) {
    const fromMatch = content.match(/^FROM\s+([^\s]+)/m);
    const exposeMatches = [...content.matchAll(/^EXPOSE\s+([0-9\s]+)/gm)];
    const ports = exposeMatches.map(m => m[1].trim());

    this.configs.push({
      type: 'Dockerfile',
      baseImage: fromMatch ? fromMatch[1] : 'unknown',
      exposedPorts: ports,
      sourceFile: filePath
    });
  }

  parseOpenAPI(content, filePath) {
    try {
      const spec = JSON.parse(content);
      if (spec.paths) {
        const specServerHosts = [];
        if (Array.isArray(spec.servers)) {
          for (const s of spec.servers) {
            if (s?.url) {
              try {
                let h = new URL(s.url).hostname.toLowerCase().replace(/^www\./, '');
                if (h && !specServerHosts.includes(h)) {
                  specServerHosts.push(h);
                  if (!this.subdomains.includes(h)) this.subdomains.push(h);
                }
              } catch {}
            }
          }
        }

        const basePath = (spec.basePath && spec.basePath !== '/') ? spec.basePath.replace(/\/+$/, '') : '';
        for (const [pathUrl, methods] of Object.entries(spec.paths)) {
          let fullPath = basePath ? `${basePath}${pathUrl.startsWith('/') ? pathUrl : '/' + pathUrl}` : pathUrl;
          let inferredSubdomain = null;
          let inferredOrigin = null;

          if (fullPath.startsWith('//')) {
            const parts = fullPath.slice(2).split('/');
            inferredSubdomain = parts[0];
            fullPath = '/' + parts.slice(1).join('/');
            inferredOrigin = `https://${inferredSubdomain}`;
          }

          for (const [method, details] of Object.entries(methods)) {
            if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
              const rawSub = details?.['x-subdomain'] || inferredSubdomain || (details?.servers?.[0]?.url ? (function() { try { return new URL(details.servers[0].url).hostname; } catch { return null; } })() : null) || (specServerHosts.length === 1 ? specServerHosts[0] : null);
              const sub = rawSub ? rawSub.toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./, '') : null;
              const orig = details?.['x-origin'] || inferredOrigin || (details?.servers?.[0]?.url || (sub ? `https://${sub}` : null));
              if (sub && !this.subdomains.includes(sub)) this.subdomains.push(sub);

              this.externalAPIs.push({
                path: fullPath,
                method: method.toUpperCase(),
                summary: (details && (details.summary || details.description)) || '',
                source: filePath,
                tags: (details && details.tags) || [],
                crawlTier: details?.['x-crawl-tier'] || 'normal',
                isLazyLoaded: details?.['x-lazy-loaded'] === true,
                discoveryScope: details?.['x-discovery-scope'] || (details?.['x-lazy-loaded'] ? 'Deep Crawl (Lazy-Loaded)' : 'Standard Crawl (Normal)'),
                routeType: details?.['x-route-type'] || 'API',
                isUiRoute: details?.['x-is-ui-route'] === true,
                subdomain: sub,
                origin: orig
              });
            }
          }
        }
        return;
      }
    } catch {
      // not JSON, attempt line-based YAML parsing
    }

    if (content.includes('paths:')) {
      const lines = content.split('\n');
      let inPaths = false;
      let currentPath = null;
      let basePath = '';
      const basePathMatch = content.match(/basePath:\s*['"]?([^'"\s\n]+)['"]?/i);
      if (basePathMatch && basePathMatch[1] && basePathMatch[1] !== '/') {
        basePath = basePathMatch[1].replace(/\/+$/, '');
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^paths\s*:/i.test(line)) {
          inPaths = true;
          continue;
        }
        if (inPaths && /^[a-zA-Z0-9_-]+\s*:/i.test(line) && !line.startsWith(' ')) {
          inPaths = false;
          break;
        }
        if (inPaths) {
          const pathMatch = line.match(/^\s{2,4}(\/[^:\s]+)\s*:/);
          if (pathMatch) {
            currentPath = pathMatch[1];
            continue;
          }
          if (currentPath) {
            const methodMatch = line.match(/^\s{4,8}(get|post|put|delete|patch|options|head)\s*:/i);
            if (methodMatch) {
              const fullPath = basePath ? `${basePath}${currentPath.startsWith('/') ? currentPath : '/' + currentPath}` : currentPath;
              this.externalAPIs.push({
                path: fullPath,
                method: methodMatch[1].toUpperCase(),
                summary: '',
                source: filePath
              });
            }
          }
        }
      }
    }
  }

  parsePackageJson(content, filePath) {
    try {
      const pkg = JSON.parse(content);
      this.configs.push({
        type: 'package.json',
        name: pkg.name || 'unnamed',
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {}),
        sourceFile: filePath
      });
    } catch {}
  }

  parseRequirementsTxt(content, filePath) {
    const deps = content.split('\n')
      .map(l => l.trim().split('==')[0].split('>=')[0].trim())
      .filter(l => l && !l.startsWith('#'));

    this.configs.push({
      type: 'requirements.txt',
      dependencies: deps,
      sourceFile: filePath
    });
  }
}

module.exports = InfraParser;
