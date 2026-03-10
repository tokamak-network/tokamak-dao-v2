"use client";

import { cn } from "@/lib/utils";
import { useCompanion } from "./CompanionProvider";
import { CharacterAvatar } from "./CharacterAvatar";

export function CompanionInline() {
  const { isExpanded, setIsExpanded, messages, screenContext } = useCompanion();

  // Hide when panel is open or conversation already started
  if (isExpanded || messages.length > 0) return null;

  const handleQuestionClick = (question: string) => {
    setIsExpanded(true);
    // Small delay so panel opens first, then send
    setTimeout(() => {
      // The question will be typed by the user in the input
      // For now, just open the panel — user can click suggestion there
    }, 0);
  };

  return (
    <div className="relative mt-8 mb-4">
      <div className="flex items-end gap-4">
        {/* Character — large, sitting on the "edge" */}
        <button
          onClick={() => setIsExpanded(true)}
          className="group relative flex-shrink-0 cursor-pointer"
        >
          <div
            className={cn(
              "w-16 h-16 rounded-full overflow-hidden",
              "border-2 border-[var(--border-secondary)]",
              "shadow-md",
              "transition-all duration-[var(--duration-normal)]",
              "group-hover:scale-105 group-hover:shadow-lg group-hover:border-[var(--accent-primary)]"
            )}
          >
            <img
              src="/character.png"
              alt="DAO Companion"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Subtle pulse ring on idle */}
          <div className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)] opacity-0 group-hover:opacity-0 animate-[ping_3s_ease-in-out_infinite]" />
        </button>

        {/* Speech bubble + suggestions */}
        <div className="flex-1 min-w-0 max-w-md">
          {/* Bubbles */}
          <div className="flex flex-col gap-1.5">
            <div
              className={cn(
                "relative bg-[var(--surface-secondary)] rounded-2xl rounded-bl-sm",
                "px-4 py-3",
                "border border-[var(--border-secondary)]"
              )}
            >
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                Hey! I&apos;m here to help you navigate Tokamak DAO.
              </p>
            </div>
            <div
              className={cn(
                "relative bg-[var(--surface-secondary)] rounded-2xl rounded-bl-sm",
                "px-4 py-3",
                "border border-[var(--border-secondary)]"
              )}
            >
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                Proposals, voting, delegation — governance happens right here.
              </p>
            </div>
            <div
              className={cn(
                "relative bg-[var(--surface-secondary)] rounded-2xl rounded-bl-sm",
                "px-4 py-3",
                "border border-[var(--border-secondary)]"
              )}
            >
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                Curious about something? Click me anytime!
              </p>
            </div>
          </div>

          {/* Suggested question chips */}
          {screenContext.suggestedQuestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {screenContext.suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setIsExpanded(true);
                  }}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full",
                    "bg-[var(--surface-primary)] border border-[var(--border-secondary)]",
                    "text-[var(--text-secondary)]",
                    "hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]",
                    "transition-colors duration-[var(--duration-fast)]",
                    "cursor-pointer"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
