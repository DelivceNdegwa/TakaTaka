'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cartonGeometry, cartonTexture } from './three/trash';

const LINKS = [
  { href: '#top', label: 'The story' },
  { href: '#problem', label: 'The flip side' },
  { href: '#play', label: 'Play' },
  { href: '#uses', label: 'What it becomes' },
  { href: '#join', label: 'Join in' },
];

function Turning() {
  const g = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => cartonGeometry(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: cartonTexture(), roughness: 0.5 }), []);
  useFrame((s) => { if (g.current) { g.current.rotation.y = s.clock.elapsedTime * 0.6; g.current.rotation.z = Math.sin(s.clock.elapsedTime) * 0.15; } });
  return <mesh ref={g} geometry={geo} material={mat} scale={2.2} />;
}

function go(href: string) {
  const el = document.querySelector(href);
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element | number, o?: object) => void } }).__lenis;
  if (!el) return;
  if (lenis) lenis.scrollTo(href === '#top' ? 0 : el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

export function Header() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = panel.current, s = shade.current, c = card.current;
    if (!p || !s || !c) return;
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    if (open) {
      lenis?.stop();
      // the page dims and blurs; the panel grows out of the corner; links rise one by one
      gsap.to(s, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
      gsap.fromTo(p, { clipPath: 'inset(0% 0% 100% 100% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 0.9, ease: 'expo.out' });
      gsap.fromTo(p.querySelectorAll('.menu__link'), { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.15 });
      gsap.fromTo(c, { autoAlpha: 0, y: 40, rotate: -4 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.9, ease: 'expo.out', delay: 0.25 });
    } else {
      gsap.to(s, { autoAlpha: 0, duration: 0.4 });
      gsap.to(p, { clipPath: 'inset(0% 0% 100% 100% round 24px)', duration: 0.6, ease: 'expo.inOut' });
      gsap.to(c, { autoAlpha: 0, y: 30, duration: 0.3 });
      lenis?.start();
    }
  }, [open]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);

  return (
    <>
      <header className="bar">
        <a className="logo" href="#top" onClick={(e) => { e.preventDefault(); go('#top'); }} aria-label="Taka Green home">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3c7 4 10 10 7 17-2 5-7 8-12 7 0-8 2-15 5-24Z" /><path d="M11 27c1-6 3-11 6-15" strokeWidth="1.8" strokeLinecap="round" /></svg>
          Taka Green
        </a>
        <div className="bar__right">
          <button type="button" className="chip chip--lime" aria-expanded={open} aria-controls="menu" onClick={() => setOpen((o) => !o)}>
            <span className="burger" data-open={open} aria-hidden="true"><i /><i /></span>{open ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>
      <div className="menu__shade" ref={shade} onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="menu__card" ref={card} aria-hidden="true">
        <div className="menu__card-art">
          {open && (
            <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 35 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[3, 4, 5]} intensity={2} />
              <Environment resolution={64} frames={1}><Lightformer intensity={1.4} position={[0, 3, 3]} scale={[5, 2, 1]} /></Environment>
              <Turning />
            </Canvas>
          )}
        </div>
        <p className="menu__card-words"><span>Collect.</span><span>Sort.</span><span>Reuse.</span></p>
      </div>
      <nav id="menu" className="menu__panel" ref={panel} aria-label="Menu" aria-hidden={!open} inert={!open}>
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}><span className="menu__mask"><a className="menu__link" href={l.href} onClick={(e) => { e.preventDefault(); setOpen(false); setTimeout(() => go(l.href), 350); }}>{l.label}</a></span></li>
          ))}
        </ul>
        <div className="menu__foot">
          <span>Taka Green, Nairobi</span>
          <span>Tupa taka mahali pake</span>
        </div>
      </nav>
    </>
  );
}
