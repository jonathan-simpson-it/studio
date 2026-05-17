'use client';

import dynamic from 'next/dynamic';
import '@uiw/react-markdown-preview/markdown.css';

const Preview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false });

interface MarkdownPreviewProps {
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MarkdownPreview({ value, className, style }: MarkdownPreviewProps) {
  return (
    <div data-color-mode="dark" className={className} style={style}>
      <Preview source={value} />
    </div>
  );
}
