"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getScreenContext } from "@/lib/companion/screen-contexts";
import type { ScreenContext } from "@/lib/companion/types";

export function useScreenContext(): ScreenContext {
  const pathname = usePathname();
  return useMemo(() => getScreenContext(pathname), [pathname]);
}
