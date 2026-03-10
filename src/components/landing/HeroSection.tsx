"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown } from "phosphor-react";

const SPEECH_BUBBLES = [
  "Hey! I'm here to help you navigate Tokamak DAO.",
  "Proposals, voting, delegation — governance happens right here.",
  "Curious about something? Click me anytime!",
];

const INTERVAL_MS = 4000;

function SpeechBubble({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SPEECH_BUBBLES.length);
        setVisible(true);
      }, 300);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`mb-4 min-h-[3.5rem] flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    >
      <div className="speech-bubble">
        {SPEECH_BUBBLES[index]}
      </div>
    </div>
  );
}

function CharacterVideo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // 끝나기 0.1초 전에 처음으로 되감아서 끊김 방지
    if (video.duration - video.currentTime < 0.1) {
      video.currentTime = 0;
      video.play();
    }
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      onTimeUpdate={handleTimeUpdate}
      className={className}
    >
      <source src="/character-video.webm" type="video/webm" />
      <source src="/character-video.mp4" type="video/mp4" />
    </video>
  );
}

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
            <div className="relative pt-16 w-48 sm:w-60">
              <SpeechBubble className="animate-fade-down absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap" />
              <CharacterVideo className="w-48 h-48 sm:w-60 sm:h-60 object-cover animate-fade-up" />
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
            <div className="relative pt-16 w-80 xl:w-96">
              <SpeechBubble className="animate-fade-down absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap" />
              {/* Glow behind character */}
              <div className="absolute inset-0 top-12 bg-[var(--color-primary-500)] opacity-[0.08] blur-[60px] rounded-full" />
              <CharacterVideo className="relative w-80 h-80 xl:w-96 xl:h-96 object-cover animate-fade-up" />
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
