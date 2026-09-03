import { useCallback, useEffect, useRef } from 'react';
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

  // The expensive chemistry inference is molecule-dependent only. Keep its
  // unfiltered result so arrow edits can update visibility without rerunning
  // inference for an unchanged molecule.
  const baseSuggestionsRef = useRef<ReturnType<typeof suggestArrowPairs>>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const filterExistingArrows = useCallback(
    (suggestions: ReturnType<typeof suggestArrowPairs>, arrows: typeof mechanismArrows) =>
      suggestions.filter((suggestion) => !arrows.some(
        (arrow) => arrow.sourceAtomId === suggestion.sourceAtomId && arrow.sinkAtomId === suggestion.sinkAtomId
      )),
    []
  );

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

        baseSuggestionsRef.current = suggestions;
        setSuggestions(filterExistingArrows(suggestions, useMechanismStore.getState().arrows));
      } catch (error) {
        console.error('Error generating electron suggestions:', error);
        baseSuggestionsRef.current = [];
        setSuggestions([]);
      }
    }, 500);

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filterExistingArrows, molecule, setSuggestions]);

  // Arrow changes only require a cheap visibility filter. This also restores
  // suggestions when an existing arrow is removed, without paying for a new
  // chemistry inference pass.
  useEffect(() => {
    setSuggestions(filterExistingArrows(baseSuggestionsRef.current, mechanismArrows));
  }, [filterExistingArrows, mechanismArrows, setSuggestions]);
}
