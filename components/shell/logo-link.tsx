import { GivtoLogo } from '@/components/givto-logo';
import Link from 'next/link';

export const LogoLink = ({ href }: { href: string }) => (
  <Link
    href={href}
    className="mr-auto flex items-center gap-2 text-ink no-underline"
  >
    <GivtoLogo aria-hidden="true" className="size-9 -rotate-6" />
    <span className="font-heading text-2xl font-extrabold">Givto</span>
  </Link>
);
