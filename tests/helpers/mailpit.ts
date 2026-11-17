/**
 * Mailpit helper for integration tests that send email.
 *
 *   const mail = useMailpit();
 *   const mailer = createMailer({ ...mail.smtp, from: "test@app.local" });
 *   await mailer.send({ to: "a@b.test", subject: "Hi", text: "..." });
 *   expect(await mail.messages()).toContainEqual(expect.objectContaining({ Subject: "Hi" }));
 *
 * The inbox is emptied before each test.
 */
import { beforeEach, inject } from "vitest";

export interface MailpitMessage {
  ID: string;
  Subject: string;
  From: { Address: string; Name: string };
  To: { Address: string; Name: string }[];
  Snippet: string;
}

export function useMailpit() {
  const { smtpHost, smtpPort, apiUrl } = inject("mailpit");

  async function clear() {
    const res = await fetch(`${apiUrl}/messages`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Mailpit: clearing inbox failed (${res.status})`);
  }

  async function messages(): Promise<MailpitMessage[]> {
    const res = await fetch(`${apiUrl}/messages`);
    if (!res.ok) throw new Error(`Mailpit: listing messages failed (${res.status})`);
    return (await res.json()).messages;
  }

  /** Full plain-text body of one message. */
  async function text(id: string): Promise<string> {
    const res = await fetch(`${apiUrl}/message/${id}`);
    if (!res.ok) throw new Error(`Mailpit: reading message failed (${res.status})`);
    return (await res.json()).Text;
  }

  beforeEach(clear);

  return { smtp: { host: smtpHost, port: smtpPort }, messages, text, clear };
}
