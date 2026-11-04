'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

gsap.registerPlugin(ScrollTrigger);

// Editorial motion for a chapter:
// - grow: the section opens from an inset card to full bleed as it arrives
// - [data-rise]: headlines rise into place
// - [data-words]: a paragraph lights up word by word with the scroll
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
      el.querySelectorAll<HTMLElement>('[data-words]').forEach((p) => {
        if (!p.dataset.split) {
          p.innerHTML = (p.textContent ?? '').split(/\s+/).filter(Boolean).map((w) => `<span class="w">${w}</span>`).join(' ');
          p.dataset.split = '1';
        }
        p.classList.add('words');
        gsap.to(p.querySelectorAll('.w'), {
          opacity: 1, stagger: 0.05, ease: 'none',
          scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 45%', scrub: true },
        });
      });
    }, el);
    return () => ctx.revert();
  }, [grow]);
  return <Tag ref={ref as never} className={className} id={id}>{children}</Tag>;
}
