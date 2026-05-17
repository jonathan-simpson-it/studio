function ensureId(obj: unknown): void {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) ensureId(item);
  } else {
    const record = obj as Record<string, unknown>;
    if (record._id && !record.id) record.id = record._id;
    for (const val of Object.values(record)) ensureId(val);
  }
}

export function toPlain<T>(doc: T): T {
  const result = JSON.parse(JSON.stringify(doc));
  ensureId(result);
  return result;
}
