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
    const formData = new FormData();
    const { name, email } = { ...from, ...this.options.from };
    formData.append('from', `${name} <${email}>`);
    formData.append('to', `${to.name} <${to.email}>`);
    formData.append('subject', subject);
    if (text) {
      formData.append('text', text);
    } else if (template) {
      formData.append('template', template);
      if (variables) {
        formData.append('h:X-Mailgun-Variables', JSON.stringify(variables));
      }
    }

    return fetch(`${this.options.baseUrl}/messages`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.options.apiKey}`).toString('base64')}`,
      },
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }
}
