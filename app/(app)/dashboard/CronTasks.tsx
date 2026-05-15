'use client';

import { useEffect } from 'react';
import { processPendingReminders } from '@/lib/db/actions/calendar';
import { processOverdueChecks } from '@/lib/db/actions/invoices';
import { syncAllGithubIssues } from '@/lib/db/actions/projects';

export function CronTasks() {
  useEffect(() => {
    processPendingReminders().catch(() => {});
    processOverdueChecks().catch(() => {});
    syncAllGithubIssues().catch(() => {});
  }, []);

  return null;
}
