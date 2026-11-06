// @ts-nocheck
/* eslint-disable */
/**
 * Protocol Handler: Strict Separation of HTTP and HTTPS Target Pipelines
 *
 * Provides dedicated, decoupled pipelines for handling:
 * 1. Plain HTTP targets (local development servers, internal LANs, non-TLS APIs).
 * 2. Secure HTTPS targets (public websites, TLS SAN inspection, HSTS, WAF mitigation).
 */

class ProtocolHandler {
  /**
   * Determine whether a URL uses HTTPS.
   */
  static isHttps(url = '') {
    if (typeof url !== 'string') return false;
    return url.trim().toLowerCase().startsWith('https://');
  }

  /**
   * Determine whether a URL uses plain HTTP.
   */
  static isHttp(url = '') {
    if (typeof url !== 'string') return false;
    return url.trim().toLowerCase().startsWith('http://');
  }

  /**
   * Normalize an input target string into a fully qualified URL.
   * If no protocol is provided, defaults to HTTPS for remote domains, and HTTP for localhost.
   */
  static normalizeTargetUrl(input = '') {
    if (!input || typeof input !== 'string') return '';
    const trimmed = input.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Plain localhost or 127.0.0.1 defaults to HTTP
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(trimmed)) {
      return `http://${trimmed}`;
    }
    // Remote internet targets default to HTTPS
    return `https://${trimmed}`;
  }

  /**
   * Pipeline for Plain HTTP Targets
   * - Never performs TLS certificate handshakes.
   * - Does not enforce HTTPS upgrades on local/intranet origins.
   * - Preserves HTTP URLs in discovery mappings and OpenAPI servers.
   */
  static configureHttpPipeline(targetUrl, options = {}) {
    const parsed = new URL(targetUrl);
    return {
      protocol: 'http:',
      isSecure: false,
      origin: parsed.origin,
      hostname: parsed.hostname,
      port: parsed.port || '80',
      shouldExtractTlsSans: false,
      defaultServerUrl: parsed.origin,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      }
    };
  }

  /**
   * Pipeline for Secure HTTPS Targets
   * - Supports TLS SAN cryptographic certificate inspection.
   * - Supports SNI (Server Name Indication).
   * - Prepares WAF and edge CDN challenge mitigation.
   */
  static configureHttpsPipeline(targetUrl, options = {}) {
    const parsed = new URL(targetUrl);
    return {
      protocol: 'https:',
      isSecure: true,
      origin: parsed.origin,
      hostname: parsed.hostname,
      port: parsed.port || '443',
      shouldExtractTlsSans: true,
      defaultServerUrl: parsed.origin,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      }
    };
  }

  /**
   * Resolve appropriate protocol pipeline based on the target URL.
   */
  static resolvePipeline(targetUrl, options = {}) {
    const normalized = this.normalizeTargetUrl(targetUrl);
    if (this.isHttps(normalized)) {
      return this.configureHttpsPipeline(normalized, options);
    }
    return this.configureHttpPipeline(normalized, options);
  }
}

module.exports = ProtocolHandler;
