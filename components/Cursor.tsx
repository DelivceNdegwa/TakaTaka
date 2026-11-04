'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';

// A ring that trails the pointer and swells over anything you can press or grab (mouse only)
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ring.current;
    if (!el || !matchMedia('(pointer: fine)').matches) return;
    const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      x(e.clientX); y(e.clientY);
      const t = e.target as Element | null;
      const hot = !!t?.closest('a, button, canvas, [data-grab]');
      el.dataset.hot = hot ? 'true' : 'false';
    };
    el.style.opacity = '1';
    addEventListener('pointermove', move);
    return () => removeEventListener('pointermove', move);
  }, []);
  return <div className="cursor" ref={ring} aria-hidden="true" />;
}
