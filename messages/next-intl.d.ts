import type shell from './en/shell.json';
import type ui from './en/ui.json';

// One entry per namespace file in messages/en/; nl must have the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Messages: {
      shell: typeof shell;
      ui: typeof ui;
    };
  }
}
