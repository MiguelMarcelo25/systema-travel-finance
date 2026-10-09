// Provider-neutral interface. The API never returns secret links to the caller.
export function remoteMail({ RESEND_API_KEY, MAIL_FROM }) {
  if (!RESEND_API_KEY || !MAIL_FROM) return undefined;
  return { async send(message) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Email provider rejected delivery.');
  } };
}
