import nodemailer from 'nodemailer';
import { remoteMail } from './mail.mjs';

// SMTP is available only in the Node server and Vercel Function, not the Worker.
export function nodeMail(env) {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return remoteMail(env);
  const sender = env.GMAIL_USER.trim();
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: sender, pass: env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true
  });
  return { async send(message) {
    try {
      const result = await transport.sendMail({
        from: { name: 'Systema', address: sender }, to: message.to,
        subject: message.subject, text: message.text
      });
      if (!result.accepted?.length || result.rejected?.length) throw new Error('Rejected');
    } catch {
      // Provider errors may include account details; keep them out of API/logs.
      throw new Error('Email provider rejected delivery.');
    }
  } };
}
