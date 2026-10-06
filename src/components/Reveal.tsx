"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Jeda masuk dalam milidetik. Dipakai untuk memberi urutan baca, bukan hiasan. */
  delay?: number;
  className?: string;
};

export const Reveal = ({ children, delay = 0, className = "" }: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    let failsafe = 0;
    const show = () => setVisible(true);
    const observer = new IntersectionObserver(
      (entries) => {
        // Observer terbukti bekerja, jadi jaring pengaman tidak diperlukan lagi.
        window.clearTimeout(failsafe);
        if (entries.some((entry) => entry.isIntersecting)) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(node);
    failsafe = window.setTimeout(show, 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`motion-rise ${visible ? "is-visible" : ""} ${className}`}
      style={delay ? ({ "--rise-delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
};
