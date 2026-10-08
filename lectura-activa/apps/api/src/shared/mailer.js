/**
 * Servicio de email.
 *
 * Modos:
 * - 'console': loguea el correo en consola (solo dev).
 * - 'resend':  envía el correo vía Resend API (prod).
 */

import { env } from '../config/env.js';
import { logger } from './logger.js';

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '[invalid]';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 ? local.slice(0, 2) + '***' : '***';
  const domainParts = domain.split('.');
  const maskedDomain =
    domainParts[0].length > 2 ? domainParts[0].slice(0, 2) + '***' : '***';
  const tld = domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomain}${tld ? '.' + tld : ''}`;
}

function buildConsoleMailer() {
  return {
    async send({ to, subject, html, text }) {
      logger.info(
        { mailer: 'console', to: maskEmail(to), subject },
        'Email (modo consola)'
      );
      console.log('\n' + '='.repeat(70));
      console.log(`EMAIL SIMULADO (${env.MAILER_MODE})`);
      console.log('='.repeat(70));
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('-'.repeat(70));
      console.log(text ?? html);
      console.log('='.repeat(70) + '\n');
      return { ok: true, mode: 'console' };
    },
  };
}

function buildResendMailer() {
  return {
    async send({ to, subject, html, text }) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      let response;
      try {
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.MAILER_FROM,
            to,
            subject,
            html,
            text,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === 'AbortError') {
          logger.error(
            { to: maskEmail(to) },
            'Timeout al enviar email con Resend (10s)'
          );
          throw new Error('Timeout al enviar el correo');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const body = await response.text();
        logger.error(
          { status: response.status, body },
          'Fallo al enviar email con Resend'
        );
        throw new Error('No se pudo enviar el correo');
      }

      const data = await response.json();
      logger.info(
        { to: maskEmail(to), subject, id: data.id },
        'Email enviado'
      );
      return { ok: true, mode: 'resend', id: data.id };
    },
  };
}

export function createMailer() {
  if (env.MAILER_MODE === 'resend') {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no configurado pero MAILER_MODE=resend');
    }
    return buildResendMailer();
  }
  return buildConsoleMailer();
}
