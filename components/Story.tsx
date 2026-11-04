'use client';

import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';
import { RecycleScene } from './three/RecycleScene';

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  { at: 0.2, n: '01', title: 'Collected', text: 'Cans, bottles, cartons, newspaper and bags lifted off the ground and into the cage, not the drains.', right: true },
  { at: 0.47, n: '02', title: 'Sorted', text: 'Metal, plastic, cartons, paper, card and bags. Sorted by type, each one is raw material again.' },
  { at: 0.64, n: '03', title: 'Baled', text: 'Pressed into tight bales, ready for the recycler to turn into something new.' },
  { at: 0.87, n: '04', title: 'Green again', text: 'With the waste gone, the green takes the empty frame back. Nature takes it back.' },
];

export function Story() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [live, setLive] = useState(true);

  // Stop drawing the scene once it has scrolled away, so the next scene gets the GPU
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.8, onUpdate: (s) => { progress.current = s.progress; } },
        defaults: { ease: 'none' },
      });
      tl.to('.story__intro', { autoAlpha: 0, y: -40, filter: 'blur(6px)', duration: 0.06 }, 0.06);
      STAGES.forEach((s, i) => {
        const cap = `.cap[data-i="${i}"]`;
        tl.fromTo(cap, { autoAlpha: 0, y: 40, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.05 }, s.at - 0.04);
        if (i < STAGES.length - 1) tl.to(cap, { autoAlpha: 0, y: -40, filter: 'blur(8px)', duration: 0.05 }, s.at + 0.1);
        tl.to(`.meter span:nth-child(${i + 1}) i`, { scaleX: 1, duration: 0.15 }, s.at - 0.08);
      });
      tl.set({}, {}, 1);
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="story" ref={root} aria-label="From waste to value">
      <div className="story__stage">
        <div className="story__canvas" aria-hidden="true">
          <Canvas shadows frameloop={live ? 'always' : 'never'} dpr={[1, 1.5]} camera={{ position: [0, 3.6, 15], fov: 42 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
            <RecycleScene progress={progress} />
          </Canvas>
        </div>
        <div className="story__vignette" />
        <div className="story__intro">
          <h1>Taka ni <em>mali.</em></h1>
          <p>Waste is wealth when it is in the right place. Scroll to watch a city’s waste get collected, sorted and grown green again.</p>
          <span className="hint"><i aria-hidden="true" />Scroll to begin</span>
        </div>
        {STAGES.map((s, i) => (
          <div key={s.n} className={`cap${s.right ? ' cap--right' : ''}`} data-i={i}>
            <b aria-hidden="true">{s.n}</b>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </div>
        ))}
        <div className="meter" aria-hidden="true">
          {STAGES.map((s) => <span key={s.n}><i /></span>)}
        </div>
      </div>
    </section>
  );
}
