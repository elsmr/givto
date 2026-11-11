import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import Link from 'next/link';

export const LogoLink = ({ href }: { href: string }) => (
  <Link
    href={href}
    prefetch={false}
    className="mr-auto flex min-h-11 items-center gap-2 text-ink no-underline"
  >
    <LogoAnimation variant="hover" className="size-9 -rotate-6" />
    <span className="font-heading text-2xl font-extrabold">Givto</span>
  </Link>
);
