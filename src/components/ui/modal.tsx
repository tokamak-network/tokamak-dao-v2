"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const modalOverlayVariants = cva([
  "fixed inset-0 z-50",
  "bg-black/50 backdrop-blur-sm",
  "transition-opacity duration-[var(--duration-normal)]",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
]);

const modalContentVariants = cva(
  [
    "fixed left-1/2 top-1/2 z-50",
    "-translate-x-1/2 -translate-y-1/2",
    "bg-[var(--card-bg)]",
    "border border-[var(--card-border)]",
    "rounded-[var(--card-radius)]",
    "shadow-[var(--shadow-lg)]",
    "transition-all duration-[var(--duration-normal)]",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
  ],
  {
    variants: {
      size: {
        sm: "w-full max-w-sm",
        md: "w-full max-w-md",
        lg: "w-full max-w-lg",
        xl: "w-full max-w-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface ModalProps extends VariantProps<typeof modalContentVariants> {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Modal component for dialogs and overlays
 */
const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, description, children, size, className }, ref) => {
    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && open) {
          onClose();
        }
      };

      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    // Prevent body scroll when modal is open
    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => {
        document.body.style.overflow = "";
      };
    }, [open]);

    if (!open) return null;

    return (
      <>
        {/* Overlay */}
        <div
          className={modalOverlayVariants()}
          data-state={open ? "open" : "closed"}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Content */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby={description ? "modal-description" : undefined}
          data-state={open ? "open" : "closed"}
          className={cn(modalContentVariants({ size }), className)}
        >
          {/* Header */}
          {(title || description) && (
            <ModalHeader>
              {title && <ModalTitle id="modal-title">{title}</ModalTitle>}
              {description && (
                <ModalDescription id="modal-description">
                  {description}
                </ModalDescription>
              )}
            </ModalHeader>
          )}

          {/* Body */}
          {children}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "absolute right-4 top-4",
              "text-[var(--text-tertiary)]",
              "hover:text-[var(--text-primary)]",
              "transition-colors duration-[var(--duration-fast)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] rounded"
            )}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </>
    );
  }
);
Modal.displayName = "Modal";

/**
 * Modal header component
 */
const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 pt-6 pb-4 flex flex-col gap-1.5", className)}
    {...props}
  />
));
ModalHeader.displayName = "ModalHeader";

/**
 * Modal title component
 */
const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold text-[var(--text-primary)] leading-tight pr-8",
      className
    )}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

/**
 * Modal description component
 */
const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[var(--text-secondary)]", className)}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

/**
 * Modal body component
 */
const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-4", className)} {...props} />
));
ModalBody.displayName = "ModalBody";

/**
 * Modal footer component
 */
const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-6 py-4 flex items-center justify-end gap-3 border-t border-[var(--border-default)]",
      className
    )}
    {...props}
  />
));
ModalFooter.displayName = "ModalFooter";

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  modalContentVariants,
  modalOverlayVariants,
};
