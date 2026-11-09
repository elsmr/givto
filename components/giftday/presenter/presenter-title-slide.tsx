import { LogoAnimation } from '@/components/logo-animation/logo-animation';

/** Intro and end: a big title and a hint. */
export const PresenterTitleSlide = ({ title, hint }: { title: string; hint: string }) => (
  <>
    <LogoAnimation variant="celebrate" className="size-32 sm:size-44" />
    <h2 className="text-5xl font-extrabold sm:text-8xl">{title}</h2>
    <p className="text-xl text-muted sm:text-2xl">{hint}</p>
  </>
);
