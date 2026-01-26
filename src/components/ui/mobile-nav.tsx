"use client";

import * as React from "react";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const mobileNavOverlayVariants = cva([
  "fixed inset-0 z-40",
  "bg-black/50 backdrop-blur-sm",
  "transition-opacity duration-[var(--duration-normal)]",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
]);

const mobileNavDrawerVariants = cva([
  "fixed left-0 top-0 z-50",
  "h-full w-72",
  "bg-[var(--nav-bg)]",
  "border-r border-[var(--nav-border)]",
  "shadow-[var(--shadow-lg)]",
  "transition-transform duration-[var(--duration-normal)]",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
]);

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  currentPath?: string;
  logo?: React.ReactNode;
  className?: string;
}

/**
 * Mobile navigation drawer component
 * Slides in from the left with an overlay background
 */
const MobileNav = React.forwardRef<HTMLDivElement, MobileNavProps>(
  ({ open, onClose, items, currentPath, logo, className }, ref) => {
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

    // Prevent body scroll when drawer is open
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

    // Handle item click - close drawer
    const handleItemClick = () => {
      onClose();
    };

    if (!open) return null;

    return (
      <>
        {/* Overlay */}
        <div
          className={mobileNavOverlayVariants()}
          data-state={open ? "open" : "closed"}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          data-state={open ? "open" : "closed"}
          className={cn(mobileNavDrawerVariants(), className)}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--nav-border)]">
            {logo}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex items-center justify-center",
                "size-10",
                "rounded-[var(--radius-lg)]",
                "text-[var(--text-secondary)]",
                "hover:bg-[var(--interactive-secondary)]",
                "transition-colors duration-[var(--duration-fast)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              )}
              aria-label="Close menu"
            >
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 p-4">
            {items.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleItemClick}
                  className={cn(
                    "inline-flex items-center gap-3",
                    "px-4 py-3",
                    "text-sm font-medium",
                    "rounded-[var(--radius-lg)]",
                    "transition-colors duration-[var(--duration-fast)]",
                    isActive
                      ? [
                          "bg-[var(--nav-item-bg-active)]",
                          "text-[var(--nav-item-text-active)]",
                        ]
                      : [
                          "text-[var(--nav-item-text)]",
                          "hover:bg-[var(--nav-item-bg-hover)]",
                          "hover:text-[var(--nav-item-text-hover)]",
                        ]
                  )}
                >
                  {item.icon && <span className="size-5">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </>
    );
  }
);
MobileNav.displayName = "MobileNav";

export { MobileNav, mobileNavOverlayVariants, mobileNavDrawerVariants };
