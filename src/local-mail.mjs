import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export function localMail(directory = '.sites-runtime/mail') {
  return { async send(message) {
    await mkdir(directory, { recursive: true });
    const file = resolve(directory, `${Date.now()}-${crypto.randomUUID()}.txt`);
    await writeFile(file, `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`, { mode: 0o600 });
  } };
}
