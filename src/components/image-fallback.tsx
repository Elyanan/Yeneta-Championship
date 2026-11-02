"use client";
import Image from "next/image";
import { useState, type ReactNode } from "react";
export function ImageWithFallback({
  src,
  alt,
  size,
  priority = false,
  contain = false,
  fallback,
}: {
  src: string;
  alt: string;
  size: number;
  priority?: boolean;
  contain?: boolean;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    fallback
  ) : (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      onError={() => setFailed(true)}
      style={{
        objectFit: contain ? "contain" : "cover",
        width: size,
        height: size,
      }}
    />
  );
}
