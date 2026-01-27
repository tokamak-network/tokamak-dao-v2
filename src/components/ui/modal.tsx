"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Modal overlay variants
 */
const modalOverlayVariants = cva([
  "fixed inset-0 z-[var(--z-overlay)]",
  "bg-[var(--modal-backdrop)]",
  "backdrop-blur-sm",
  "transition-opacity duration-[var(--duration-normal)]",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
]);

/**
 * Modal content variants
 */
const modalContentVariants = cva(
  [
    "fixed left-1/2 top-1/2 z-[var(--z-modal)]",
    "-translate-x-1/2 -translate-y-1/2",
    "bg-[var(--modal-bg)]",
    "border border-[var(--modal-border)]",
    "rounded-[var(--modal-radius)]",
    "shadow-[var(--modal-shadow)]",
    "transition-all duration-[var(--duration-normal)]",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
    "max-h-[90vh] overflow-y-auto",
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
 * Close icon for modal
 */
const CloseIcon = () => (
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
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Modal component for dialogs and overlays
 */
const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, description, children, size, className }, ref) => {
    const titleId = React.useId();
    const descriptionId = React.useId();

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
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      } else {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
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
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          data-state={open ? "open" : "closed"}
          className={cn(modalContentVariants({ size }), className)}
        >
          {/* Header */}
          {(title || description) && (
            <ModalHeader>
              {title && <ModalTitle id={titleId}>{title}</ModalTitle>}
              {description && (
                <ModalDescription id={descriptionId}>
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
              "absolute right-[var(--space-4)] top-[var(--space-4)]",
              "text-[var(--text-tertiary)]",
              "hover:text-[var(--text-primary)]",
              "transition-colors duration-[var(--duration-fast)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]",
              "rounded-[var(--radius-sm)]",
              "p-1"
            )}
            aria-label="Close dialog"
          >
            <CloseIcon />
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
    className={cn(
      "px-[var(--space-6)] pt-[var(--space-6)] pb-[var(--space-4)]",
      "flex flex-col gap-[var(--space-1-5)]",
      className
    )}
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
      "text-lg font-semibold text-[var(--text-primary)]",
      "leading-[var(--line-height-tight)] pr-[var(--space-8)]",
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
  <div
    ref={ref}
    className={cn("px-[var(--space-6)] py-[var(--space-4)]", className)}
    {...props}
  />
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
      "px-[var(--space-6)] py-[var(--space-4)]",
      "flex items-center justify-end gap-[var(--space-3)]",
      "border-t border-[var(--border-secondary)]",
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
