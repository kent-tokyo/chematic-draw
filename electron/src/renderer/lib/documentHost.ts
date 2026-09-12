/** Narrow host contract for browser-only document controls. */
export interface DocumentHost {
  readonly kind: 'browser';
  download(fileName: string, content: string, contentType: string): void;
  downloadBase64(fileName: string, content: string, contentType: string): void;
  writeClipboard(text: string): Promise<void>;
  readRecovery(): Promise<string | null>;
  writeRecovery(text: string): Promise<void>;
  clearRecovery(): Promise<void>;
}

export const BROWSER_RECOVERY_KEY = 'chematic-draw/browser-recovery-v1';
const RECOVERY_DB_NAME = 'chematic-draw-browser';
const RECOVERY_STORE_NAME = 'documents';
const RECOVERY_RECORD_KEY = 'recovery';

function openRecoveryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECOVERY_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(RECOVERY_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

async function readIndexedRecovery(): Promise<string | null> {
  const db = await openRecoveryDb();
  return await new Promise((resolve, reject) => {
    const request = db.transaction(RECOVERY_STORE_NAME, 'readonly').objectStore(RECOVERY_STORE_NAME).get(RECOVERY_RECORD_KEY);
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
  });
}

async function writeIndexedRecovery(text: string | null): Promise<void> {
  const db = await openRecoveryDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(RECOVERY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(RECOVERY_STORE_NAME);
    if (text === null) store.delete(RECOVERY_RECORD_KEY); else store.put(text, RECOVERY_RECORD_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
  });
}

export const browserDocumentHost: DocumentHost = {
  kind: 'browser',
  download: (fileName, content, contentType) => {
    const url = URL.createObjectURL(new Blob([content], { type: contentType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
  downloadBase64: (fileName, content, contentType) => {
    const bytes = Uint8Array.from(atob(content), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
  writeClipboard: async (text) => {
    if (!navigator.clipboard) throw new Error('Clipboard API not available');
    await navigator.clipboard.writeText(text);
  },
  readRecovery: async () => {
    try {
      if (typeof indexedDB !== 'undefined') return await readIndexedRecovery();
    } catch { /* fall through to the small-storage fallback */ }
    try { return window.localStorage.getItem(BROWSER_RECOVERY_KEY); } catch { return null; }
  },
  writeRecovery: async (text) => {
    try {
      if (typeof indexedDB !== 'undefined') { await writeIndexedRecovery(text); return; }
    } catch { /* fall through to the small-storage fallback */ }
    try { window.localStorage.setItem(BROWSER_RECOVERY_KEY, text); } catch { /* optional capability */ }
  },
  clearRecovery: async () => {
    try {
      if (typeof indexedDB !== 'undefined') { await writeIndexedRecovery(null); return; }
    } catch { /* fall through to the small-storage fallback */ }
    try { window.localStorage.removeItem(BROWSER_RECOVERY_KEY); } catch { /* optional capability */ }
  },
};
