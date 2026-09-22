import { useEffect } from 'react';
import { getElectronApi, type ElectronApi } from '../electronApi';

type CommandRegistrar = (api: ElectronApi) => void | (() => void);

/**
 * Own the Electron-only subscription lifecycle. App code supplies command
 * behavior, while this hook ensures browser builds do not touch electronAPI
 * and stale IPC listeners are cleared before each registration.
 */
export function useElectronMenuCommands(register: CommandRegistrar) {
  useEffect(() => {
    const api = getElectronApi();
    if (!api) return;
    api.clearMenuListeners();
    return register(api);
  }, [register]);
}
