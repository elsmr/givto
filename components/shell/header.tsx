import { GivtoLogo } from '@/components/givto-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  signOut,
  useCurrentUser,
  type CurrentUser,
} from '@/lib/client/session';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';

export const AccountMenu = ({ user }: { user: CurrentUser }) => {
  const t = useTranslations('shell');
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('account-menu', { name: user.name })}
        render={<Button variant="neutral" className="gap-2 px-1.5 sm:px-2" />}
      >
        <Avatar size="sm" className="border-0">
          <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLinkItem render={<Link href="/groups" />}>
          {t('my-secret-santas')}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/account" />}>
          {t('account')}
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            await router.push('/');
          }}
        >
          {t('sign-out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Header = () => {
  const t = useTranslations('shell');
  const user = useCurrentUser();

  return (
    <header className="border-b-(length:--border-width) border-ink bg-surface">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={user ? '/groups' : '/'}
          className="mr-auto flex items-center gap-2 text-ink no-underline"
        >
          <GivtoLogo aria-hidden="true" className="size-9 -rotate-6" />
          <span className="font-heading text-2xl font-extrabold">Givto</span>
        </Link>
        <nav
          aria-label={t('main-navigation')}
          className="flex items-center gap-4"
        >
          {user ? (
            <>
              <Link
                href="/groups"
                className="hidden font-semibold text-ink xs:inline"
              >
                {t('my-secret-santas')}
              </Link>
              <AccountMenu user={user} />
            </>
          ) : (
            <Button nativeButton={false} render={<Link href="/auth/sign-in" />}>
              {t('sign-in')}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
