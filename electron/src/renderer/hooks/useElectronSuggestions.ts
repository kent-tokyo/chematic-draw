import { useEffect, useRef } from 'react';
import { useMoleculeStore } from '../store/moleculeStore';
import { useMechanismStore } from '../store/mechanismStore';
import { suggestArrowPairs } from '../lib/electronDetection';

/**
 * Hook that monitors molecule changes and auto-generates electron flow suggestions
 */
export function useElectronSuggestions() {
  const molecule = useMoleculeStore((s) => s.molecule);
  const mechanismArrows = useMechanismStore((s) => s.arrows);
  const setSuggestions = useMechanismStore((s) => s.setSuggestions);

  // Debounce timer to avoid recalculating too frequently
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce: wait 500ms after molecule change before generating suggestions
    debounceTimer.current = setTimeout(() => {
      try {
        // Generate suggestions
        const suggestions = suggestArrowPairs(molecule, 5);

        // Filter out suggestions where arrows already exist
        const filteredSuggestions = suggestions.filter((suggestion) => {
          return !mechanismArrows.some(
            (arrow) =>
              arrow.sourceAtomId === suggestion.sourceAtomId &&
              arrow.sinkAtomId === suggestion.sinkAtomId
          );
        });

        // Update store with filtered suggestions
        setSuggestions(filteredSuggestions);
      } catch (error) {
        console.error('Error generating electron suggestions:', error);
        setSuggestions([]);
      }
    }, 500);

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [molecule, mechanismArrows, setSuggestions]);
}
