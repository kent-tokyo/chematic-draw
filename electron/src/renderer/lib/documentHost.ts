/** Narrow host contract for browser-only document controls. */
export interface DocumentHost {
  readonly kind: 'browser';
  download(fileName: string, content: string, contentType: string): void;
  downloadBase64(fileName: string, content: string, contentType: string): void;
  writeClipboard(text: string): Promise<void>;
  readRecovery(): string | null;
  writeRecovery(text: string): void;
  clearRecovery(): void;
}

export const BROWSER_RECOVERY_KEY = 'chematic-draw/browser-recovery-v1';

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
  readRecovery: () => {
    try { return window.localStorage.getItem(BROWSER_RECOVERY_KEY); } catch { return null; }
  },
  writeRecovery: (text) => {
    try { window.localStorage.setItem(BROWSER_RECOVERY_KEY, text); } catch { /* optional capability */ }
  },
  clearRecovery: () => {
    try { window.localStorage.removeItem(BROWSER_RECOVERY_KEY); } catch { /* optional capability */ }
  },
};
