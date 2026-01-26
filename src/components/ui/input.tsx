"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
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
          "border-[var(--status-error)]",
          "focus:ring-[var(--status-error)]",
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

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, error, type, leftIcon, rightIcon, ...props }, ref) => {
    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ size, error, className }),
              leftIcon && "pl-10",
              rightIcon && "pr-10"
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ size, error, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Textarea component
const textareaVariants = cva(
  [
    "flex w-full min-h-[80px]",
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
    "resize-y",
  ],
  {
    variants: {
      error: {
        true: [
          "border-[var(--status-error)]",
          "focus:ring-[var(--status-error)]",
        ],
      },
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ error, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// Label component
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
    {required && <span className="text-[var(--status-error)] ml-1">*</span>}
  </label>
));
Label.displayName = "Label";

// Helper text component
const HelperText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm",
      error ? "text-[var(--status-error)]" : "text-[var(--text-tertiary)]",
      className
    )}
    {...props}
  />
));
HelperText.displayName = "HelperText";

export { Input, Textarea, Label, HelperText, inputVariants, textareaVariants };
