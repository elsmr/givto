import type account from './en/account.json';
import type auth from './en/auth.json';
import type dashboard from './en/dashboard.json';
import type errors from './en/errors.json';
import type home from './en/home.json';
import type privacy from './en/privacy.json';
import type seo from './en/seo.json';
import type shell from './en/shell.json';
import type ui from './en/ui.json';

// One entry per namespace file in messages/en/; nl must have the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Messages: {
      account: typeof account;
      auth: typeof auth;
      dashboard: typeof dashboard;
      errors: typeof errors;
      home: typeof home;
      privacy: typeof privacy;
      seo: typeof seo;
      shell: typeof shell;
      ui: typeof ui;
    };
  }
}
