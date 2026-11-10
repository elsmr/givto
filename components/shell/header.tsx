import { useCurrentUser } from '@/lib/client/session';
import { LogoLink } from './logo-link';
import { MainNav } from './main-nav';

export const Header = () => {
  const user = useCurrentUser();

  return (
    <header className="border-b-(length:--border-width) border-outline bg-surface">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <LogoLink href={user ? '/groups' : '/'} />
        <MainNav user={user} />
      </div>
    </header>
  );
};
