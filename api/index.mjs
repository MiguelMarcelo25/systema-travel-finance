import { handleApi } from '../src/api.mjs';
import { openPostgres } from '../src/postgres.mjs';

let database;
export default {
  async fetch(request) {
    if (!process.env.DATABASE_URL || !process.env.SYSTEMA_ADMIN_EMAIL) {
      return Response.json({ error: 'Systema deployment configuration is incomplete.' }, { status: 503 });
    }
    database ??= openPostgres(process.env.DATABASE_URL, { ca: process.env.DATABASE_CA });
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    if (endpoint) {
      url.pathname = '/api/' + endpoint;
      url.searchParams.delete('endpoint');
      request = new Request(url, { method: request.method, headers: request.headers,
        ...(!['GET', 'HEAD'].includes(request.method) ? { body: request.body, duplex: 'half' } : {}) });
    }
    return handleApi(request, { DB: database, ADMIN_EMAIL: process.env.SYSTEMA_ADMIN_EMAIL });
  }
};
