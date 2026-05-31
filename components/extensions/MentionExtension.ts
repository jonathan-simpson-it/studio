import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import { MentionList } from '@/components/extensions/MentionList';
import { searchEntities } from '@/lib/db/actions/search';
import type { SearchEntityResult } from '@/lib/db/actions/search';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

let searchCache: { query: string; results: Array<{ id: string; label: string; type: string }> } = { query: '', results: [] };

async function fetchMentionItems(query: string) {
  if (query === searchCache.query) return searchCache.results;
  try {
    const data = await searchEntities(query);
    const results: Array<{ id: string; label: string; type: string }> = [];
    for (const entity of data.projects) {
      results.push({ id: entity.path, label: entity.name, type: 'projects' });
    }
    for (const entity of data.clients) {
      results.push({ id: entity.path, label: entity.name, type: 'clients' });
    }
    for (const entity of data.notes) {
      results.push({ id: entity.path, label: entity.title, type: 'notes' });
    }
    searchCache = { query, results };
    return results;
  } catch {
    return [];
  }
}

export const MentionExtension = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: { default: null },
      type: { default: 'note' },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        class: 'inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground no-underline cursor-pointer',
        'data-type': 'mention',
        'data-id': node.attrs.id,
        'data-href': node.attrs.href,
      },
      `${this.options.renderLabel?.({ node, options: this.options as any, suggestion: null }) ?? node.attrs.label}`,
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const typeLabel =
            node.attrs.type === 'projects' ? 'Project' :
            node.attrs.type === 'clients' ? 'Client' : 'Note';
          state.write(`[${typeLabel}: ${node.attrs.label}](${node.attrs.href})`);
        },
        parse: {
          setup(markdownit: any) {
            markdownit.inline.ruler.before('link', 'mention', (state: any, silent: boolean) => {
              const match = state.src.slice(state.pos).match(/^\[([A-Z][a-z]+):\s([^\]]+)\]\((\/[^)]+)\)/);
              if (!match) return false;
              if (silent) return true;
              const token = state.push('mention_inline', '', 0);
              token.meta = { type: match[1].toLowerCase() + 's', label: match[2], href: match[3] };
              state.pos += match[0].length;
              return true;
            });
          },
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('span[data-type="mention"]').forEach((el) => {
              el.className = 'inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground no-underline';
            });
          },
        },
      },
    };
  },
}).configure({
  HTMLAttributes: {
    class: 'mention',
  },
  renderLabel({ node }: { node: import('prosemirror-model').Node }) {
    const typeLabel =
      node.attrs.type === 'projects' ? 'Project' :
      node.attrs.type === 'clients' ? 'Client' : 'Note';
    return `${typeLabel}: ${node.attrs.label}`;
  },
  suggestion: {
    char: '@',
    pluginKey: new PluginKey('mention'),
    allow: ({ editor, range }) => {
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, range.from - 2),
        range.from,
      );
      return /^\s$|^$/.test(textBefore);
    },
    items: async ({ query }: { query: string }) => {
      return fetchMentionItems(query);
    },
    command: ({ editor, range, props: rawProps }) => {
      const props = rawProps as any;
      const nodeAfter = editor.state.selection.$anchor.nodeAfter;
      const overrideSpace = nodeAfter?.text?.startsWith(' ');
      if (overrideSpace) {
        editor.chain().focus().deleteRange({ from: range.from - 1, to: range.to }).run();
      }
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: 'mention',
            attrs: {
              id: props.id,
              label: props.label,
              href: `/${props.id}`,
              type: props.type,
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run();
      editor.commands.focus();
    },
    render: () => {
      let component: ReactRenderer<{ onKeyDown: (props: SuggestionKeyDownProps) => boolean }>;
      let popupEl: HTMLDivElement | null = null;

      function updatePosition(props: SuggestionProps) {
        if (!popupEl || !props.clientRect) return;
        const rect = props.clientRect();
        if (!rect) return;
        popupEl.style.left = `${rect.left}px`;
        popupEl.style.top = `${rect.bottom + 4}px`;
      }

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props: {
              items: props.items,
              command: props.command,
            },
            editor: props.editor,
          });

          popupEl = document.createElement('div');
          popupEl.style.position = 'fixed';
          popupEl.style.zIndex = '50';
          document.body.appendChild(popupEl);
          popupEl.appendChild(component.element);

          updatePosition(props);
        },
        onUpdate(props: SuggestionProps) {
          component.updateProps({
            items: props.items,
            command: props.command,
          });
          updatePosition(props);
        },
        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            return true;
          }
          return component.ref?.onKeyDown(props) ?? false;
        },
        onExit() {
          popupEl?.remove();
          popupEl = null;
          component?.destroy();
        },
      };
    },
  },
});
