"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Wallet, Coins, Scales } from "phosphor-react";

const steps = [
  {
    number: 1,
    title: "Connect Wallet",
    description: "Connect your Web3 wallet like MetaMask to join the DAO.",
    icon: <Wallet size={20} weight="duotone" />,
  },
  {
    number: 2,
    title: "Hold TON Tokens",
    description: "Holding TON tokens grants you voting power in governance.",
    icon: <Coins size={20} weight="duotone" />,
  },
  {
    number: 3,
    title: "Propose & Vote",
    description: "Create proposals or vote on existing ones to shape the protocol.",
    icon: <Scales size={20} weight="duotone" />,
  },
];

export function HowToSection() {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <section className="py-20 sm:py-28 bg-[var(--bg-secondary)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px]">
        <h2
          ref={ref}
          className={`text-2xl sm:text-3xl font-bold text-center text-[var(--text-primary)] mb-4 transition-all duration-700 ease-out ${
            isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          How to Participate
        </h2>
        <p className={`text-center text-[var(--text-secondary)] mb-14 max-w-lg mx-auto transition-all duration-700 ease-out delay-100 ${
          isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          Get started in three simple steps.
        </p>

        <div className="flex flex-col md:flex-row items-start md:items-stretch gap-8 md:gap-0">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="flex-1 flex items-start md:flex-col md:items-center gap-4 md:gap-0 relative"
            >
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-7 left-[calc(50%+28px)] right-[calc(-50%+28px)] h-px border-t border-dashed border-[var(--border-primary)]" />
              )}

              {/* Number circle with icon */}
              <div
                className={`shrink-0 w-14 h-14 rounded-full bg-[var(--color-primary-500)] text-white flex items-center justify-center font-bold transition-all duration-700 ease-out ${
                  isIntersecting ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
                style={{
                  transitionDelay: isIntersecting ? `${i * 150 + 200}ms` : "0ms",
                }}
              >
                {step.icon}
              </div>

              <div
                className={`md:mt-5 md:text-center transition-all duration-700 ease-out ${
                  isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDelay: isIntersecting ? `${i * 150 + 300}ms` : "0ms",
                }}
              >
                <div className="text-xs font-semibold text-[var(--color-primary-500)] mb-1 tracking-wide uppercase">
                  Step {step.number}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[240px]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
