interface FileIpcDependencies {
  ipcMain: { handle: (channel: string, handler: (...args: any[]) => unknown) => void };
  BrowserWindow: any;
  dialog: any;
  isTrustedRendererEvent: (event: unknown) => boolean;
  isValidFilePath: (filePath: unknown) => boolean;
  isValidBase64: (value: unknown) => boolean;
  writeFileAtomically: (filePath: string, data: unknown, options?: string) => void;
  svgPageSizeInches: (svgText: string) => { width: number; height: number };
  isSafeSvgForPdf: (svgText: string) => boolean;
  maxTextBytes: number;
  maxBinaryBytes: number;
  readImportText: (filePath: string) => string;
  getMainWindow: () => any;
}

/** Registers file and PDF IPC without mixing it into menu or recovery code. */
export function registerFileIpcHandlers({
  ipcMain,
  BrowserWindow,
  dialog,
  isTrustedRendererEvent,
  isValidFilePath,
  isValidBase64,
  writeFileAtomically,
  svgPageSizeInches,
  isSafeSvgForPdf,
  maxTextBytes,
  maxBinaryBytes,
  getMainWindow,
}: FileIpcDependencies) {
  ipcMain.handle('file:save-dialog', async (event, defaultPath) => {
    if (!isTrustedRendererEvent(event)) return { canceled: true };
    if (defaultPath !== undefined && defaultPath !== null && !isValidFilePath(defaultPath)) return { canceled: true };
    const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow(), {
      defaultPath,
      filters: [
        { name: 'MOL V2000', extensions: ['mol'] }, { name: 'SMILES', extensions: ['smi'] },
        { name: 'SDF', extensions: ['sdf'] }, { name: 'SVG', extensions: ['svg'] },
        { name: 'PNG', extensions: ['png'] }, { name: 'PDF', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return { canceled, filePath };
  });

  ipcMain.handle('file:write', async (event, filePath, content) => {
    try {
      if (!isTrustedRendererEvent(event)) throw new Error('File write request came from an untrusted renderer.');
      if (!isValidFilePath(filePath)) throw new Error('File write rejected an invalid file path.');
      if (typeof content !== 'string' || content.length > maxTextBytes) throw new Error('File write rejected an invalid or oversized text payload.');
      writeFileAtomically(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('file:write-binary', async (event, filePath, base64Content) => {
    try {
      if (!isTrustedRendererEvent(event)) throw new Error('Binary file write request came from an untrusted renderer.');
      if (!isValidFilePath(filePath)) throw new Error('Binary file write rejected an invalid file path.');
      if (!isValidBase64(base64Content)) throw new Error('Binary file write rejected an invalid base64 payload.');
      const buffer = Buffer.from(base64Content, 'base64');
      if (buffer.length > maxBinaryBytes) throw new Error('Binary file write payload exceeds its size limit.');
      writeFileAtomically(filePath, buffer);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('export:pdf', async (event, filePath, svgText) => {
    let pdfWindow: any;
    try {
      if (!isTrustedRendererEvent(event)) throw new Error('PDF export request came from an untrusted renderer.');
      if (!isValidFilePath(filePath)) throw new Error('PDF export rejected an invalid file path.');
      if (typeof svgText !== 'string' || svgText.length > maxTextBytes) throw new Error('PDF export rejected an invalid or oversized SVG payload.');
      if (!isSafeSvgForPdf(svgText)) throw new Error('PDF export rejected unsafe SVG content.');
      const { width, height } = svgPageSizeInches(svgText);
      const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0}</style></head><body>${svgText}</body></html>`;
      pdfWindow = new BrowserWindow({ show: false });
      await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      const buffer = await pdfWindow.webContents.printToPDF({ printBackground: true, pageSize: { width, height }, margins: { marginType: 'none' } });
      writeFileAtomically(filePath, buffer);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.destroy();
    }
  });
}
