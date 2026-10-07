import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
export function localDocumentStorage(directory = './data/documents') {
  const root = resolve(directory);
  const file = path => { if (!/^[A-Z0-9-]+\/[A-Z0-9-]+\.(pdf|jpg|png)$/.test(path)) throw new Error('Invalid document path.'); return resolve(root, path); };
  return {
    async upload(path, bytes) { const target = file(path); await mkdir(resolve(target, '..'), { recursive: true }); await writeFile(target, bytes, { flag: 'wx', mode: 0o600 }); },
    async download(path) { return new Blob([await readFile(file(path))]); },
    async remove(path) { await unlink(file(path)); }
  };
}
