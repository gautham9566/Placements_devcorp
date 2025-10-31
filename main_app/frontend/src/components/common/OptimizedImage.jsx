import Image from 'next/image';

/**
 * Optimized Image Component wrapper
 * Automatically handles lazy loading, sizing, and formats
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  quality = 75,
  ...props
}) {
  // Handle missing dimensions for fill images
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes={sizes || '100vw'}
        quality={quality}
        {...props}
      />
    );
  }

  // Handle external images or require dimensions
  const imageProps = {
    src,
    alt,
    className,
    priority,
    quality,
    loading: priority ? 'eager' : 'lazy',
    ...props,
  };

  if (width && height) {
    imageProps.width = width;
    imageProps.height = height;
  }

  return <Image {...imageProps} />;
}

/**
 * Avatar component with optimized loading
 */
export function Avatar({ src, alt, size = 40, className = '' }) {
  return (
    <OptimizedImage
      src={src || '/images/default-avatar.png'}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      quality={80}
    />
  );
}

/**
 * Logo component with optimized loading
 */
export function Logo({ src, alt, width = 120, height = 40, className = '', priority = true }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={90}
    />
  );
}
