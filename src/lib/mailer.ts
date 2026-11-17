import "server-only";
import nodemailer from "nodemailer";
import { getEnv } from "./env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailerConfig {
  host: string;
  port: number;
  from: string;
}

/** Build a mailer for an SMTP server. Tests pass the Testcontainers Mailpit host/port. */
export function createMailer(config: MailerConfig) {
  const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: false });
  return {
    send: (message: MailMessage) => transport.sendMail({ from: config.from, ...message }),
  };
}

/** Sends email using the app's SMTP settings. In dev/CI this is Mailpit; see http://localhost:8025. */
export async function sendMail(message: MailMessage) {
  const env = getEnv();
  await createMailer({ host: env.SMTP_HOST, port: env.SMTP_PORT, from: env.MAIL_FROM }).send(message);
}
