"use client";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { UsersThree, ShieldCheck, Lightning } from "phosphor-react";

const concepts = [
  {
    icon: <UsersThree size={24} weight="duotone" />,
    title: "Community-Driven",
    description: "Decisions are made collectively by token holders, not a central authority.",
  },
  {
    icon: <ShieldCheck size={24} weight="duotone" />,
    title: "Transparent & Secure",
    description: "All proposals and votes are permanently recorded on-chain via smart contracts.",
  },
  {
    icon: <Lightning size={24} weight="duotone" />,
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
