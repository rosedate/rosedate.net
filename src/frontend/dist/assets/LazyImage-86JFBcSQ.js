import { r as reactExports, j as jsxRuntimeExports, c as cn } from "./index-OIeMUJ41.js";
function LazyImage({
  src,
  alt,
  className,
  placeholderClassName,
  wrapperClassName,
  rootMargin = "200px",
  loading,
  style,
  width,
  height
}) {
  const containerRef = reactExports.useRef(null);
  const [inView, setInView] = reactExports.useState(loading === "eager");
  const [loaded, setLoaded] = reactExports.useState(false);
  const [hasError, setHasError] = reactExports.useState(false);
  reactExports.useEffect(() => {
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
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, rootMargin]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      ref: containerRef,
      className: cn("relative overflow-hidden", wrapperClassName),
      children: [
        !loaded && !hasError && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "aria-hidden": "true",
            className: cn(
              "absolute inset-0 animate-shimmer",
              placeholderClassName
            ),
            style: {
              background: "linear-gradient(90deg, oklch(0.93 0.04 350) 0%, oklch(0.97 0.06 350) 40%, oklch(0.96 0.08 350) 55%, oklch(0.93 0.04 350) 100%)",
              backgroundSize: "200% 100%"
            }
          }
        ),
        inView && !hasError && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            alt,
            src,
            width,
            height,
            style,
            onLoad: () => setLoaded(true),
            onError: () => setHasError(true),
            className: cn(
              "transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
              className
            )
          }
        ),
        hasError && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            role: "img",
            "aria-label": alt,
            className: cn(
              "flex items-center justify-center bg-muted/40 text-muted-foreground text-xs",
              className
            ),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", children: "🌹" })
          }
        )
      ]
    }
  );
}
export {
  LazyImage as L
};
