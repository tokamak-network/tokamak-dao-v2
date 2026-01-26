"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles (Tally-inspired)
  [
    "inline-flex items-center justify-center gap-2",
    "font-semibold whitespace-nowrap",
    "rounded-lg",
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-default)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "focus-visible:ring-[var(--color-primary-500)]",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)]",
          "hover:bg-[var(--button-primary-bg-hover)]",
          "active:scale-[0.98]",
          "shadow-sm hover:shadow-md",
        ],
        secondary: [
          "bg-[var(--button-secondary-bg)] text-[var(--button-secondary-fg)]",
          "border border-[var(--button-secondary-border)]",
          "hover:bg-[var(--button-secondary-bg-hover)]",
          "active:scale-[0.98]",
        ],
        tertiary: [
          "bg-[var(--button-tertiary-bg)] text-[var(--button-tertiary-fg)]",
          "hover:bg-[var(--button-tertiary-bg-hover)]",
        ],
        ghost: [
          "bg-transparent text-[var(--text-secondary)]",
          "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
        ],
        destructive: [
          "bg-[var(--color-error-600)] text-white",
          "hover:bg-[var(--color-error-700)]",
          "active:scale-[0.98]",
          "shadow-sm hover:shadow-md",
        ],
        success: [
          "bg-[var(--color-success-600)] text-white",
          "hover:bg-[var(--color-success-700)]",
          "active:scale-[0.98]",
          "shadow-sm hover:shadow-md",
        ],
        link: [
          "text-[var(--text-brand)] bg-transparent",
          "underline-offset-4 hover:underline",
          "p-0 h-auto",
        ],
      },
      size: {
        xs: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 px-3 text-sm [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-11 px-5 text-base [&_svg]:size-5",
        xl: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-4",
        "icon-xs": "size-7 [&_svg]:size-3.5",
        "icon-lg": "size-12 [&_svg]:size-5",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
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
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        type={asChild ? undefined : type}
        {...props}
      >
        {asChild ? (
          children
        ) : loading ? (
          <>
            <svg
              className="animate-spin"
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
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

// Icon Button (convenience wrapper)
export interface IconButtonProps extends Omit<ButtonProps, "leftIcon" | "rightIcon"> {
  icon: React.ReactNode;
  "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "icon", ...props }, ref) => (
    <Button ref={ref} size={size} {...props}>
      {icon}
    </Button>
  )
);
IconButton.displayName = "IconButton";

export { Button, IconButton, buttonVariants };
