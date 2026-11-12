/**
 * Robust Client Storage & In-Memory Bridge for BendLens Architecture Payloads
 * 
 * Solves:
 * 1. 5.0 MB browser sessionStorage quota rejection on colossal crawls (6,000+ endpoints / 3,000+ subdomains).
 * 2. Seamless 0ms SPA state transfer from Ingestion Portal (/) to Studio Console (/lens) via window memory.
 * 3. Asynchronous IndexedDB persistence across page reloads without hard storage ceilings.
 */

const DB_NAME = 'bendlens_db';
const DB_VERSION = 1;
const STORE_NAME = 'analysis_store';
const RECORD_KEY = 'current_analysis';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists analysis data into window memory, IndexedDB, and sessionStorage.
 */
export async function saveAnalysisData(data) {
  if (!data || typeof window === 'undefined') return;

  // 1. In-memory window bridge (instantaneous 0ms, zero-copy for router.push('/lens'))
  window.__bendlens_current_data = data;

  // 2. Persist to IndexedDB (unrestricted capacity, asynchronous, survives tab reloads)
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, RECORD_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Non-fatal if IndexedDB is in private browsing restricted mode
  }

  // 3. Opportunistic sessionStorage fallback (for older legacy components)
  try {
    sessionStorage.setItem('bendlens-current-data', JSON.stringify(data));
  } catch (quotaErr) {
    // Safely ignore QuotaExceededError since window memory + IndexedDB already retain the data
  }
}

/**
 * Authoritatively retrieves current analysis data.
 */
export async function getAnalysisData() {
  if (typeof window === 'undefined') return null;

  // 1. Instant check in window memory bridge
  if (window.__bendlens_current_data) {
    return window.__bendlens_current_data;
  }

  // 2. Check IndexedDB
  try {
    const db = await openDb();
    const data = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (data) {
      window.__bendlens_current_data = data;
      return data;
    }
  } catch {}

  // 3. Check sessionStorage fallback
  try {
    const raw = sessionStorage.getItem('bendlens-current-data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) {
        window.__bendlens_current_data = parsed;
        return parsed;
      }
    }
  } catch {}

  return null;
}

/**
 * Clears current stored analysis data.
 */
export async function clearAnalysisData() {
  if (typeof window === 'undefined') return;
  window.__bendlens_current_data = null;
  try {
    sessionStorage.removeItem('bendlens-current-data');
  } catch {}
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(RECORD_KEY);
  } catch {}
}

