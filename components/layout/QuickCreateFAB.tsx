'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Users, CheckSquare, StickyNote, FolderKanban, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const actions = [
  { label: 'New Lead', icon: Users, href: '/leads' },
  { label: 'New Task', icon: CheckSquare, href: '/tasks' },
  { label: 'New Note', icon: StickyNote, href: '/notes' },
  { label: 'New Project', icon: FolderKanban, href: '/projects' },
  { label: 'New Proposal', icon: FileText, href: '/proposals' },
  { label: 'New Invoice', icon: Receipt, href: '/invoices' },
];

export function QuickCreateFAB() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Quick create"
      >
        <PlusCircle className="h-7 w-7" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-72">
          <DialogHeader>
            <DialogTitle>Quick Create</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  setOpen(false);
                  router.push(action.href);
                }}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <action.icon className="h-6 w-6" />
                {action.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
