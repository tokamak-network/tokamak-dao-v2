"use client";

import { HeroSection } from "@/components/landing/HeroSection";
import { DaoExplainSection } from "@/components/landing/DaoExplainSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowToSection } from "@/components/landing/HowToSection";
import { CtaFooterSection } from "@/components/landing/CtaFooterSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <HeroSection />
      <DaoExplainSection />
      <FeaturesSection />
      <HowToSection />
      <CtaFooterSection />
    </div>
  );
}
