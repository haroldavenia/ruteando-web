/**
 * Envío de correo por SMTP (nodemailer) para los códigos del segundo factor. En desarrollo apunta a Mailpit (SMTP_HOST=localhost con el
 * puerto 1025 publicado). No registra el contenido de los mensajes: los códigos nunca van al log.
 *
 * Variables: SMTP_HOST (sin él, no hay correo), SMTP_PORT (587), SMTP_SECURE (true para TLS directo), SMTP_USER, SMTP_PASS, SMTP_FROM.
 */
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

const DEFAULT_FROM = 'Ruteando <no-responder@ruteando.local>';

export interface Mailer {
  available: boolean;
  send(message: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Mail.Attachment[];
  }): Promise<void>;
}

export function createMailer(env: Record<string, string | undefined> = process.env): Mailer {
  const host = (env.SMTP_HOST || '').trim();
  if (!host) return { available: false, send: () => Promise.reject(new Error('SMTP no configurado')) };

  const secure = String(env.SMTP_SECURE).toLowerCase() === 'true';
  const transport = nodemailer.createTransport({
    host,
    port: Number(env.SMTP_PORT) || 587,
    secure,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS || '' } : undefined,
    // Mailpit y los servidores de prueba no usan TLS; con TLS directo o credenciales sí se negocia
    ignoreTLS: !env.SMTP_USER && !secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  const from = env.SMTP_FROM || DEFAULT_FROM;

  return {
    available: true,
    /** Lanza si el SMTP lo rechaza; el mensaje del error no incluye el contenido. */
    async send({ to, subject, text, html, attachments }) {
      await transport.sendMail({ from, to, subject, text, html, attachments });
    },
  };
}
