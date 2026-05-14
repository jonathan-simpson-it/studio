export function toPlain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}
