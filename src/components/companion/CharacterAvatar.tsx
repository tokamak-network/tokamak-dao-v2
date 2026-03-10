"use client";

import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "rounded-full overflow-hidden flex-shrink-0 border-2 border-[var(--border-secondary)]",
  {
    variants: {
      size: {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-14 h-14",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

interface CharacterAvatarProps extends VariantProps<typeof avatarVariants> {
  className?: string;
}

export function CharacterAvatar({ size, className }: CharacterAvatarProps) {
  return (
    <div className={cn(avatarVariants({ size }), className)}>
      <Image
        src="/character.png"
        alt="Tokamak DAO Companion"
        width={56}
        height={56}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
