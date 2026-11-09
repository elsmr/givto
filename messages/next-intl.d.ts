import type account from './en/account.json';
import type auth from './en/auth.json';
import type between from './en/between.json';
import type dashboard from './en/dashboard.json';
import type create from './en/create.json';
import type email from './en/email.json';
import type errors from './en/errors.json';
import type home from './en/home.json';
import type privacy from './en/privacy.json';
import type seo from './en/seo.json';
import type group from './en/group.json';
import type join from './en/join.json';
import type shell from './en/shell.json';
import type ui from './en/ui.json';
import type unsubscribe from './en/unsubscribe.json';
import type wishlist from './en/wishlist.json';

// One entry per namespace file in messages/en/; nl must have the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Messages: {
      account: typeof account;
      auth: typeof auth;
      between: typeof between;
      dashboard: typeof dashboard;
      create: typeof create;
      email: typeof email;
      errors: typeof errors;
      home: typeof home;
      privacy: typeof privacy;
      seo: typeof seo;
      group: typeof group;
      join: typeof join;
      shell: typeof shell;
      ui: typeof ui;
      unsubscribe: typeof unsubscribe;
      wishlist: typeof wishlist;
    };
  }
}
