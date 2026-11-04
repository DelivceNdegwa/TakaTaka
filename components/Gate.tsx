'use client';

import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { crunch, setSound, thud } from './sound';
import { canGeometry, canTexture } from './three/trash';

const ROWS = ['RTYUIOPDKFJHLKWEQ', 'FUOTUPATAKAGIYLRS', 'YEVGMAHALIPAKEBRQ', 'RTIOBNMSDUAPYEGJR', 'FPOIMEUFOYDBZUALH'];
// which letters stay: TUPA TAKA on row 2, MAHALI PAKE on row 3
const KEEP: Record<number, [number, number]> = { 1: [3, 11], 2: [4, 14] };
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const el = root.current!;
    const cells = [...el.querySelectorAll<HTMLSpanElement>('.pre__c')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // scramble, then settle letter by letter on the real phrase
    const scramble = window.setInterval(() => {
      cells.forEach((c) => { if (!c.dataset.done) c.textContent = ABC[Math.floor(Math.random() * 26)]; });
    }, 70);
    const n = { v: 0 };
    const tl = gsap.timeline({ onComplete: onDone });
    tl.to(n, { v: 100, duration: reduce ? 0.3 : 2.2, ease: 'power2.inOut', onUpdate: () => setCount(Math.round(n.v)) }, 0);
    cells.forEach((c, i) => {
      tl.call(() => { c.dataset.done = '1'; c.textContent = c.dataset.ch!; }, [], 0.4 + (i % 17) * 0.06 + Math.random() * 0.5);
    });
    tl.call(() => clearInterval(scramble), [], 1.6);
    tl.to(el.querySelectorAll('.pre__c:not([data-keep])'), { opacity: 0.08, duration: 0.6, stagger: { amount: 0.4, from: 'random' } }, 1.7);
    tl.to(el, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 2.8);
    return () => { clearInterval(scramble); tl.kill(); };
  }, [onDone]);
  return (
    <div className="pre" ref={root} aria-hidden="true">
      <div className="pre__grid">
        {ROWS.map((row, r) => (
          <div key={r} className="pre__row">
            {row.split('').map((ch, i) => {
              const k = KEEP[r];
              const keep = k && i >= k[0] && i < k[1];
              return <span key={i} className="pre__c" data-ch={ch} data-keep={keep ? '' : undefined}>{ch}</span>;
            })}
          </div>
        ))}
      </div>
      <b className="pre__count">{count}</b>
    </div>
  );
}

// The hanging can on a string, and a bin below. Drag the can into the bin to enter.
function GateScene({ dropping, onIn }: { dropping: boolean; onIn: () => void }) {
  const can = useRef<THREE.Group>(null);
  const string = useRef<THREE.BufferGeometry>(null);
  const target = useMemo(() => new THREE.Vector3(0, 0.6, 0), []);
  const vel = useMemo(() => new THREE.Vector3(), []);
  const drag = useRef(false);
  const falling = useRef(false);
  const done = useRef(false);
  const geo = useMemo(() => canGeometry(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: canTexture(), color: '#1e9e4a', metalness: 0.85, roughness: 0.3 }), []);
  const BIN = { x: 0, y: -2.3 };

  useEffect(() => { if (dropping) { falling.current = true; target.set(BIN.x, BIN.y + 2, 0); } }, [dropping, target, BIN.x, BIN.y]);

  useFrame((state, dt) => {
    const g = can.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    if (falling.current) {
      // glide over the bin, then drop in
      if (Math.abs(g.position.x - BIN.x) > 0.05 || g.position.y > BIN.y + 1.9) {
        g.position.lerp(target, 0.12);
        if (g.position.distanceTo(target) < 0.08) target.set(BIN.x, BIN.y - 0.4, 0);
      } else {
        g.position.y -= dt * 7;
      }
      g.rotation.z += dt * 4;
      if (g.position.y < BIN.y + 0.2 && !done.current) { done.current = true; thud(); onIn(); }
    } else if (!drag.current) {
      // swing gently back to rest on its string
      const k = Math.min(dt, 0.05);
      const sway = Math.sin(t * 1.2) * 0.12;
      const px = g.position.x;
      g.position.x = THREE.MathUtils.damp(g.position.x, target.x + sway, 3, k);
      g.position.y = THREE.MathUtils.damp(g.position.y, target.y, 3, k);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, (g.position.x - px) * -8 - sway * 0.6, 5, k);
    }
    g.rotation.y = t * 0.4;
    const pos = string.current?.attributes.position as THREE.BufferAttribute | undefined;
    if (pos) { pos.setXYZ(1, g.position.x, g.position.y + 0.9, 0); pos.needsUpdate = true; }
  });

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current || !can.current) return;
    can.current.position.set(e.point.x, e.point.y, 0);
  };
  const up = () => {
    if (!drag.current || !can.current) return;
    drag.current = false;
    const p = can.current.position;
    if (Math.abs(p.x - BIN.x) < 1.2 && p.y < BIN.y + 2.2) { falling.current = true; target.set(BIN.x, BIN.y - 0.4, 0); }
  };

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[2, 2, 4]} intensity={25} color="#e8fff0" />
      <spotLight position={[0, 6, 4]} angle={0.45} penumbra={0.8} intensity={60} color="#fff3dd" castShadow />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={3} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer intensity={1.2} position={[4, 0, 3]} rotation-y={-Math.PI / 2} scale={[4, 4, 1]} />
        <Lightformer intensity={0.6} position={[-4, 0, 2]} rotation-y={Math.PI / 2} scale={[4, 4, 1]} color="#c8f2cf" />
      </Environment>
      <lineSegments>
        <bufferGeometry ref={string}>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 5, 0, 0, 1.1, 0]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#8a8f8a" />
      </lineSegments>
      <group ref={can} position={[0, 0.6, 0]}
        onPointerDown={(e) => { e.stopPropagation(); drag.current = true; crunch(); document.body.style.cursor = 'grabbing'; }}
        onPointerOver={() => { document.body.style.cursor = 'grab'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <mesh geometry={geo} material={mat} scale={1.5} castShadow />
        <mesh visible={false}><sphereGeometry args={[1.2, 8, 8]} /></mesh>
      </group>
      {/* catch pointer moves anywhere so the drag follows the hand */}
      <mesh position={[0, 0, -0.5]} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
        <planeGeometry args={[40, 30]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <group position={[BIN.x, BIN.y, 0]}>
        <RoundedBox args={[1.9, 1.5, 1.4]} radius={0.2} smoothness={5} position={[0, -0.2, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#1e9e4a" roughness={0.35} clearcoat={0.7} />
        </RoundedBox>
        <mesh position={[0, 0.56, 0]}><boxGeometry args={[1.5, 0.04, 1.05]} /><meshStandardMaterial color="#06140b" /></mesh>
      </group>
    </>
  );
}

export function Gate() {
  const [stage, setStage] = useState<'pre' | 'gate' | 'out' | 'gone'>('pre');
  const [dropping, setDropping] = useState(false);
  const [withSound, setWithSound] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('locked');
    (window as unknown as { __lenis?: { stop: () => void } }).__lenis?.stop();
  }, []);

  const enter = () => {
    if (stage !== 'gate') return;
    setStage('out');
    setSound(withSound);
    const el = root.current!;
    // the site opens out of the bin, like ink spreading
    gsap.fromTo(el, { clipPath: 'circle(150% at 50% 82%)' }, {
      clipPath: 'circle(0% at 50% 82%)', duration: 1.3, ease: 'expo.inOut', delay: 0.15,
      onComplete: () => {
        setStage('gone');
        document.documentElement.classList.remove('locked');
        (window as unknown as { __lenis?: { start: () => void } }).__lenis?.start();
      },
    });
  };

  useEffect(() => {
    if (stage !== 'gate') return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter') setDropping(true); };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [stage]);

  if (stage === 'gone') return null;
  return (
    <div className="gate" ref={root} role="dialog" aria-modal="true" aria-label="Welcome to Taka Green">
      {stage !== 'pre' && (
        <div className="gate__scene" aria-hidden="true">
          <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 40 }}>
            <GateScene dropping={dropping} onIn={enter} />
          </Canvas>
        </div>
      )}
      <div className="gate__copy" data-show={stage !== 'pre'}>
        <p className="gate__title" role="heading" aria-level={2}>Tupa taka <em>mahali pake.</em></p>
        <p>Drag the can into the bin to enter, or press Enter.</p>
      </div>
      <div className="gate__actions" data-show={stage !== 'pre'}>
        <button type="button" className={withSound ? 'is-on' : ''} onClick={() => { setWithSound(true); setDropping(true); }}>Enter with sound <i aria-hidden="true" /></button>
        <button type="button" className={!withSound ? 'is-on' : ''} onClick={() => { setWithSound(false); setDropping(true); }}>Enter quietly</button>
      </div>
      {stage === 'pre' && <Preloader onDone={() => setStage('gate')} />}
    </div>
  );
}
