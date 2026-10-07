import { createClient } from '@supabase/supabase-js';
export const DOCUMENT_BUCKET = 'systema-client-documents';
export function supabaseDocumentStorage(url, key) {
  const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(DOCUMENT_BUCKET);
  return {
    async upload(path, bytes, contentType) { const { error } = await storage.upload(path, bytes, { contentType, upsert: false }); if (error) throw new Error('Document storage is unavailable. Please try again.'); },
    async download(path) { const { data, error } = await storage.download(path); if (error) throw new Error('Unable to retrieve this document. Please try again.'); return data; },
    async remove(path) { const { error } = await storage.remove([path]); if (error) throw new Error('Unable to remove an incomplete upload.'); }
  };
}
