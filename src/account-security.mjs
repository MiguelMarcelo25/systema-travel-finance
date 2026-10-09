const encoder = new TextEncoder();
export async function tokenDigest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export function accountSecurity(env) {
  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
  async function limit(scope, identity, maximum = 5) {
    const key = await tokenDigest(scope + ':' + identity), time = Date.now(), start = time - 900000;
    await q('INSERT INTO auth_attempts(key,attempts,started) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.started<? THEN 1 ELSE auth_attempts.attempts+1 END,started=CASE WHEN auth_attempts.started<? THEN ? ELSE auth_attempts.started END', key, time, start, start, time).run();
    if ((await q('SELECT attempts FROM auth_attempts WHERE key=?', key).first()).attempts > maximum) fail('Too many requests. Try again in 15 minutes.', 429);
  }
  async function issue(account, purpose) {
    if (!env.MAIL || !env.APP_URL) fail('Email delivery is unavailable. Please contact the administrator.', 503);
    const raw = crypto.randomUUID() + crypto.randomUUID(), hash = await tokenDigest(raw);
    const minutes = purpose === 'reset' ? 30 : 1440;
    const url = new URL(purpose === 'reset' ? '/reset-password' : '/verify-email', env.APP_URL);
    // Fragment tokens do not enter HTTP access logs or referrer headers.
    url.hash = new URLSearchParams({ token: raw }).toString();
    await env.DB.batch([
      q('DELETE FROM account_tokens WHERE user_id=? AND purpose=?', account.id, purpose),
      q('DELETE FROM account_tokens WHERE expires<?', Date.now()),
      q('INSERT INTO account_tokens(token_hash,user_id,purpose,email,expires) VALUES(?,?,?,?,?)', hash, account.id, purpose, account.email, Date.now() + minutes * 60000)
    ]);
    try {
      await env.MAIL.send({ to: account.email, subject: purpose === 'reset' ? 'Reset your Systema password' : 'Verify your Systema email', text: `${purpose === 'reset' ? 'Choose a new password' : 'Confirm your email address'} using this link:\n\n${url}\n\nThis link expires in ${purpose === 'reset' ? '30 minutes' : '24 hours'} and can be used once. If you did not request it, you can ignore this email.` });
    } catch {
      await q('DELETE FROM account_tokens WHERE token_hash=?', hash).run();
      fail('Email could not be sent. Please try again later.', 503);
    }
  }
  async function find(raw, purpose) {
    if (typeof raw !== 'string' || raw.length > 200 || raw.length < 32) fail('This link is invalid or expired. Request a new one.');
    const hash = await tokenDigest(raw);
    const token = await q('SELECT t.* FROM account_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.purpose=? AND t.expires>? AND t.email=u.email AND u.active=1', hash, purpose, Date.now()).first();
    if (!token) fail('This link is invalid or expired. Request a new one.');
    return token;
  }
  return { limit, issue, find };
}
