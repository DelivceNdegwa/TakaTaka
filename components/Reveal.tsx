'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

gsap.registerPlugin(ScrollTrigger);

// Headlines rise line by line as they come into view; content stays visible without JS
export function Reveal({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('[data-rise]'), {
        yPercent: 60, autoAlpha: 0, filter: 'blur(10px)', duration: 1.1, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 78%' },
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return <Tag ref={ref as never} className={className}>{children}</Tag>;
}
