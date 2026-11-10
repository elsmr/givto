import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import * as m from 'motion/react-m';

/**
 * Waiting for the presenter view: the intro's logo size, and only after a moment, so a quick load
 * (from the group page) doesn't flash it. Fades out while the first slide fades in.
 */
export const PresenterLoading = () => (
  <m.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, transition: { delay: 0.4, duration: 0.3 } }}
    exit={{ opacity: 0, transition: { duration: 0.3 } }}
    className="flex items-center justify-center"
  >
    <LogoAnimation variant="loading" className="size-32 sm:size-44" />
  </m.div>
);
