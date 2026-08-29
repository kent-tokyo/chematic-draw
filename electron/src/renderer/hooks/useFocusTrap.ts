import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Traps Tab/Shift+Tab focus within the returned ref's subtree while `active`
// is true, and restores focus to whatever was focused before it activated
// once it deactivates. These custom position:fixed overlay modals have no
// native <dialog> element doing this for free, so keyboard/screen-reader
// users could otherwise Tab straight through to canvas/sidebar controls
// hidden behind the backdrop.
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    (focusable()[0] ?? container).focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const elements = focusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active]);

  return containerRef;
}
