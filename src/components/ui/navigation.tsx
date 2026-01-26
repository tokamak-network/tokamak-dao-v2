"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Navigation Container
const Navigation = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn(
      "flex items-center justify-between",
      "h-16 px-4 lg:px-6",
      "bg-[var(--nav-bg)]",
      "border-b border-[var(--nav-border)]",
      className
    )}
    {...props}
  />
));
Navigation.displayName = "Navigation";

// Navigation Brand/Logo
const NavigationBrand = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3", className)}
    {...props}
  />
));
NavigationBrand.displayName = "NavigationBrand";

// Navigation Items Container
const NavigationItems = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-1", className)}
    {...props}
  />
));
NavigationItems.displayName = "NavigationItems";

// Navigation Item
const navItemVariants = cva(
  [
    "inline-flex items-center gap-2",
    "px-3 py-2",
    "text-sm font-medium",
    "rounded-[var(--radius-lg)]",
    "transition-colors duration-[var(--duration-fast)]",
  ],
  {
    variants: {
      active: {
        true: [
          "bg-[var(--nav-item-bg-active)]",
          "text-[var(--nav-item-text-active)]",
        ],
        false: [
          "text-[var(--nav-item-text)]",
          "hover:bg-[var(--nav-item-bg-hover)]",
          "hover:text-[var(--nav-item-text-hover)]",
        ],
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export interface NavItemProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof navItemVariants> {
  href: string;
  icon?: React.ReactNode;
}

const NavigationItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ className, active, href, icon, children, ...props }, ref) => (
    <Link
      ref={ref}
      href={href}
      className={cn(navItemVariants({ active, className }))}
      {...props}
    >
      {icon && <span className="size-4">{icon}</span>}
      {children}
    </Link>
  )
);
NavigationItem.displayName = "NavigationItem";

// Navigation Actions (right side)
const NavigationActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2", className)}
    {...props}
  />
));
NavigationActions.displayName = "NavigationActions";

// Mobile Navigation Menu Button
const NavigationMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isOpen?: boolean }
>(({ className, isOpen, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center",
      "size-10",
      "rounded-[var(--radius-lg)]",
      "text-[var(--text-secondary)]",
      "hover:bg-[var(--interactive-secondary)]",
      "lg:hidden",
      className
    )}
    aria-label={isOpen ? "Close menu" : "Open menu"}
    {...props}
  >
    {isOpen ? (
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
    ) : (
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
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    )}
  </button>
));
NavigationMenuButton.displayName = "NavigationMenuButton";

// DAO Selector (like the Web3@KAIST-2023 dropdown)
export interface DaoSelectorProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  icon?: React.ReactNode;
}

const DaoSelector = React.forwardRef<HTMLButtonElement, DaoSelectorProps>(
  ({ className, name, icon, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2",
        "px-3 py-2",
        "text-sm font-medium",
        "rounded-[var(--radius-lg)]",
        "border border-[var(--border-default)]",
        "bg-[var(--surface-default)]",
        "hover:bg-[var(--interactive-secondary)]",
        "transition-colors duration-[var(--duration-fast)]",
        className
      )}
      {...props}
    >
      {icon && <span className="size-5">{icon}</span>}
      <span className="max-w-[150px] truncate">{name}</span>
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
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  )
);
DaoSelector.displayName = "DaoSelector";

export {
  Navigation,
  NavigationBrand,
  NavigationItems,
  NavigationItem,
  NavigationActions,
  NavigationMenuButton,
  DaoSelector,
  navItemVariants,
};
