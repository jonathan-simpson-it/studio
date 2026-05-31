'use client';

import { useState, useCallback } from 'react';

export function useBulkSelection(items: { id: string }[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((i) => i.id)));
  }, [items]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const allSelected = items.length > 0 && selected.size === items.length;

  return { selected: [...selected], toggle, selectAll, clearAll, isSelected, allSelected, count: selected.size };
}
