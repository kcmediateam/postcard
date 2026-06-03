/* eslint-disable @next/next/no-img-element */
// Postcard art is data URLs (uploads) or SVGs (templates), so next/image's
// optimizer adds no value here — a plain <img> is the right tool.

export function PostcardImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`aspect-[3/2] w-full bg-zinc-50 object-contain ${className}`}
    />
  );
}
