import { Inject, Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import nodemailer, { type Transporter } from 'nodemailer';
import { ENV, type Env } from '@/config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Abstraction e-mail : console (dev/test), SMTP (nodemailer), Resend (API HTTP).
 * Les e-mails sont rendus ici en texte simple + HTML minimal ; les gabarits riches viendront avec le design.
 */
@Injectable()
export class MailService {
  private transporter: Transporter | null = null;
  /** Dernier message envoyé (utile pour les tests avec provider console). */
  public lastMessage: MailMessage | null = null;
  /** Boîte d'envoi mémoire (provider console uniquement, hors production) : 100 derniers messages. */
  public readonly outbox: (MailMessage & { sentAt: string })[] = [];

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly logger: Logger,
  ) {
    if (env.MAIL_PROVIDER === 'smtp') {
      if (!env.SMTP_URL) throw new Error('SMTP_URL requis avec MAIL_PROVIDER=smtp');
      this.transporter = nodemailer.createTransport(env.SMTP_URL);
    }
    if (env.MAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY requis avec MAIL_PROVIDER=resend');
    }
  }

  async send(message: MailMessage): Promise<void> {
    this.lastMessage = message;
    switch (this.env.MAIL_PROVIDER) {
      case 'console':
        if (this.env.NODE_ENV !== 'production') {
          this.outbox.push({ ...message, sentAt: new Date().toISOString() });
          if (this.outbox.length > 100) this.outbox.shift();
        }
        if (this.env.NODE_ENV !== 'test') {
          this.logger.log({ to: message.to, subject: message.subject, text: message.text }, '[mail:console]');
        }
        return;
      case 'smtp':
        await this.transporter!.sendMail({ from: this.env.MAIL_FROM, ...message });
        return;
      case 'resend': {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: this.env.MAIL_FROM, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
        });
        if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
        return;
      }
    }
  }

  // --- Gabarits ---
  verificationEmail(to: string, displayName: string, link: string): MailMessage {
    return {
      to,
      subject: `Confirmez votre adresse — ${this.env.APP_NAME}`,
      text: `Bonjour ${displayName},\n\nConfirmez votre adresse e-mail pour activer votre compte :\n${link}\n\nCe lien est valable 24 heures.\n\n${this.env.APP_NAME}`,
      html: this.wrap(`<p>Bonjour ${escapeHtml(displayName)},</p><p>Confirmez votre adresse e-mail pour activer votre compte.</p><p><a href="${link}" style="${BTN}">Confirmer mon adresse</a></p><p style="color:#6b6670;font-size:13px">Ce lien est valable 24 heures.</p>`),
    };
  }

  passwordResetEmail(to: string, link: string): MailMessage {
    return {
      to,
      subject: `Réinitialisation de votre mot de passe — ${this.env.APP_NAME}`,
      text: `Vous avez demandé à réinitialiser votre mot de passe :\n${link}\n\nCe lien est valable 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
      html: this.wrap(`<p>Vous avez demandé à réinitialiser votre mot de passe.</p><p><a href="${link}" style="${BTN}">Choisir un nouveau mot de passe</a></p><p style="color:#6b6670;font-size:13px">Ce lien est valable 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`),
    };
  }

  invitationEmail(to: string, inviterName: string, code: string, link: string): MailMessage {
    return {
      to,
      subject: `${inviterName} vous invite sur ${this.env.APP_NAME}`,
      text: `${inviterName} vous invite à rejoindre votre espace de couple sur ${this.env.APP_NAME}.\n\nVotre code : ${code}\nOu suivez ce lien : ${link}\n\nCe code est valable 72 heures.`,
      html: this.wrap(`<p>${escapeHtml(inviterName)} vous invite à rejoindre votre espace de couple.</p><p style="font-size:28px;letter-spacing:4px;font-weight:600">${code}</p><p><a href="${link}" style="${BTN}">Rejoindre</a></p><p style="color:#6b6670;font-size:13px">Ce code est valable 72 heures.</p>`),
    };
  }

  private wrap(inner: string): string {
    return `<!doctype html><html lang="fr"><body style="margin:0;background:#F8F3EC;font-family:Inter,Helvetica,Arial,sans-serif;color:#2B2A2E"><div style="max-width:520px;margin:32px auto;background:#fff;border-radius:24px;padding:32px;border:1px solid #EADFD3"><h1 style="font-size:20px;margin:0 0 16px;color:#4A2A4F">${escapeHtml(this.env.APP_NAME)}</h1>${inner}</div></body></html>`;
  }
}

const BTN = 'display:inline-block;background:#E0705A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600';
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
