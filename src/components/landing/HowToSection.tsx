"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

const steps = [
  {
    number: 1,
    title: "Connect Wallet",
    description: "Connect your Web3 wallet like MetaMask to join the DAO.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Hold TON Tokens",
    description: "Holding TON tokens grants you voting power in governance.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Propose & Vote",
    description: "Create proposals or vote on existing ones to shape the protocol.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
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
