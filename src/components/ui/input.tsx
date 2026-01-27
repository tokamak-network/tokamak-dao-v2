"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Shared base styles for input and textarea
 */
const baseInputStyles = [
  "flex w-full",
  "bg-[var(--input-bg)]",
  "text-[var(--input-text)]",
  "placeholder:text-[var(--input-placeholder)]",
  "border border-[var(--input-border)]",
  "rounded-[var(--input-radius)]",
  "px-[var(--input-padding-x)] py-[var(--input-padding-y)]",
  "transition-colors duration-[var(--duration-fast)]",
  "hover:border-[var(--input-border-hover)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1",
  "disabled:cursor-not-allowed disabled:opacity-50",
] as const;

/**
 * Input component variants
 */
const inputVariants = cva(
  [
    ...baseInputStyles,
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  ],
  {
    variants: {
      size: {
        sm: "h-8 text-sm",
        md: "h-10 text-sm",
        lg: "h-12 text-base",
      },
      error: {
        true: [
          "border-[var(--status-error-fg)]",
          "focus:ring-[var(--status-error-fg)]",
        ],
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Icon wrapper for input adornments
 */
const InputIcon = ({
  children,
  position,
}: {
  children: React.ReactNode;
  position: "left" | "right";
}) => (
  <div
    className={cn(
      "absolute top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]",
      "pointer-events-none",
      position === "left" ? "left-[var(--space-3)]" : "right-[var(--space-3)]"
    )}
    aria-hidden="true"
  >
    {children}
  </div>
);

/**
 * Text input component with optional icons
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, error, type, leftIcon, rightIcon, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && <InputIcon position="left">{leftIcon}</InputIcon>}
          <input
            type={type}
            className={cn(
              inputVariants({ size, error, className }),
              leftIcon && "pl-10",
              rightIcon && "pr-10"
            )}
            ref={ref}
            aria-invalid={error || undefined}
            {...props}
          />
          {rightIcon && <InputIcon position="right">{rightIcon}</InputIcon>}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ size, error, className }))}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

/**
 * Textarea component variants
 */
const textareaVariants = cva(
  [...baseInputStyles, "min-h-20 resize-y"],
  {
    variants: {
      error: {
        true: [
          "border-[var(--status-error-fg)]",
          "focus:ring-[var(--status-error-fg)]",
        ],
      },
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

/**
 * Multiline text input component
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      className={cn(textareaVariants({ error, className }))}
      ref={ref}
      aria-invalid={error || undefined}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

/**
 * Form label component
 */
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium text-[var(--text-primary)]",
      className
    )}
    {...props}
  >
    {children}
    {required && (
      <span className="text-[var(--status-error-fg)] ml-1" aria-hidden="true">
        *
      </span>
    )}
  </label>
));
Label.displayName = "Label";

/**
 * Helper text component for form fields
 */
const HelperText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <p
    ref={ref}
    role={error ? "alert" : undefined}
    className={cn(
      "text-sm",
      error ? "text-[var(--status-error-fg)]" : "text-[var(--text-tertiary)]",
      className
    )}
    {...props}
  />
));
HelperText.displayName = "HelperText";

export { Input, Textarea, Label, HelperText, inputVariants, textareaVariants };
