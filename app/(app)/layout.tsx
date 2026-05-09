'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CommandMenu } from '@/components/layout/CommandMenu';
import { cn } from '@/lib/utils';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/notes': 'Notes',
  '/proposals': 'Proposals',
  '/invoices': 'Invoices',
  '/finance': 'Finance',
  '/settings': 'Settings',
};

function getTitle(pathname: string): string {
  if (pathname.startsWith('/leads/')) return 'Lead Detail';
  if (pathname.startsWith('/clients/')) return 'Client Detail';
  if (pathname.startsWith('/projects/')) return 'Project Detail';
  if (pathname.startsWith('/notes/')) return 'Note Detail';
  if (pathname.startsWith('/proposals/')) return 'Proposal Detail';
  if (pathname.startsWith('/invoices/')) return 'Invoice Detail';
  if (pathname.startsWith('/settings')) return 'Settings';
  return pageTitles[pathname] || 'Studio';
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const title = getTitle(pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar onCmdK={() => setCmdOpen(true)} />

      <div className="flex flex-1 flex-col pl-60">
        <TopBar title={title} />

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
