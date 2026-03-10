"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown } from "phosphor-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--color-primary-500)] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[var(--color-primary-700)] opacity-[0.04] blur-[100px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-gray-400) 1px, transparent 1px), linear-gradient(90deg, var(--color-gray-400) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px] relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Mobile: character first */}
          <div className="lg:hidden flex flex-col items-center">
            <div className="relative">
              <div className="speech-bubble mb-4 animate-fade-down">
                Hi! I&apos;m your Tokamak DAO guide
              </div>
              <Image
                src="/character.png"
                alt="Tokamak DAO Guide Character"
                width={240}
                height={240}
                priority
                className="w-48 h-48 sm:w-60 sm:h-60 object-contain animate-fade-up"
              />
            </div>
          </div>

          {/* Left: Headline */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-block mb-4 px-3 py-1.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface-primary)] text-xs font-medium text-[var(--text-secondary)] tracking-wide uppercase">
              Decentralized Governance
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.05]">
              Governance
              <br />
              <span className="bg-gradient-to-r from-[var(--color-primary-400)] to-[var(--color-primary-600)] bg-clip-text text-transparent">
                Built by Community
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-[var(--text-secondary)] max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Propose, delegate, and vote on Tokamak DAO.
              <br className="hidden sm:block" />
              Participate in decentralized governance.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="primary" size="xl" asChild className="relative shadow-lg shadow-[var(--color-primary-500)]/20 hover:shadow-xl hover:shadow-[var(--color-primary-500)]/30">
                <Link href="/proposals">
                  Enter Governance
                  <ArrowRight size={20} weight="bold" className="ml-1" />
                </Link>
              </Button>
              <Button variant="secondary" size="xl" asChild>
                <a href="#dao-explain">Learn More</a>
              </Button>
            </div>
          </div>

          {/* Right: Character (desktop) */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="relative">
              <div className="speech-bubble mb-4 animate-fade-down">
                Hi! I&apos;m your Tokamak DAO guide
              </div>
              {/* Glow behind character */}
              <div className="absolute inset-0 top-12 bg-[var(--color-primary-500)] opacity-[0.08] blur-[60px] rounded-full" />
              <Image
                src="/character.png"
                alt="Tokamak DAO Guide Character"
                width={360}
                height={360}
                priority
                className="relative w-72 h-72 xl:w-80 xl:h-80 object-contain animate-fade-up"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-[var(--text-tertiary)] animate-pulse-soft">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ArrowDown size={16} weight="bold" />
      </div>
    </section>
  );
}
