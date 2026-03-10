"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

export function CtaFooterSection() {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <>
      {/* CTA */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[var(--color-primary-500)] opacity-[0.05] blur-[100px]" />
        </div>

        <div
          ref={ref}
          className={`container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px] text-center relative transition-all duration-700 ease-out ${
            isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-[var(--text-secondary)] mb-10 text-lg leading-relaxed">
              Join the community and add your voice to Tokamak DAO governance.
            </p>
            <Button variant="primary" size="xl" asChild className="shadow-lg shadow-[var(--color-primary-500)]/20">
              <Link href="/proposals">
                Get Started
                <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mini Footer */}
      <footer className="py-8 border-t border-[var(--border-secondary)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--text-tertiary)]">
          <p>
            &copy; {new Date().getFullYear()} Tokamak Network. All rights
            reserved.
          </p>
          <p className="font-mono text-xs truncate max-w-[300px]">
            Governor: 0x...
          </p>
        </div>
      </footer>
    </>
  );
}
