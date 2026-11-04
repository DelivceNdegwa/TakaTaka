'use client';

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { canGeometry, canTexture, makeTrash, seeded } from './three/trash';
import { buildForest, leafTexture, type TreeSpec } from './three/trees';

// ---- the setting: grass, trees, haze, litter, pollen ----
const GATE_TREES: TreeSpec[] = [
  { x: -6.5, z: -6, scale: 0.55, kind: 'acacia', seed: 4 },
  { x: -10, z: -11, scale: 0.7, kind: 'broadleaf', seed: 10 },
  { x: 7, z: -7, scale: 0.6, kind: 'acacia', seed: 6 },
  { x: 11, z: -12, scale: 0.75, kind: 'broadleaf', seed: 14 },
  { x: 2.5, z: -14, scale: 0.5, kind: 'acacia', seed: 19 },
];

function Grass() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => { const g = new THREE.ConeGeometry(0.018, 0.2, 3, 1); g.translate(0, 0.1, 0); return g; }, []);
  const COUNT = 5000;
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const r = seeded(51);
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 11;
      d.position.set(Math.cos(a) * rad, -1.6, Math.sin(a) * rad * 0.8 + 1);
      d.rotation.set((r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.5);
      d.scale.set(1, 0.5 + r() * 0.8, 1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, c.set(['#5f9a48', '#6fae52', '#4f8a3c', '#86b865', '#7aa95a'][Math.floor(r() * 5)]));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[geo, undefined, COUNT]} receiveShadow><meshStandardMaterial roughness={0.9} /></instancedMesh>;
}

function GateTrees() {
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const [forest] = useState(() => buildForest(GATE_TREES.map((t) => ({ ...t, x: t.x, z: t.z }))));
  const [tex] = useState(() => leafTexture());
  const leafGeo = useMemo(() => { const g = new THREE.PlaneGeometry(1, 2); g.translate(0, 1, 0); return g; }, []);
  useEffect(() => {
    const m = leafRef.current;
    if (!m) return;
    forest.leaves.forEach((l, i) => { m.setMatrixAt(i, l.m); m.setColorAt(i, l.c); });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [forest]);
  return (
    <group position={[0, -1.1, 0]}>
      <mesh geometry={forest.wood} castShadow><meshStandardMaterial color="#5b4030" roughness={0.9} /></mesh>
      <instancedMesh ref={leafRef} args={[leafGeo, undefined, forest.leaves.length]} castShadow><meshStandardMaterial map={tex} alphaTest={0.5} side={THREE.DoubleSide} /></instancedMesh>
    </group>
  );
}

function Litter() {
  const [defs] = useState(() => makeTrash());
  const items = useMemo(() => {
    const r = seeded(61);
    return Array.from({ length: 14 }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return { d: defs[i % defs.length], tint: defs[i % defs.length].tints[Math.floor(r() * 3) % defs[i % defs.length].tints.length], pos: [side * (1.8 + r() * 4.5), -1.42, -1 + r() * 4.5] as [number, number, number], rot: [Math.PI / 2 + (r() - 0.5), r() * 6, (r() - 0.5) * 0.6] as [number, number, number], s: 0.55 + r() * 0.25 };
    });
  }, [defs]);
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} geometry={it.d.geometry} position={it.pos} rotation={it.rot} scale={it.s * it.d.size * 1.6} castShadow receiveShadow>
          <primitive object={(it.d.material as THREE.MeshStandardMaterial).clone()} attach="material" color={it.tint} />
        </mesh>
      ))}
    </group>
  );
}

function Pollen() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const r = seeded(71);
    const pts = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) { pts[i * 3] = (r() - 0.5) * 16; pts[i * 3 + 1] = -1.4 + r() * 5; pts[i * 3 + 2] = -6 + r() * 11; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.02;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.4) * 0.15;
  });
  return <points ref={ref} geometry={geo}><pointsMaterial size={0.045} color="#fff6d8" transparent opacity={0.85} depthWrite={false} /></points>;
}

function Haze() {
  const city = useMemo(() => {
    const r = seeded(33);
    return Array.from({ length: 30 }, () => ({ x: (r() - 0.5) * 50, z: -26 - r() * 8, h: 2 + r() * 9, w: 1.2 + r() * 2.2 }));
  }, []);
  return (
    <group>
      {city.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 1.6, b.z]}><boxGeometry args={[b.w, b.h, b.w]} /><meshStandardMaterial color="#d3dde0" roughness={1} /></mesh>
      ))}
      <group position={[3, -1.6, -30]}>
        <mesh position={[0, 5, 0]}><cylinderGeometry args={[0.8, 0.8, 10, 24]} /><meshStandardMaterial color="#d9d0c3" /></mesh>
        <mesh position={[0, 10.2, 0]}><cylinderGeometry args={[1.6, 1.1, 0.5, 32]} /><meshStandardMaterial color="#d3c7b6" /></mesh>
      </group>
    </group>
  );
}

// A recycling emblem and the TAKA name, printed on the bin
function emblem() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 26; g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    g.save(); g.translate(256, 220); g.rotate((k * Math.PI * 2) / 3);
    g.beginPath(); g.arc(0, 0, 120, -0.9, 0.55); g.stroke();
    g.beginPath(); g.moveTo(Math.cos(0.75) * 120, Math.sin(0.75) * 120); g.lineTo(Math.cos(0.4) * 165, Math.sin(0.4) * 165); g.lineTo(Math.cos(0.4) * 75, Math.sin(0.4) * 75); g.closePath(); g.fill();
    g.restore();
  }
  g.font = '800 64px "Inter Tight", system-ui, sans-serif'; g.textAlign = 'center';
  g.fillText('TAKA', 256, 460);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const REST = new THREE.Vector3(0.4, -1.3, 2.4);
const BIN = new THREE.Vector3(0, -1.6, -2.2);

// A green can lying on the grass and a bin to throw it into. Flick it in to enter.
function GateScene({ auto, onIn }: { auto: boolean; onIn: () => void }) {
  const can = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const geo = useMemo(() => canGeometry(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: canTexture(), color: '#1e9e4a', metalness: 0.85, roughness: 0.3 }), []);
  const drag = useRef<{ y: number } | null>(null);
  const flight = useRef<{ from: THREE.Vector3; t: number } | null>(null);
  const done = useRef(false);
  const [aim, setAim] = useState(false);
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const [emblemTex] = useState(() => emblem());

  const launch = () => {
    if (flight.current || done.current || !can.current) return;
    flight.current = { from: can.current.position.clone(), t: 0 };
  };
  useEffect(() => { if (auto) launch(); });

  useFrame((state, dt) => {
    const g = can.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const f = flight.current;
    if (f) {
      f.t = Math.min(1, f.t + dt * 1.3);
      target.copy(BIN).add(new THREE.Vector3(0, 1.4 - f.t * 0.9, 0));
      g.position.lerpVectors(f.from, target, f.t);
      g.position.y += Math.sin(f.t * Math.PI) * 2.4;
      g.rotation.x += dt * 9;
      if (f.t >= 1 && !done.current) { done.current = true; onIn(); }
    } else if (!drag.current) {
      // resting on the grass, rocking a little
      g.position.lerp(REST, 0.12);
      g.rotation.set(0, Math.sin(t * 0.8) * 0.25, Math.PI / 2 + Math.sin(t * 1.6) * 0.04);
    }
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.damp(lid.current.rotation.x, aim || f ? -1.2 : 0, 8, dt);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, 1.2 + state.pointer.x * 0.4, 2, dt);
    camera.lookAt(0, -0.4, 0);
  });

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (flight.current) return;
    e.stopPropagation();
    drag.current = { y: e.clientY };
    document.body.style.cursor = 'grabbing';
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current || !can.current) return;
    can.current.position.set(THREE.MathUtils.clamp(e.point.x, -4, 4), THREE.MathUtils.clamp(e.point.y, -1.3, 2), REST.z);
    setAim(drag.current.y - e.clientY > 30);
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    const flicked = drag.current.y - e.clientY > 30;
    drag.current = null;
    setAim(false);
    document.body.style.cursor = '';
    if (flicked) launch();
  };

  return (
    <>
      <fog attach="fog" args={['#e7efe4', 10, 40]} />
      <hemisphereLight args={['#ffffff', '#9fbf8a', 1.2]} />
      {/* a low, warm sun for long soft shadows */}
      <directionalLight position={[-6, 5, 4]} intensity={2.8} color="#fff1d6" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2.5} position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer intensity={1} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[5, 4, 1]} color="#dff3e4" />
      </Environment>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} receiveShadow>
        <circleGeometry args={[60, 64]} />
        <meshStandardMaterial color="#9cc27f" roughness={1} />
      </mesh>
      <Grass />
      <GateTrees />
      <Haze />
      <Litter />
      <Pollen />
      <ContactShadows position={[0, -1.59, 0]} opacity={0.4} scale={14} blur={2.6} far={4} />
      <group ref={can} position={REST.toArray()}
        onPointerDown={down}
        onPointerOver={() => { if (!drag.current) document.body.style.cursor = 'grab'; }}
        onPointerOut={() => { if (!drag.current) document.body.style.cursor = ''; }}>
        <mesh geometry={geo} material={mat} scale={0.75} castShadow />
        <mesh visible={false}><sphereGeometry args={[0.9, 8, 8]} /></mesh>
      </group>
      <mesh position={[0, 0, REST.z - 0.01]} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
        <planeGeometry args={[40, 30]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {/* a wheelie bin: tapered body, recessed panel, emblem, wheels, handle, hinged lid */}
      <group position={BIN.toArray()} rotation={[0, -0.18, 0]}>
        <RoundedBox args={[1.9, 2.2, 1.7]} radius={0.16} smoothness={5} position={[0, 1.15, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#1a8f43" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.4} />
        </RoundedBox>
        <RoundedBox args={[1.5, 1.6, 0.06]} radius={0.05} smoothness={3} position={[0, 1.05, 0.84]}>
          <meshStandardMaterial color="#157a38" roughness={0.6} />
        </RoundedBox>
        <mesh position={[0, 1.12, 0.875]}><planeGeometry args={[1.1, 1.1]} /><meshBasicMaterial map={emblemTex} transparent toneMapped={false} /></mesh>
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} position={[x, 0.18, -0.72]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.14, 24]} /><meshStandardMaterial color="#1c1c1c" roughness={0.8} /></mesh>
        ))}
        <mesh position={[0, 2.05, -0.95]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 1.5, 12]} /><meshStandardMaterial color="#146f33" /></mesh>
        <group ref={lid} position={[0, 2.27, -0.86]}>
          <RoundedBox args={[2.0, 0.14, 1.8]} radius={0.06} smoothness={4} position={[0, 0, 0.86]} castShadow>
            <meshPhysicalMaterial color="#178a3f" roughness={0.3} clearcoat={0.8} />
          </RoundedBox>
          <mesh position={[0, -0.02, 1.78]}><boxGeometry args={[0.7, 0.1, 0.08]} /><meshStandardMaterial color="#126a31" /></mesh>
        </group>
      </group>
    </>
  );
}

export function Gate() {
  const [stage, setStage] = useState<'gate' | 'out' | 'gone'>('gate');
  const [auto, setAuto] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('locked');
    (window as unknown as { __lenis?: { stop: () => void } }).__lenis?.stop();
  }, []);

  const enter = () => {
    if (stage !== 'gate') return;
    setStage('out');
    const el = root.current!;
    // the site opens out of the bin
    gsap.fromTo(el, { clipPath: 'circle(150% at 50% 55%)' }, {
      clipPath: 'circle(0% at 50% 55%)', duration: 1.2, ease: 'expo.inOut', delay: 0.25,
      onComplete: () => {
        setStage('gone');
        document.documentElement.classList.remove('locked');
        (window as unknown as { __lenis?: { start: () => void } }).__lenis?.start();
      },
    });
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter') setAuto(true); };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);

  if (stage === 'gone') return null;
  return (
    <div className="gate" ref={root} role="dialog" aria-modal="true" aria-label="Welcome to Taka Green">
      <div className="gate__scene" aria-hidden="true">
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [1.2, 0.2, 8], fov: 38 }} gl={{ alpha: true }}>
          <GateScene auto={auto} onIn={enter} />
        </Canvas>
      </div>
      <div className="gate__copy">
        <p className="gate__title" role="heading" aria-level={2}>Tupa taka <em>mahali pake.</em></p>
        <p>Grab the can and flick it into the bin to enter.</p>
      </div>
      <div className="gate__actions">
        <button type="button" onClick={() => setAuto(true)}>Throw it in for me</button>
      </div>
    </div>
  );
}
