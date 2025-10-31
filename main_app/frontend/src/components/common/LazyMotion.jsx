import dynamic from 'next/dynamic';

// Lazy load Framer Motion
export const motion = dynamic(
  () => import('framer-motion').then(mod => mod.motion),
  { ssr: false }
);

export const AnimatePresence = dynamic(
  () => import('framer-motion').then(mod => mod.AnimatePresence),
  { ssr: false }
);

export const useAnimation = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.useAnimation })),
  { ssr: false }
);

export const useInView = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.useInView })),
  { ssr: false }
);

// Animation presets
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const slideIn = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 },
  transition: { duration: 0.3 }
};

export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { duration: 0.2 }
};
