import { useEffect } from 'react';

type ElectronMenuApi = Record<string, unknown>;
type CommandRegistrar = (api: ElectronMenuApi) => void | (() => void);

/**
 * Own the Electron-only subscription lifecycle. App code supplies command
 * behavior, while this hook ensures browser builds do not touch electronAPI
 * and stale IPC listeners are cleared before each registration.
 */
export function useElectronMenuCommands(register: CommandRegistrar) {
  useEffect(() => {
    const api = typeof window !== 'undefined' ? (window as any).electronAPI as ElectronMenuApi | undefined : undefined;
    if (!api) return;
    (api.clearMenuListeners as (() => void) | undefined)?.();
    return register(api);
  }, [register]);
}
