import Image from 'next/image';

/** An imported wish image, served by us (/api/wish-images) and resized by next/image. */
export const WishImage = ({ imageId, alt, size = 72 }: { imageId: string; alt: string; size?: number }) => (
  <Image
    src={`/api/wish-images/${imageId}`}
    alt={alt}
    width={size}
    height={size}
    className="shrink-0 border-2 border-ink bg-surface object-contain"
    style={{ width: size, height: size }}
  />
);
