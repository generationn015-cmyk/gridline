import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:opacity-90",
        secondary:
          "bg-raised text-fg border border-border hover:border-border-strong",
        ghost: "bg-transparent text-fg hover:bg-raised",
        danger: "bg-danger text-fg hover:opacity-90",
        pad: "bg-cell text-fg border border-border hover:bg-cell-on font-display tabular-nums",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[var(--radius-sm)]",
        md: "h-11 px-4 text-sm rounded-[var(--radius-md)]",
        lg: "h-12 px-5 text-base rounded-[var(--radius-md)]",
        icon: "size-11 rounded-[var(--radius-md)]",
        pad: "h-12 min-w-12 rounded-[var(--radius-sm)] text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
