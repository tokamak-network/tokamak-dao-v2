"use client";

import Image from "next/image";
import Link from "next/link";

const footerColumns = [
  {
    title: "Developer",
    links: [
      { label: "Documents", href: "https://docs.tokamak.network", external: true },
      { label: "Github", href: "https://github.com/tokamak-network", external: true },
      { label: "Grant", href: "https://tokamak.notion.site/Tokamak-Network-Grant-Program-f2384b458ea341a0987c7e73a909aa21", external: true },
    ],
  },
  {
    title: "Features",
    links: [
      { label: "Rollup Hub", href: "https://rolluphub.tokamak.network/", external: true },
      { label: "Staking", href: "https://simple.staking.tokamak.network/", external: true },
      { label: "DAO", href: "/proposals" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Price Dashboard", href: "https://price.tokamak.network", external: true },
      { label: "Partners", href: "https://tokamaknetwork.com/about/partners", external: true },
      { label: "Insight", href: "https://tokamaknetwork.com/about/insight", external: true },
    ],
  },
  {
    title: "Social",
    links: [
      { label: "Medium", href: "https://medium.com/tokamak-network", external: true },
      { label: "X (Twitter)", href: "https://twitter.com/tokamak_network", external: true },
      { label: "Discord", href: "https://discord.com/invite/J4chV2zuAK", external: true },
      { label: "Telegram (EN)", href: "https://t.me/tokamak_network", external: true },
      { label: "LinkedIn", href: "https://www.linkedin.com/company/tokamaknetwork/", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[var(--bg-primary)] mt-auto">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Subtle divider */}
        <div className="h-px bg-[var(--border-secondary)]" />

        <div className="py-12 lg:py-14">
          {/* Logo + Link columns on same row */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-0">
            {/* Logo - aligned to left */}
            <div className="flex-shrink-0 lg:w-[280px]">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <Image
                  src="/tokamak-logo.svg"
                  alt="Tokamak Network"
                  width={32}
                  height={22}
                  className="h-6 w-auto"
                />
                <span className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                  Tokamak Network
                </span>
              </Link>
            </div>

            {/* Link columns - fill remaining space, right-aligned text */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-12">
              {footerColumns.map((column) => (
                <div key={column.title} className="lg:text-right">
                  <p className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                    {column.title}
                  </p>
                  <ul className="space-y-2">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-10 lg:mt-12">
            <p className="text-xs text-[var(--text-quaternary)]">
              &copy; {new Date().getFullYear()} Tokamak Network | All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
