"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

const concepts = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "Community-Driven",
    description: "Decisions are made collectively by token holders, not a central authority.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Transparent & Secure",
    description: "All proposals and votes are permanently recorded on-chain via smart contracts.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Autonomous Execution",
    description: "Approved proposals are automatically executed — no middleman required.",
  },
];

export function DaoExplainSection() {
  const { ref, isIntersecting } = useIntersectionObserver();

  return (
    <section id="dao-explain" className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px]">
        <div ref={ref} className={`text-center mb-12 transition-all duration-700 ease-out ${isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-3">
            What is a DAO?
          </h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg leading-relaxed">
            A <strong className="text-[var(--text-primary)]">Decentralized Autonomous Organization</strong> where
            every token holder has a voice in shaping the protocol&apos;s future.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {concepts.map((concept, i) => (
            <div
              key={concept.title}
              className={`group relative p-6 rounded-[var(--radius-xl)] border border-[var(--border-secondary)] bg-[var(--surface-primary)] transition-all duration-700 ease-out hover:border-[var(--color-primary-500)]/30 hover:bg-[var(--surface-secondary)] ${
                isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: isIntersecting ? `${i * 120 + 200}ms` : "0ms" }}
            >
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-primary-500)]/10 text-[var(--color-primary-500)] flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary-500)]/15 transition-colors">
                {concept.icon}
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {concept.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {concept.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
