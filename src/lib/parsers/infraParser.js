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
  }

  parseDirectory(dirPath, fileList) {
    for (const filePath of fileList) {
      try {
        const fileName = path.basename(filePath).toLowerCase();
        const content = fs.readFileSync(filePath, 'utf-8');

        if (fileName === 'docker-compose.yml' || fileName === 'docker-compose.yaml') {
          this.parseDockerCompose(content, filePath);
        } else if (fileName === 'dockerfile' || fileName.startsWith('dockerfile.')) {
          this.parseDockerfile(content, filePath);
        } else if (fileName.includes('openapi') || fileName.includes('swagger')) {
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
      configs: this.configs
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
        for (const [pathUrl, methods] of Object.entries(spec.paths)) {
          for (const [method, details] of Object.entries(methods)) {
            this.externalAPIs.push({
              path: pathUrl,
              method: method.toUpperCase(),
              summary: details.summary || details.description || '',
              source: filePath
            });
          }
        }
      }
    } catch {
      // not standard JSON
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
