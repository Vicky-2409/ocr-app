import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-50",
        ghost: "bg-transparent hover:bg-gray-100 text-gray-900",
        link: "underline-offset-4 hover:underline text-primary-600",
        glass: "bg-white/90 text-gray-900 hover:bg-white/95",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded",
        sm: "h-8 px-3 text-sm rounded-md",
        md: "h-10 px-4 text-sm rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        xl: "h-14 px-8 text-lg rounded-xl",
        icon: {
          xs: "h-7 w-7 rounded",
          sm: "h-8 w-8 rounded-md",
          md: "h-10 w-10 rounded-md",
          lg: "h-12 w-12 rounded-lg",
          xl: "h-14 w-14 rounded-xl",
        },
      },
      fullWidth: {
        true: "w-full",
      },
      loading: {
        true: "relative text-transparent transition-none hover:text-transparent disabled:cursor-wait",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
      loading: false,
    },
    compoundVariants: [
      {
        loading: true,
        class: "relative text-transparent transition-none hover:text-transparent disabled:cursor-wait",
      },
    ],
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, leftIcon, rightIcon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, loading, className }))}
        ref={ref}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
        <span className="flex items-center gap-2">
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
