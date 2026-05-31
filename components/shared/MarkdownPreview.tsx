'use client';

import { useMemo } from 'react';

interface MarkdownPreviewProps {
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MarkdownPreview({ value, className, style }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(value), [value]);

  return (
    <div
      className={className}
      style={style}
    >
      <div
        className="transition-all duration-150"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return (
    text
      // Images (before links)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded" />')
      // @mention links: [Type: Name](/path)
      .replace(
        /\[([A-Z][a-z]+):\s([^\]]+)\]\(\/([^)]+)\)/g,
        '<a href="/$3" class="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground no-underline hover:bg-accent/80">$1: $2</a>'
      )
      // [[wiki-links]]
      .replace(
        /\[\[([^\]]+)\]\]/g,
        '<a href="/notes?q=$1" class="text-primary underline decoration-primary/30 hover:decoration-primary">$1</a>'
      )
      // Standard markdown links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline decoration-primary/30 hover:decoration-primary">$1</a>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs font-mono text-foreground">$1</code>')
  );
}

function highlightCode(code: string, lang: string): string {
  return code
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('\n');
}

function splitTableRow(row: string): string[] {
  return row
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function parseTableAlignment(sepLine: string): string[] {
  return sepLine
    .split('|')
    .slice(1, -1)
    .map((part) => {
      const trimmed = part.trim();
      if (/^:-+:$/.test(trimmed)) return 'center';
      if (/^-+:$/.test(trimmed)) return 'right';
      return 'left';
    });
}

function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (/^\s*$/.test(line)) {
      i++;
      // Close any open code block
      continue;
    }

    // Fenced code block
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      const lang = fenceMatch[1];
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const code = codeLines.join('\n');
      blocks.push(
        `<pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm leading-relaxed"><code class="font-mono">${highlightCode(code, lang)}</code></pre>`
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push('<hr class="my-4 border-muted-foreground/20" />');
      i++;
      continue;
    }

    // GFM Table
    if (/^\|.+\|$/.test(line) && i + 1 < lines.length && /^\|[-: |]+\|$/.test(lines[i + 1])) {
      const headerCells = splitTableRow(line);
      const alignLine = lines[i + 1];
      const alignments = parseTableAlignment(alignLine);
      i += 2;
      const bodyRows: string[][] = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i])) {
        bodyRows.push(splitTableRow(lines[i]));
        i++;
      }
      let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full border-collapse text-sm">';
      tableHtml += '<thead><tr>';
      headerCells.forEach((cell, colIdx) => {
        const align = alignments[colIdx] || 'left';
        tableHtml += `<th class="border border-border px-3 py-2 bg-muted/50 font-semibold text-left" style="text-align:${align}">${renderInline(cell.trim())}</th>`;
      });
      tableHtml += '</tr></thead>';
      if (bodyRows.length > 0) {
        tableHtml += '<tbody>';
        bodyRows.forEach((row) => {
          tableHtml += '<tr>';
          row.forEach((cell, colIdx) => {
            const align = alignments[colIdx] || 'left';
            tableHtml += `<td class="border border-border px-3 py-2" style="text-align:${align}">${renderInline(cell.trim())}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody>';
      }
      tableHtml += '</table></div>';
      blocks.push(tableHtml);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      blocks.push(
        `<h${level} id="${id}" class="font-semibold text-foreground ${
          level === 1 ? 'text-2xl mt-8 mb-4' : level === 2 ? 'text-xl mt-6 mb-3' : level === 3 ? 'text-lg mt-5 mb-2' : 'text-base mt-4 mb-2'
        }">${renderInline(text)}</h${level}>`
      );
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        `<blockquote class="border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground my-4">${renderInline(quoteLines.join('\n'))}</blockquote>`
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^[-*+]\s/, '')));
        i++;
      }
      blocks.push(
        `<ul class="list-disc pl-6 my-2 space-y-1">${items.map((item) => `<li>${item}</li>`).join('')}</ul>`
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^\d+\.\s/, '')));
        i++;
      }
      blocks.push(
        `<ol class="list-decimal pl-6 my-2 space-y-1">${items.map((item) => `<li>${item}</li>`).join('')}</ol>`
      );
      continue;
    }

    // Task list
    if (/^\s*- \[[ x]\]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*- \[[ x]\]\s/.test(lines[i])) {
        const checked = /^\s*- \[x\]\s/i.test(lines[i]);
        const text = renderInline(lines[i].replace(/^\s*- \[[ x]\]\s/i, ''));
        items.push(
          `<li class="flex items-center gap-2"><input type="checkbox" ${checked ? 'checked' : ''} disabled class="rounded border-muted-foreground/30" /> <span class="${checked ? 'line-through text-muted-foreground' : ''}">${text}</span></li>`
        );
        i++;
      }
      blocks.push(`<ul class="list-none pl-1 my-2 space-y-1">${items.join('')}</ul>`);
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^[#->*`\d]/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(`<p class="my-2 leading-relaxed">${renderInline(paraLines.join('<br />'))}</p>`);
    } else if (!/^\s*$/.test(line)) {
      // Single line that doesn't match any block pattern — treat as paragraph
      blocks.push(`<p class="my-2 leading-relaxed">${renderInline(line)}</p>`);
      i++;
    }
  }

  return blocks.join('\n');
}
