"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className: string;
  delay?: number;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (
      !section ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    section.style.setProperty("--reveal-delay", `${delay}ms`);
    section.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        section.classList.add("is-visible");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12%", threshold: 0.12 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <section ref={sectionRef} className={className}>
      {children}
    </section>
  );
}
