"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Sidebar container variants
 */
const sidebarVariants = cva(
  [
    "flex flex-col",
    "bg-[var(--sidebar-bg)]",
  ],
  {
    variants: {
      position: {
        left: "border-r border-[var(--sidebar-border)]",
        right: "border-l border-[var(--sidebar-border)]",
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

/**
 * Sidebar container component
 */
const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, position, width, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn(sidebarVariants({ position, width, className }))}
      role="complementary"
      {...props}
    />
  )
);
Sidebar.displayName = "Sidebar";

/**
 * Sidebar section component
 */
const SidebarSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-[var(--space-4)]",
      "border-b border-[var(--border-tertiary)]",
      "last:border-b-0",
      className
    )}
    {...props}
  />
));
SidebarSection.displayName = "SidebarSection";

/**
 * Sidebar title component
 */
const SidebarTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm font-semibold text-[var(--text-primary)]",
      "mb-[var(--space-3)]",
      className
    )}
    {...props}
  />
));
SidebarTitle.displayName = "SidebarTitle";

/**
 * Sidebar item variants
 */
const sidebarItemVariants = cva(
  [
    "flex items-center justify-between",
    "w-full px-[var(--space-3)] py-[var(--space-2-5)]",
    "text-sm",
    "rounded-[var(--radius-lg)]",
    "transition-colors duration-[var(--duration-fast)]",
    "cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]",
  ],
  {
    variants: {
      variant: {
        default: [
          "text-[var(--text-secondary)]",
          "hover:bg-[var(--bg-tertiary)]",
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

/**
 * External link icon
 */
const ExternalLinkIcon = () => (
  <svg
    className="size-4 text-[var(--text-tertiary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

/**
 * Chevron right icon
 */
const ChevronRightIcon = () => (
  <svg
    className="size-4 text-[var(--text-tertiary)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

/**
 * Sidebar item component
 */
const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, variant, icon, rightIcon, external, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(sidebarItemVariants({ variant, className }))}
      {...props}
    >
      <span className="flex items-center gap-[var(--space-3)]">
        {icon && <span className="size-4" aria-hidden="true">{icon}</span>}
        {children}
      </span>
      {rightIcon || (external ? <ExternalLinkIcon /> : <ChevronRightIcon />)}
    </button>
  )
);
SidebarItem.displayName = "SidebarItem";

/**
 * Collapsible section props
 */
export interface CollapsibleSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  defaultOpen?: boolean;
}

/**
 * Chevron down icon for collapsible section
 */
const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
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
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

/**
 * Collapsible sidebar section component
 */
const CollapsibleSection = React.forwardRef<
  HTMLDivElement,
  CollapsibleSectionProps
>(({ className, title, defaultOpen = false, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <div
      ref={ref}
      className={cn("border-b border-[var(--border-tertiary)]", className)}
      {...props}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          "flex items-center justify-between w-full",
          "px-[var(--space-4)] py-[var(--space-3)]",
          "text-sm font-medium text-[var(--text-primary)]",
          "hover:bg-[var(--bg-tertiary)]",
          "transition-colors duration-[var(--duration-fast)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
          "focus-visible:ring-[var(--color-primary-500)]"
        )}
      >
        {title}
        <ChevronDownIcon isOpen={isOpen} />
      </button>
      {isOpen && (
        <div
          id={contentId}
          className="px-[var(--space-4)] pb-[var(--space-4)]"
        >
          {children}
        </div>
      )}
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
