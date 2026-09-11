import { cn } from "@/lib/utils";

export function NinaMark({
  className,
  size = "md",
  named = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  named?: boolean;
}) {
  const dim = size === "sm" ? "size-8 text-sm" : size === "lg" ? "size-14 text-2xl" : "size-10 text-lg";
  const nameSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-raised font-display font-medium text-accent",
          dim,
        )}
      >
        N
      </span>
      {named ? (
        <span className={cn("font-display leading-none tracking-tight text-fg", nameSize)}>Nina</span>
      ) : (
        <span className="sr-only">Nina</span>
      )}
    </span>
  );
}
