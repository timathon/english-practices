import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Uses a reference counter to safely handle multiple active modals.
 */
export function useLockBodyScroll(locked: boolean = true): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [locked]);
}
