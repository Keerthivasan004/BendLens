/**
 * Safe runtime loader for AdmZip.
 *
 * Avoids Turbopack/Next.js static import hashing (which generates `adm-zip-<hash>`
 * external require calls that break in packaged Electron desktop installations).
 */

let cachedAdmZip = null;

export function getAdmZip() {
  if (cachedAdmZip) return cachedAdmZip;

  try {
    // Dynamic eval require bypasses Turbopack AST static analysis
    const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : eval('require');
    cachedAdmZip = req('adm-zip');
    return cachedAdmZip;
  } catch (err1) {
    try {
      cachedAdmZip = require('adm-zip');
      return cachedAdmZip;
    } catch (err2) {
      console.error('[safeAdmZip] Failed to load adm-zip engine:', err1?.message, err2?.message);
      throw new Error(`ZIP extraction engine could not be loaded: ${err1?.message || err2?.message}`);
    }
  }
}

export default getAdmZip;
