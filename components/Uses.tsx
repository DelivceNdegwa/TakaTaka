'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';

gsap.registerPlugin(ScrollTrigger);

// Examples of what recycled plastic is commonly made into
const USES = [
  { title: 'Lobby panels', text: 'Speckled wall and counter panels for hotels and offices, each one a few hundred bottles.', base: '#ffffff', tag: 'Hospitality' },
  { title: 'Paving blocks', text: 'Plastic mixed with sand and pressed into pavers for walkways and estates.', base: '#6b3f1d', tag: 'Construction' },
  { title: 'Furniture', text: 'Chairs, benches and tables that do not rot or rust, from parks to boardrooms.', base: '#1e9e4a', tag: 'Interiors' },
  { title: 'Fibre fill', text: 'Bottles spun into polyester fibre for upholstery, cushions and insulation.', base: '#a8774a', tag: 'Textiles' },
  { title: 'Compost', text: 'Food and garden waste, kept out of the plastic stream, turns into compost for urban farms.', base: '#3e2410', tag: 'Green waste' },
];

// A terrazzo slab, drawn once per card: the material the bottles become
function terrazzo(base: string, seed: number) {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 520;
  const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  const chips = ['#9fd0e6', '#2f8f4e', '#7a4a22', '#e8e6dc', '#d9452b', '#c8f24a', '#ece3cf'];
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 520; i++) {
    g.fillStyle = chips[Math.floor(r() * chips.length)];
    g.globalAlpha = 0.55 + r() * 0.45;
    const x = r() * c.width, y = r() * c.height, rad = 2 + r() * 9;
    g.beginPath();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r(); g.lineTo(x + Math.cos(a) * rad * (0.6 + r() * 0.6), y + Math.sin(a) * rad * (0.6 + r() * 0.6)); }
    g.fill();
  }
  return c.toDataURL('image/webp', 0.85);
}

export function Uses() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [skins, setSkins] = useState<string[]>([]);

  useEffect(() => { setSkins(USES.map((u, i) => terrazzo(u.base, 11 + i * 97))); }, []);

  useEffect(() => {
    const el = root.current, t = track.current;
    if (!el || !t) return;
    const ctx = gsap.context(() => {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.fromTo(el, { clipPath: 'inset(8% 10% 0% 10% round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: true } });
      }
      gsap.to(t, {
        x: () => -(t.scrollWidth - innerWidth),
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
      });
      gsap.utils.toArray<HTMLElement>('.use').forEach((card, i) => {
        gsap.fromTo(card, { rotateY: -14, z: -80 }, { rotateY: 8, z: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true }, delay: i * 0.02 });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="uses light" ref={root} id="uses" aria-labelledby="uses-title">
      <div className="uses__pin">
        <div className="uses__head">
          <h2 id="uses-title">Waste, <span>upgraded.</span></h2>
          <p>Sorted waste is a raw material. These are common examples of what it becomes once it reaches a recycler.</p>
        </div>
        <div className="track" ref={track} style={{ perspective: '1200px' }}>
          {USES.map((u, i) => (
            <article key={u.title} className="use" style={skins[i] ? { backgroundImage: `url(${skins[i]})` } : undefined}>
              <em>{u.tag}</em>
              <h3>{u.title}</h3>
              <p>{u.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
