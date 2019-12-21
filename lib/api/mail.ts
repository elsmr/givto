import FormData from 'form-data';
import fetch, { Headers } from 'node-fetch';

interface Contact {
  name: string;
  email: string;
}

export interface MailerOptions {
  apiKey: string;
  baseUrl: string;
  from: Contact;
}

export interface SendMailOptions {
  subject: string;
  text?: string;
  from?: Partial<Contact>;
  to: Contact;
  variables?: Record<string, string>;
  template?: string;
}

export class Mailer {
  constructor(private options: MailerOptions) {}

  sendMail({
    from,
    to,
    subject,
    text,
    variables,
    template
  }: SendMailOptions): Promise<any> {
    const headers = new Headers();
    const formData = new FormData();
    const { name, email } = { ...from, ...this.options.from };
    formData.append('from', `${name} <${email}>`);
    formData.append('to', `${to.name} <${to.email}>`);
    formData.append('subject', subject);
    if (text) {
      formData.append('text', text);
    } else if (template) {
      formData.append('template', template);
      formData.append('t:version', 'initial');
      if (variables) {
        formData.append('h:X-Mailgun-Variables', JSON.stringify(variables));
      }
    }

    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`api:${this.options.apiKey}`).toString('base64')}`
    );
    return fetch(`${this.options.baseUrl}/messages`, {
      headers,
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }
}
