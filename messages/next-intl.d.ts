import type errors from './en/errors.json';
import type home from './en/home.json';
import type seo from './en/seo.json';
import type shell from './en/shell.json';
import type ui from './en/ui.json';

// One entry per namespace file in messages/en/; nl must have the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Messages: {
      errors: typeof errors;
      home: typeof home;
      seo: typeof seo;
      shell: typeof shell;
      ui: typeof ui;
    };
  }
}
