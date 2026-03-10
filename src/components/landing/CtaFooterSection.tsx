"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { ArrowRight } from "phosphor-react";

export function CtaFooterSection() {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
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
              <ArrowRight size={20} weight="bold" className="ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
