import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { nodeMail } from '../src/node-mail.mjs';

test('Gmail sends account links using the authenticated sender and TLS', async t => {
  let configuration, message;
  t.mock.method(nodemailer, 'createTransport', options => {
    configuration = options;
    return { async sendMail(value) { message = value; return { accepted: ['client@example.test'], rejected: [] }; } };
  });
  const provider = nodeMail({ GMAIL_USER: 'sender@gmail.com', GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop', MAIL_FROM: 'unrelated@example.test' });
  await provider.send({ to: 'client@example.test', subject: 'Verify your email', text: 'https://systema.example/verify-email#token=private' });
  assert.equal(configuration.host, 'smtp.gmail.com');
  assert.equal(configuration.secure, true);
  assert.equal(configuration.auth.pass, 'abcdefghijklmnop');
  assert.deepEqual(message.from, { name: 'Systema', address: 'sender@gmail.com' });
  assert.equal(message.to, 'client@example.test');
  assert.ok(message.text.includes('#token=private'));
  assert.equal(configuration.disableFileAccess, true);
  assert.equal(configuration.disableUrlAccess, true);
});

test('Gmail rejection and authentication errors do not expose provider details', async t => {
  let rejects = false;
  t.mock.method(nodemailer, 'createTransport', () => ({ async sendMail() {
    if (rejects) return { accepted: [], rejected: ['client@example.test'] };
    throw new Error('Invalid credentials for private@gmail.com');
  } }));
  const provider = nodeMail({ GMAIL_USER: 'sender@gmail.com', GMAIL_APP_PASSWORD: 'app-password' });
  await assert.rejects(provider.send({}), { message: 'Email provider rejected delivery.' });
  rejects = true;
  await assert.rejects(provider.send({}), { message: 'Email provider rejected delivery.' });
});

test('missing Gmail credentials leave the configured Resend provider available', () => {
  assert.equal(nodeMail({ GMAIL_USER: 'sender@gmail.com' }), undefined);
  assert.equal(typeof nodeMail({ RESEND_API_KEY: 'test-placeholder', MAIL_FROM: 'sender@example.test' }).send, 'function');
});
