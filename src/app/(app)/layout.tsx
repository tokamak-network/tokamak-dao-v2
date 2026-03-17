"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  Navigation,
  NavigationBrand,
  NavigationItems,
  NavigationItem,
  NavigationDropdownItem,
  NavigationActions,
  NavigationMenuButton,
} from "@/components/ui/navigation";
import { MobileNav } from "@/components/ui/mobile-nav";

import { SandboxBanner } from "@/components/sandbox";
import { CompanionProvider, CompanionBar, useCompanion } from "@/components/companion";
import { Footer } from "@/components/Footer";



// Navigation icons
const ProposalsIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const DelegatesIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const AgentsIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2a1 1 0 0 1 1 1v1h-2V3a1 1 0 0 1 1-1Z"
    />
    <rect x="4" y="4" width="16" height="12" rx="3" fill="none" />
    <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2 10h2M20 10h2M9 16l-2 4M15 16l2 4"
    />
  </svg>
);

const primaryNavItems = [
  { href: "/proposals", label: "Proposals", icon: <ProposalsIcon /> },
  { href: "/delegates", label: "Holders", icon: <DelegatesIcon /> },
  { href: "/agents", label: "Agents", icon: <AgentsIcon /> },
];

const moreDropdownChildren = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/faucet", label: "Faucet" },
  { href: "/security-council", label: "Security Council" },
  { href: "/vton-issuance-simulator", label: "vTON Issuance Simulator" },
  { href: "https://vton-airdrop-simulator.vercel.app/", label: "vTON Airdrop Simulator", external: true },
  { href: "/sc-action-simulator", label: "SC Action Simulator" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanionProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </CompanionProvider>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isExpanded } = useCompanion();

  const showCompanionBar = pathname !== "/";

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[var(--bg-primary)]",
        "transition-[margin] duration-[var(--duration-slow)] ease-[var(--ease-default)]",
        showCompanionBar && isExpanded && "lg:mr-[400px]"
      )}
    >
      <Navigation>
        <div className="flex items-center gap-2">
          <NavigationMenuButton
            isOpen={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          />
          <NavigationBrand>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/tokamak-logo.svg"
                alt="Tokamak DAO"
                width={36}
                height={24}
                className="h-6 w-auto"
              />
              <span className="font-semibold text-[var(--text-primary)] hidden sm:inline">
                Tokamak DAO
              </span>
            </Link>
          </NavigationBrand>
        </div>

        <NavigationItems className="hidden lg:flex">
          {primaryNavItems.map((item) => (
            <NavigationItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              active={
                pathname === item.href ||
                pathname.startsWith(item.href + "/")
              }
            >
              {item.label}
            </NavigationItem>
          ))}
          {/* TODO: Re-enable More dropdown when ready
          <NavigationDropdownItem
            label="More"
            active={moreDropdownChildren.some(
              (c) =>
                !("external" in c) &&
                (pathname === c.href || pathname.startsWith(c.href + "/"))
            )}
          >
            {moreDropdownChildren}
          </NavigationDropdownItem>
          */}
        </NavigationItems>

        <NavigationActions>
          {/* <SandboxButton /> */}

          <ConnectWalletButton />
        </NavigationActions>
      </Navigation>

      <SandboxBanner />

      {/* Mobile Navigation Drawer */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        items={[
          ...primaryNavItems,
          /* TODO: Re-enable More section when ready
          {
            href: "#",
            label: "More",
            children: moreDropdownChildren,
          },
          */
        ]}
        currentPath={pathname}
        logo={
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/tokamak-logo.svg"
              alt="Tokamak DAO"
              width={36}
              height={24}
              className="h-6 w-auto"
            />
            <span className="font-semibold text-[var(--text-primary)]">
              Tokamak DAO
            </span>
          </Link>
        }
      />

      {pathname === "/" ? (
        <>
          <main className="flex-1">{children}</main>
          <Footer />
        </>
      ) : (
        <main className="flex-1 container mx-auto px-4 py-6 lg:py-8 max-w-7xl pb-16">
          {children}
        </main>
      )}

      {showCompanionBar && <CompanionBar />}
    </div>
  );
}
