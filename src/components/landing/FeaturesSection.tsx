"use client";

import { Card } from "@/components/ui/card";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

const features = [
  {
    title: "Propose",
    description:
      "Draft proposals for protocol improvements, fund allocations, and more. Shape the future of Tokamak Network.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    accent: "var(--color-primary-500)",
  },
  {
    title: "Delegate",
    description:
      "Delegate your voting power to a trusted representative who votes on your behalf.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    accent: "var(--color-success-500)",
  },
  {
    title: "Vote",
    description:
      "Cast your vote — for, against, or abstain. Every vote is permanently recorded on-chain.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
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
