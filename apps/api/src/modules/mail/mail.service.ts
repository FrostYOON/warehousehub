import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getModuleLogger } from '../../common/logging/module-logger';

const logger = getModuleLogger('MailService');

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class MailService {
  private transporter: Transporter | null = null;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.initTransporter();
  }

  private initTransporter(): void {
    if (this.isProduction) {
      const host = this.config.get<string>('SMTP_HOST');
      const port = this.config.get<number>('SMTP_PORT', 587);
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        logger.info({ event: 'mail.transporter_ready', host, port });
      } else {
        logger.warn({
          event: 'mail.transporter_missing_config',
          message:
            'SMTP_HOST, SMTP_USER, SMTP_PASS required for production email',
        });
      }
    }
  }

  async send(options: SendMailOptions): Promise<boolean> {
    const from = this.config.get<string>(
      'MAIL_FROM',
      'noreply@warehousehub.local',
    );

    if (!this.isProduction || !this.transporter) {
      logger.info({
        event: 'mail.log_only',
        to: options.to,
        subject: options.subject,
        text: options.text?.substring(0, 100),
      });
      if (options.text) {
        console.log(
          `[DEV] Mail to ${options.to}: ${options.subject}\n${options.text}`,
        );
      }
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      logger.info({
        event: 'mail.sent',
        to: options.to,
        subject: options.subject,
      });
      return true;
    } catch (err) {
      logger.error({
        event: 'mail.send_failed',
        to: options.to,
        subject: options.subject,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
}
