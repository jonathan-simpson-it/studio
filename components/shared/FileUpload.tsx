'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';
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
  const supabase = createClient();
  const { data: session } = useSession();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    if (!session?.user?.id) {
      toast.error('Not authenticated');
      setUploading(false);
      return;
    }

    const entityType = clientId ? 'clients' : 'projects';
    const entityId = clientId || projectId;
    const timestamp = Date.now();
    const storagePath = `${entityType}/${entityId}/${timestamp}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('studio-files')
      .upload(storagePath, file);

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: signedUrlData } = await supabase.storage
      .from('studio-files')
      .createSignedUrl(storagePath, 3600);

    const { error: dbError } = await supabase.from('files').insert({
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      visibility,
      client_id: clientId || null,
      project_id: projectId || null,
      uploaded_by: session.user.id,
    });

    if (dbError) {
      toast.error(dbError.message);
      setUploading(false);
      return;
    }

    const signedUrl = signedUrlData?.signedUrl || '';

    toast.success('File uploaded');
      setFiles((prev) => [...prev, { name: file.name, path: storagePath, url: signedUrl || '' }]);
      onUploadComplete?.({ name: file.name, storagePath, url: signedUrl || '' });
      setUploading(false);
  }

  async function handleDelete(path: string) {
    const { error } = await supabase.storage.from('studio-files').remove([path]);
    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase.from('files').delete().eq('storage_path', path);
    setFiles((prev) => prev.filter((f) => f.path !== path));
    toast.success('File deleted');
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
