import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-body font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-500 shadow-md hover:shadow-lg",
        secondary:
          "bg-violet-500 text-white hover:bg-violet-600 focus-visible:ring-violet-500 shadow-md hover:shadow-lg",
        outline:
          "border-2 border-brand-500 bg-transparent text-brand-600 hover:bg-brand-50 focus-visible:ring-brand-500",
        ghost:
          "bg-transparent text-brand-600 hover:bg-brand-50 focus-visible:ring-brand-500",
        destructive:
          "bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-500",
        success:
          "bg-emerald-500 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        default: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
