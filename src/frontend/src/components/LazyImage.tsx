import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  wrapperClassName?: string;
  rootMargin?: string;
  loading?: "lazy" | "eager";
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

/**
 * LazyImage — only loads the real image when near the viewport.
 * Shows a rose shimmer placeholder until loaded, then fades in.
 * Pass loading="eager" for above-the-fold images to skip intersection wait.
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholderClassName,
  wrapperClassName,
  rootMargin = "200px",
  loading,
  style,
  width,
  height,
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(loading === "eager");
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (loading === "eager") return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, rootMargin]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", wrapperClassName)}
    >
      {/* Shimmer placeholder shown while loading */}
      {!loaded && !hasError && (
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 animate-shimmer",
            placeholderClassName,
          )}
          style={{
            background:
              "linear-gradient(90deg, oklch(0.93 0.04 350) 0%, oklch(0.97 0.06 350) 40%, oklch(0.96 0.08 350) 55%, oklch(0.93 0.04 350) 100%)",
            backgroundSize: "200% 100%",
          }}
        />
      )}

      {/* Real image — only requests src once in viewport */}
      {inView && !hasError && (
        <img
          alt={alt}
          src={src}
          width={width}
          height={height}
          style={style}
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div
          role="img"
          aria-label={alt}
          className={cn(
            "flex items-center justify-center bg-muted/40 text-muted-foreground text-xs",
            className,
          )}
        >
          <span aria-hidden="true">🌹</span>
        </div>
      )}
    </div>
  );
}
