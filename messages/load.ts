import type { Messages } from 'next-intl';

type Namespace = keyof Messages;

// Every page gets the shared namespaces; pages add their own feature namespaces.
const sharedNamespaces: Namespace[] = ['shell', 'ui'];

export const loadMessages = async (
  locale: string | undefined,
  namespaces: Namespace[] = [],
): Promise<Partial<Messages>> =>
  Object.fromEntries(
    await Promise.all(
      [...new Set([...sharedNamespaces, ...namespaces])].map(
        async (namespace) => [
          namespace,
          (await import(`./${locale ?? 'en'}/${namespace}.json`)).default,
        ],
      ),
    ),
  );
