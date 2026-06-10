import { useEffect } from 'react';
import { useReactionSchemeStore } from '../store/reactionSchemeStore';

/**
 * Hook that monitors scheme changes and calculates atom mappings automatically
 */
export function useAtomMapping() {
  const scheme = useReactionSchemeStore((s) => s.scheme);
  const calculateAtomMappings = useReactionSchemeStore((s) => s.calculateAtomMappings);

  useEffect(() => {
    if (scheme && scheme.steps.length > 0) {
      calculateAtomMappings();
    }
  }, [scheme?.id, scheme?.steps.length, calculateAtomMappings]);

  // Return selectors for convenient access
  return {
    atomMappings: useReactionSchemeStore((s) => s.atomMappings),
    reactionClassification: useReactionSchemeStore((s) => s.reactionClassification),
    greenMetrics: useReactionSchemeStore((s) => s.greenMetrics),
  };
}
