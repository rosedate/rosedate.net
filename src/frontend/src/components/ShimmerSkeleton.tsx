import { cn } from "@/lib/utils";
import type React from "react";

/**
 * ShimmerSkeleton — a rose-pink gradient shimmer replacement for the basic
 * Skeleton pulse component. Drop-in: accepts the same className/props as
 * shadcn's Skeleton.
 *
 * Uses the `animate-shimmer` keyframe defined in tailwind.config.js which
 * sweeps a rose gradient left-to-right over 1.8 s.
 */
function ShimmerSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-md animate-shimmer shrink-0", className)}
      style={{
        background:
          "linear-gradient(90deg, oklch(0.93 0.04 350) 0%, oklch(0.97 0.06 350) 40%, oklch(0.96 0.08 350) 55%, oklch(0.93 0.04 350) 100%)",
        backgroundSize: "200% 100%",
      }}
      {...props}
    />
  );
}

export { ShimmerSkeleton };
