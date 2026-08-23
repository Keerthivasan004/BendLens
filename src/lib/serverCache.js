/**
 * Server-Side In-Memory Cache for BendLens Analysis
 * Avoids browser localStorage 5MB quota limitations entirely.
 * Enables analyzing multi-gigabyte enterprise codebases seamlessly.
 */
class ServerCache {
  constructor() {
    this.latestAnalysis = null;
    this.cacheByPath = new Map();
  }

  setLatest(data) {
    this.latestAnalysis = data;
    if (data?.projectPath) {
      this.cacheByPath.set(data.projectPath, data);
    }
  }

  getLatest() {
    return this.latestAnalysis;
  }

  getByPath(projectPath) {
    return this.cacheByPath.get(projectPath);
  }
}

// Global singleton instance
if (!global.__bendlens_cache__) {
  global.__bendlens_cache__ = new ServerCache();
}

module.exports = global.__bendlens_cache__;
