'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

gsap.registerPlugin(ScrollTrigger);

// Editorial motion for a chapter:
// - grow: the section opens from an inset card to full bleed as it arrives
// - [data-rise]: headlines rise into place
export function Reveal({ children, className, as: Tag = 'div', grow = false, id }: { children: ReactNode; className?: string; as?: 'div' | 'section'; grow?: boolean; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      if (grow) {
        gsap.fromTo(el, { clipPath: 'inset(9% 12% 0% 12% round 32px)' }, {
          clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: true },
        });
      }
      gsap.from(el.querySelectorAll('[data-rise]'), {
        yPercent: 40, autoAlpha: 0, filter: 'blur(10px)', duration: 1.2, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 70%' },
      });
    }, el);
    return () => ctx.revert();
  }, [grow]);
  return <Tag ref={ref as never} className={className} id={id}>{children}</Tag>;
}
