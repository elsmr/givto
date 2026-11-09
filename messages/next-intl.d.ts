import type create from './en/create.json';
import type errors from './en/errors.json';
import type group from './en/group.json';
import type join from './en/join.json';
import type shell from './en/shell.json';
import type ui from './en/ui.json';

// One entry per namespace file in messages/en/; nl must have the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Messages: {
      create: typeof create;
      errors: typeof errors;
      group: typeof group;
      join: typeof join;
      shell: typeof shell;
      ui: typeof ui;
    };
  }
}
