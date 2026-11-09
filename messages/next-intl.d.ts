import type errors from './en/errors.json';
import type shell from './en/shell.json';
import type ui from './en/ui.json';
import type wishlist from './en/wishlist.json';

// One entry per namespace file in messages/en/; nl must have the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Messages: {
      errors: typeof errors;
      shell: typeof shell;
      ui: typeof ui;
      wishlist: typeof wishlist;
    };
  }
}
