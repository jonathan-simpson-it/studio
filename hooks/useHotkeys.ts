'use client';

import { useEffect, useCallback } from 'react';

type Hotkey = {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: () => void;
  enabled?: boolean;
};

function isActiveElementEditable(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = (el as HTMLElement).tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

export function useHotkeys(hotkeys: Hotkey[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isActiveElementEditable()) return;
      for (const hotkey of hotkeys) {
        if (hotkey.enabled === false) continue;
        const metaKey = e.metaKey || e.ctrlKey;
        const metaMatch = hotkey.meta ? metaKey : !metaKey;
        if (
          (!hotkey.ctrl || e.ctrlKey) &&
          (!hotkey.shift || e.shiftKey) &&
          metaMatch &&
          e.key.toLowerCase() === hotkey.key.toLowerCase()
        ) {
          e.preventDefault();
          hotkey.handler();
          return;
        }
      }
    },
    [hotkeys]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
