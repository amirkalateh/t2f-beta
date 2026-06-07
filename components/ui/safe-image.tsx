"use client";

interface SafeImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onError?: React.ReactEventHandler<HTMLImageElement>;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  objectFit?: string;
  [key: string]: any;
}

export default function SafeImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  style,
  onError,
  onLoad,
  priority,
  sizes,
  quality,
  placeholder,
  blurDataURL,
  objectFit,
  ...rest
}: SafeImageProps) {
  const imgStyle: React.CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: (objectFit as any) || (style as any)?.objectFit || "cover",
        ...style,
      }
    : { ...style };

  return (
    <img
      src={src || ""}
      alt={alt || ""}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={imgStyle}
      onError={onError}
      onLoad={onLoad}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
