import { clipboard } from 'electron';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface ClipboardAutosaveDependencies {
  ipcMain: any;
  isTrustedRendererEvent: (event: any) => boolean;
  maxTextLength: number;
  maxAutosaveJsonLength: number;
  maxAutosaveFilePathLength: number;
  autosavePath: string;
  autosaveTmpPath: string;
  isSafeMolecule: (molecule: unknown) => boolean;
  getPendingRecovery: () => unknown;
  clearPendingRecovery: () => void;
  getAutosaveWriteQueue: () => Promise<void>;
  setAutosaveWriteQueue: (queue: Promise<void>) => void;
}

export const registerClipboardAutosaveIpcHandlers = ({
  ipcMain,
  isTrustedRendererEvent,
  maxTextLength,
  maxAutosaveJsonLength,
  maxAutosaveFilePathLength,
  autosavePath,
  autosaveTmpPath,
  isSafeMolecule,
  getPendingRecovery,
  clearPendingRecovery,
  getAutosaveWriteQueue,
  setAutosaveWriteQueue,
}: ClipboardAutosaveDependencies) => {
  ipcMain.handle('clipboard:write', async (event: any, format: unknown, content: unknown) => {
    try {
      if (!isTrustedRendererEvent(event)) throw new Error('Clipboard request came from an untrusted renderer.');
      if (format !== 'text/plain' || typeof content !== 'string' || content.length > maxTextLength) {
        throw new Error('Clipboard write rejected an invalid or oversized text payload.');
      }
      await clipboard.writeText(content);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('clipboard:read', async (event: any) => {
    try {
      if (!isTrustedRendererEvent(event)) throw new Error('Clipboard request came from an untrusted renderer.');
      const text = await clipboard.readText();
      if (typeof text !== 'string' || text.length > maxTextLength) {
        throw new Error('Clipboard read rejected an oversized text payload.');
      }
      return { success: true, content: text };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('autosave:write', async (event: any, molecule: unknown, filePath: unknown) => {
    if (!isTrustedRendererEvent(event)) {
      return { success: false, error: 'Autosave request came from an untrusted renderer.' };
    }
    const writeSnapshot = () => {
      const normalizedFilePath = filePath ?? null;
      if (!isSafeMolecule(molecule)) throw new Error('Autosave rejected an invalid or oversized molecule.');
      if (normalizedFilePath !== null && (typeof normalizedFilePath !== 'string'
        || normalizedFilePath.length > maxAutosaveFilePathLength)) {
        throw new Error('Autosave rejected an invalid file path.');
      }
      const snapshotText = JSON.stringify({ molecule, filePath: normalizedFilePath });
      if (snapshotText.length > maxAutosaveJsonLength) throw new Error('Autosave snapshot exceeds its size limit.');
      const dir = path.dirname(autosavePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(autosaveTmpPath, snapshotText, 'utf-8');
      renameSync(autosaveTmpPath, autosavePath);
    };
    const queue = getAutosaveWriteQueue().then(writeSnapshot, writeSnapshot);
    setAutosaveWriteQueue(queue);
    try {
      await queue;
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('autosave:get-pending-recovery', async (event: any) => {
    if (!isTrustedRendererEvent(event)) return null;
    const snapshot = getPendingRecovery();
    clearPendingRecovery();
    return snapshot;
  });
};
