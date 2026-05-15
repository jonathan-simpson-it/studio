import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { connect } from '@/lib/db/connect';
import { FileRecord } from '@/lib/db/models/docs';

export async function uploadToGridFS(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const conn = await connect();
  const db = conn.connection.db!;
  const bucket = new GridFSBucket(db, { bucketName: 'files' });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { contentType: mimeType },
    });
    uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

export async function deleteFromGridFS(fileId: string) {
  const conn = await connect();
  const db = conn.connection.db!;
  const bucket = new GridFSBucket(db, { bucketName: 'files' });
  return bucket.delete(new mongoose.Types.ObjectId(fileId));
}

export async function getFileStream(fileId: string) {
  const conn = await connect();
  const db = conn.connection.db!;
  const bucket = new GridFSBucket(db, { bucketName: 'files' });
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

export async function getFileInfo(fileId: string) {
  const conn = await connect();
  const db = conn.connection.db!;
  const bucket = new GridFSBucket(db, { bucketName: 'files' });
  const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
  return files[0] || null;
}

export async function getFilesForEntity(
  entityType: 'client' | 'project',
  entityId: string
) {
  await connect();
  const field = entityType === 'client' ? 'client_id' : 'project_id';
  return FileRecord.find({ [field]: entityId }).sort({ created_at: -1 }).lean();
}

export async function createFileRecord(data: {
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: string;
  client_id?: string;
  project_id?: string;
  uploaded_by: string;
}) {
  await connect();
  const record = await FileRecord.create(data);
  return record.toObject({ virtuals: true });
}

export async function deleteFileRecord(storagePath: string) {
  await connect();
  return FileRecord.deleteOne({ storage_path: storagePath });
}
