// Intersection Observer Hook for Lazy Loading
import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver(options = {}) {
  const ref = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasIntersected, options]);

  return { ref, isIntersecting, hasIntersected };
}

// Lazy Load Component Wrapper
export function LazyLoad({ children, height = 200, once = true }) {
  const { ref, hasIntersected } = useIntersectionObserver();

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {(once ? hasIntersected : true) && children}
    </div>
  );
}

// Image Lazy Loading Hook
export function useLazyImage(src) {
  const [imageSrc, setImageSrc] = useState(null);
  const { ref, hasIntersected } = useIntersectionObserver();

  useEffect(() => {
    if (hasIntersected && src) {
      const img = new Image();
      img.src = src;
      img.onload = () => setImageSrc(src);
    }
  }, [hasIntersected, src]);

  return { ref, imageSrc };
}
