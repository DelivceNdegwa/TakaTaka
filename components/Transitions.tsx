'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

const STEPS = 10;

// A staircase wipe: columns of the next chapter's colour rise one after another
export function Stairs({ colour }: { colour: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el.children, { scaleY: 0 }, {
        scaleY: 1, ease: 'none', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div className="stairs" ref={ref} aria-hidden="true">
      {Array.from({ length: STEPS }, (_, i) => <i key={i} style={{ background: colour }} />)}
    </div>
  );
}

// An ink wash: a soft, ragged blot of the next chapter's colour spreads from a point
export function useInk(target: React.RefObject<HTMLElement | null>, origin = '30% 0%') {
  useEffect(() => {
    const el = target.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    g.filter = 'blur(14px)';
    g.fillStyle = '#000';
    // overlapping lumps make a ragged, watery edge
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * 150;
      g.beginPath();
      g.arc(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 40 + Math.random() * 70, 0, Math.PI * 2);
      g.fill();
    }
    const url = c.toDataURL('image/png');
    Object.assign(el.style, { maskImage: `url(${url})`, webkitMaskImage: `url(${url})`, maskRepeat: 'no-repeat', webkitMaskRepeat: 'no-repeat', maskPosition: origin, webkitMaskPosition: origin });
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { maskSize: '20% 20%', webkitMaskSize: '20% 20%' }, {
        maskSize: '600% 600%', webkitMaskSize: '600% 600%', ease: 'power1.in',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: true },
        onComplete: () => { el.style.maskImage = 'none'; el.style.webkitMaskImage = 'none'; },
      });
    });
    return () => ctx.revert();
  }, [target, origin]);
}
