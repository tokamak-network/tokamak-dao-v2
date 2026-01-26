"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Sidebar Container
const sidebarVariants = cva(
  [
    "flex flex-col",
    "bg-[var(--sidebar-bg)]",
    "border-r border-[var(--sidebar-border)]",
  ],
  {
    variants: {
      position: {
        left: "border-r",
        right: "border-l border-r-0",
      },
      width: {
        default: "w-[var(--sidebar-width)]",
        narrow: "w-64",
        wide: "w-80",
      },
    },
    defaultVariants: {
      position: "left",
      width: "default",
    },
  }
);

export interface SidebarProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sidebarVariants> {}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, position, width, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(sidebarVariants({ position, width, className }))}
      {...props}
    />
  )
);
Sidebar.displayName = "Sidebar";

// Sidebar Section
const SidebarSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-4",
      "border-b border-[var(--border-subtle)]",
      "last:border-b-0",
      className
    )}
    {...props}
  />
));
SidebarSection.displayName = "SidebarSection";

// Sidebar Title
const SidebarTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm font-semibold text-[var(--text-primary)]",
      "mb-3",
      className
    )}
    {...props}
  />
));
SidebarTitle.displayName = "SidebarTitle";

// Sidebar Item
const sidebarItemVariants = cva(
  [
    "flex items-center justify-between",
    "w-full px-3 py-2.5",
    "text-sm",
    "rounded-[var(--radius-lg)]",
    "transition-colors duration-[var(--duration-fast)]",
    "cursor-pointer",
  ],
  {
    variants: {
      variant: {
        default: [
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--interactive-secondary)]",
          "hover:text-[var(--text-primary)]",
        ],
        active: [
          "bg-[var(--bg-brand-subtle)]",
          "text-[var(--text-brand)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SidebarItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarItemVariants> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  external?: boolean;
}

const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, variant, icon, rightIcon, external, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(sidebarItemVariants({ variant, className }))}
      {...props}
    >
      <span className="flex items-center gap-3">
        {icon && <span className="size-4">{icon}</span>}
        {children}
      </span>
      {rightIcon || (external && (
        <svg
          className="size-4 text-[var(--text-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      ))}
      {!rightIcon && !external && (
        <svg
          className="size-4 text-[var(--text-tertiary)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </button>
  )
);
SidebarItem.displayName = "SidebarItem";

// Collapsible Sidebar Section
export interface CollapsibleSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  defaultOpen?: boolean;
}

const CollapsibleSection = React.forwardRef<
  HTMLDivElement,
  CollapsibleSectionProps
>(({ className, title, defaultOpen = false, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div
      ref={ref}
      className={cn("border-b border-[var(--border-subtle)]", className)}
      {...props}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full",
          "px-4 py-3",
          "text-sm font-medium text-[var(--text-primary)]",
          "hover:bg-[var(--interactive-secondary)]",
          "transition-colors duration-[var(--duration-fast)]"
        )}
      >
        {title}
        <svg
          className={cn(
            "size-4 text-[var(--text-tertiary)]",
            "transition-transform duration-[var(--duration-fast)]",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
});
CollapsibleSection.displayName = "CollapsibleSection";

export {
  Sidebar,
  SidebarSection,
  SidebarTitle,
  SidebarItem,
  CollapsibleSection,
  sidebarVariants,
  sidebarItemVariants,
};
