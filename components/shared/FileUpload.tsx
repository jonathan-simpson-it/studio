'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Visibility } from '@/types';

interface FileUploadProps {
  clientId?: string;
  projectId?: string;
  visibility?: Visibility;
  onUploadComplete?: (file: { name: string; storagePath: string; url: string }) => void;
}

export function FileUpload({
  clientId,
  projectId,
  visibility = 'internal',
  onUploadComplete,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<Array<{ name: string; path: string; url: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (clientId) formData.append('clientId', clientId);
    if (projectId) formData.append('projectId', projectId);
    formData.append('visibility', visibility);

    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();

      toast.success('File uploaded');
      setFiles((prev) => [...prev, { name: data.name, path: data.storagePath, url: data.url }]);
      onUploadComplete?.({ name: data.name, storagePath: data.storagePath, url: data.url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(path: string) {
    try {
      const res = await fetch(`/api/files/delete?id=${path}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }

      setFiles((prev) => prev.filter((f) => f.path !== path));
      toast.success('File deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {uploading ? 'Uploading…' : 'Upload file'}
      </Button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {visibility}
                </Badge>
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Download
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(file.path)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
