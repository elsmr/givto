import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

// Animation features load after the page; use `m` from 'motion/react-m', never `motion`.
const loadFeatures = () =>
  import('./motion-features').then((module) => module.default);

export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
