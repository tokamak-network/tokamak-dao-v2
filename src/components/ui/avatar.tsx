"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Avatar component variants
 */
const avatarVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center",
    "overflow-hidden",
    "rounded-[var(--avatar-radius)]",
    "bg-[var(--bg-tertiary)]",
    "border border-[var(--avatar-border)]",
    "select-none",
  ],
  {
    variants: {
      size: {
        xs: "size-6 text-xs",
        sm: "size-8 text-sm",
        md: "size-10 text-base",
        lg: "size-12 text-lg",
        xl: "size-16 text-xl",
        "2xl": "size-20 text-2xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(avatarVariants({ size, className }))}
      {...props}
    />
  )
);
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, alt = "", ...props }, ref) => (
  <img
    ref={ref}
    alt={alt}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center",
      "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
      "font-medium uppercase",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

/**
 * Props for address-based avatar
 */
export interface AddressAvatarProps extends AvatarProps {
  address: string;
  src?: string;
}

/**
 * Generate deterministic colors from an Ethereum address
 */
const generateAddressColors = (address: string): [string, string] => {
  if (!address) return ["#e5e7eb", "#d1d5db"];
  const hash = address.toLowerCase().slice(2, 10);
  const num = parseInt(hash, 16);
  const hue1 = num % 360;
  const hue2 = (num * 7) % 360;
  return [
    `hsl(${hue1}, 70%, 60%)`,
    `hsl(${hue2}, 70%, 50%)`,
  ];
};

/**
 * Jazzicon-style avatar for Ethereum addresses
 */
const AddressAvatar = React.forwardRef<HTMLDivElement, AddressAvatarProps>(
  ({ address, src, size, className, ...props }, ref) => {
    const colors = React.useMemo(
      () => generateAddressColors(address),
      [address]
    );

    const shortAddress = address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : "";

    return (
      <Avatar
        ref={ref}
        size={size}
        className={className}
        title={address}
        {...props}
      >
        {src ? (
          <AvatarImage src={src} alt={`Avatar for ${shortAddress}`} />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
            }}
            role="img"
            aria-label={`Avatar for ${shortAddress}`}
          />
        )}
      </Avatar>
    );
  }
);
AddressAvatar.displayName = "AddressAvatar";

export { Avatar, AvatarImage, AvatarFallback, AddressAvatar, avatarVariants };
