import { cn } from '@/lib/utils';
import Image from 'next/image';

/** An imported product image, served by us (/api/wish-images) and resized by next/image. `className` sets the box. */
export const WishImage = ({ imageId, alt, size, className }: { imageId: string; alt: string; size: number; className: string }) => (
  <Image
    src={`/api/wish-images/${imageId}`}
    alt={alt}
    width={size}
    height={size}
    // Product shots are made for white; the frame stays white in dark mode too.
    className={cn('shrink-0 border-2 border-outline bg-white object-contain p-1', className)}
  />
);
