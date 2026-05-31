'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { MobileBottomBar } from '@/components/layout/MobileBottomBar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { QuickCreateFAB } from '@/components/layout/QuickCreateFAB';
import { OnboardingTour } from '@/components/shared/OnboardingTour';
import { KeyboardShortcuts } from '@/components/shared/KeyboardShortcuts';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useHotkeys } from '@/hooks/useHotkeys';

const CommandMenu = dynamic(() => import('@/components/layout/CommandMenu').then((m) => m.CommandMenu), { ssr: false });

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/clients': 'Clients',
  '/projects': 'Projects',
  '/issues': 'Issues',
  '/tasks': 'Tasks',
  '/notes': 'Notes',
  '/proposals': 'Proposals',
  '/invoices': 'Invoices',
  '/calendar': 'Calendar',
  '/finance': 'Finance',
  '/settings': 'Settings',
  '/inbox': 'Inbox',
  '/activity': 'Activity',
  '/import': 'Import Data',
  '/shortcuts': 'Keyboard Shortcuts',
};

function getTitle(pathname: string): string {
  if (pathname.startsWith('/leads/')) return 'Lead Detail';
  if (pathname.startsWith('/clients/')) return 'Client Detail';
  if (pathname.startsWith('/projects/')) return 'Project Detail';
  if (pathname.startsWith('/issues/')) return 'Issue Detail';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [skipLinkClicked, setSkipLinkClicked] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const router = useRouter();

  useHotkeys([
    { key: '?', handler: () => router.push('/shortcuts') },
    { key: 'n', handler: () => router.push('/tasks') },
    { key: 'l', handler: () => router.push('/leads') },
    { key: 'p', handler: () => router.push('/projects') },
    { key: 'Escape', handler: () => setDrawerOpen(false) },
  ]);


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
    <TooltipProvider>
    <div className="flex min-h-dvh">
      <Sidebar onCmdK={() => setCmdOpen(true)} />

      <div className="flex flex-1 flex-col md:pl-60 pb-14 md:pb-0">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
          onClick={() => setSkipLinkClicked(true)}
        >
          Skip to main content
        </a>
        <TopBar title={title} onMenuClick={() => setDrawerOpen(true)} />

        <main id={skipLinkClicked ? 'main-content' : undefined} className="flex-1 overflow-auto p-4 md:p-6">
          {pathname.split('/').filter(Boolean).length > 1 && <Breadcrumbs />}
          {children}
        </main>
      </div>

      <MobileBottomBar onMoreClick={() => setDrawerOpen(true)} />
      <QuickCreateFAB />
      <MobileNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSearch={() => setCmdOpen(true)} />
      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
      <OnboardingTour />
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
    </TooltipProvider>
  );
}
