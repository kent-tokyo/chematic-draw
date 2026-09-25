// Keep the runtime engine identity in one place for the Electron main and
// renderer bundles. The public contract repeats the literal in its type
// declarations so consumers do not need to import Electron code.
export const APP_NAME = 'chematic-draw' as const;
export const ENGINE_VERSION = '1.0.26' as const;
export const ENGINE_ID = `chematic ${ENGINE_VERSION}` as const;
export const LEGACY_ENGINE_IDS = ['chematic 1.0.12', 'chematic 1.0.19', 'chematic 1.0.25'] as const;

export function isCompatibleEngineId(value: unknown): value is typeof ENGINE_ID | (typeof LEGACY_ENGINE_IDS)[number] {
  return value === ENGINE_ID || LEGACY_ENGINE_IDS.some((engineId) => value === engineId);
}
