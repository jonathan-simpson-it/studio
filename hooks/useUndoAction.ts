'use client';

import { toast } from 'sonner';

export function useUndoAction() {
  function withUndo<T>(
    action: () => Promise<T>,
    undoAction: () => Promise<void>,
    options: {
      successMessage?: string;
      undoMessage?: string;
      duration?: number;
    } = {}
  ) {
    const { successMessage = 'Done', undoMessage = 'Undo', duration = 5000 } = options;

    return new Promise<void>((resolve, reject) => {
      action()
        .then(() => {
          toast(successMessage, {
            action: {
              label: undoMessage,
              onClick: async () => {
                try {
                  await undoAction();
                  toast.success('Restored');
                } catch {
                  toast.error('Failed to undo');
                }
              },
            },
            duration,
          });
          resolve();
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : 'Action failed');
          reject(err);
        });
    });
  }

  return { withUndo };
}
