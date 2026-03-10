"use client";

import { Card } from "@/components/ui/card";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { FileText, UserSwitch, CheckCircle } from "phosphor-react";

const features = [
  {
    title: "Propose",
    description:
      "Draft proposals for protocol improvements, fund allocations, and more. Shape the future of Tokamak Network.",
    icon: <FileText size={28} weight="duotone" />,
    accent: "var(--color-primary-500)",
  },
  {
    title: "Delegate",
    description:
      "Delegate your voting power to a trusted representative who votes on your behalf.",
    icon: <UserSwitch size={28} weight="duotone" />,
    accent: "var(--color-success-500)",
  },
  {
    title: "Vote",
    description:
      "Cast your vote — for, against, or abstain. Every vote is permanently recorded on-chain.",
    icon: <CheckCircle size={28} weight="duotone" />,
    accent: "var(--color-warning-500)",
  },
];

export function FeaturesSection() {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <section className="py-20 sm:py-28 relative">
      {/* Subtle background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-primary-500)] opacity-[0.03] blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px] relative">
        <h2
          ref={ref}
          className={`text-2xl sm:text-3xl font-bold text-center text-[var(--text-primary)] mb-4 transition-all duration-700 ease-out ${
            isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Key Features
        </h2>
        <p className={`text-center text-[var(--text-secondary)] mb-12 max-w-lg mx-auto transition-all duration-700 ease-out delay-100 ${
          isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          Everything you need to participate in on-chain governance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              variant="elevated"
              padding="lg"
              className={`group text-center transition-all duration-700 ease-out hover:border-[var(--border-primary)] hover:-translate-y-1 ${
                isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isIntersecting ? `${i * 150 + 200}ms` : "0ms",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: `color-mix(in srgb, ${feature.accent} 12%, transparent)`,
                  color: feature.accent,
                }}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                {feature.title}
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
