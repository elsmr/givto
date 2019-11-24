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
  text: string;
  from?: Contact;
  to: Contact;
}

export class Mailer {
  constructor(private options: MailerOptions) {}

  sendMail({ from, to, subject, text }: SendMailOptions): Promise<boolean> {
    const headers = new Headers();
    const formData = new FormData();
    const { name, email } = from || this.options.from;
    formData.append('from', `${name} <${email}>`);
    formData.append('to', `${to.name} <${to.email}>`);
    formData.append('subject', subject);
    formData.append('text', text);
    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`api:${this.options.apiKey}`).toString('base64')}`
    );
    return fetch(`${this.options.baseUrl}/messages`, {
      headers,
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(console.log)
      .then(Boolean);
  }
}
