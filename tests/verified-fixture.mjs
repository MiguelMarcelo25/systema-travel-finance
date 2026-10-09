import { handleApi as realApi } from '../src/api.mjs';

// Financial/document tests use preverified fixture identities. Account-security
// tests import the real API directly and exercise verification without this helper.
export async function handleApi(request, env) {
  const response = await realApi(request, env);
  if (response.ok && request.method === 'POST' && ['/api/setup','/api/login','/api/register','/api/users'].includes(new URL(request.url).pathname)) {
    await env.DB.prepare('UPDATE users SET email_verified_at=? WHERE email_verified_at IS NULL').bind('2026-01-01T00:00:00.000Z').run();
  }
  return response;
}
