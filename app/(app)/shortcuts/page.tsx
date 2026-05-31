'use client';

import { Kbd } from '@/components/shared/Kbd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const groups = [
  {
    title: 'Navigation',
    items: [
      { keys: ['⌘K', 'Ctrl+K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Open keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close drawer or modal' },
    ],
  },
  {
    title: 'Quick Create',
    items: [
      { keys: ['N'], description: 'New Task' },
      { keys: ['L'], description: 'New Lead' },
      { keys: ['P'], description: 'New Project' },
    ],
  },
  {
    title: 'Text Editing (TipTap)',
    items: [
      { keys: ['⌘B'], description: 'Bold' },
      { keys: ['⌘I'], description: 'Italic' },
      { keys: ['⌘⇧S'], description: 'Strikethrough' },
      { keys: ['⌘E'], description: 'Inline code' },
      { keys: ['⌘⇧7'], description: 'Ordered list' },
      { keys: ['⌘⇧8'], description: 'Bullet list' },
      { keys: ['⌘Z'], description: 'Undo' },
      { keys: ['⌘⇧Z'], description: 'Redo' },
      { keys: ['@'], description: 'Mention a record' },
      { keys: ['/'], description: 'Insert block (heading, code, table)' },
    ],
  },
  {
    title: 'General',
    items: [
      { keys: ['⌘⇧E'], description: 'Focus mode (editor only)' },
      { keys: ['⌘S'], description: 'Save current document' },
      { keys: ['Esc'], description: 'Cancel / close picker' },
    ],
  },
];

export default function ShortcutsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Keyboard Shortcuts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Press <Kbd>?</Kbd> anywhere in the app to open this guide. These shortcuts help you navigate and edit faster.
        </p>
      </div>

      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {group.items.map((item) => (
                <div
                  key={item.description}
                  className="flex items-center justify-between px-6 py-3 text-sm"
                >
                  <span>{item.description}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground text-xs">or</span>}
                        <Kbd>{key}</Kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Pro tip</p>
        <p>
          Type <Kbd>/</Kbd> in the markdown editor to insert headings, code blocks, tables, and more.
          Type <Kbd>@</Kbd> to search and link projects, clients, or notes.
        </p>
      </div>
    </div>
  );
}
