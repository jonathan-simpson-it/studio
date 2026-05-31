import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import { CommandMenu, getSlashCommandItems } from '@/components/extensions/CommandMenu';
import type { CommandItem } from '@/components/extensions/CommandMenu';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      char: '/',
      pluginKey: new PluginKey('slashCommand'),
      allowedPrefixes: ['\n', ' '],
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      Suggestion({
        editor: extension.editor,
        char: '/',
        pluginKey: new PluginKey('slashCommand'),
        allowedPrefixes: extension.options.allowedPrefixes,
        command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
          const charBefore = editor.state.doc.textBetween(
            Math.max(0, range.from - 1),
            range.from,
          );
          const deleteFrom = charBefore === ' ' ? range.from - 1 : range.from;
          editor
            .chain()
            .focus()
            .deleteRange({ from: deleteFrom, to: range.to })
            .run();
          props.command({ editor });
        },
        allow: ({ editor, range }: { editor: any; range: any }) => {
          if (range.from === 0) return true;
          const $pos = editor.state.doc.resolve(range.from);
          const parentStart = $pos.before($pos.depth);
          const offsetFromParentStart = range.from - parentStart;
          return offsetFromParentStart <= 1;
        },
        items: ({ query }: { query: string }) => {
          const items = getSlashCommandItems();
          return items.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase()),
          );
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
              component = new ReactRenderer(CommandMenu, {
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
      }),
    ];
  },
});
