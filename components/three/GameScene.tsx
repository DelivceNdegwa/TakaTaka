'use client';

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Html, RoundedBox } from '@react-three/drei';

export type Target = 'plastic' | 'organic' | 'paper' | 'river';
export type Item = { name: string; bin: Exclude<Target, 'river'>; kind: 'bottle' | 'can' | 'peel' | 'scraps' | 'paper' | 'box' };

export const ITEMS: Item[] = [
  { name: 'Plastic bottle', bin: 'plastic', kind: 'bottle' },
  { name: 'Soda can', bin: 'plastic', kind: 'can' },
  { name: 'Banana peel', bin: 'organic', kind: 'peel' },
  { name: 'Sukuma and food scraps', bin: 'organic', kind: 'scraps' },
  { name: 'Old newspaper', bin: 'paper', kind: 'paper' },
  { name: 'Cardboard box', bin: 'paper', kind: 'box' },
];

export const TARGETS: { id: Target; label: string; x: number; colour: string }[] = [
  { id: 'plastic', label: 'Plastics and metals', x: -4.2, colour: '#1e9e4a' },
  { id: 'organic', label: 'Organic', x: -1.4, colour: '#6b3f1d' },
  { id: 'paper', label: 'Paper and card', x: 1.4, colour: '#ffffff' },
  { id: 'river', label: 'The river', x: 4.6, colour: '#3a5a52' },
];
const BIN_Z = -5;

function ItemShape({ kind }: { kind: Item['kind'] }) {
  switch (kind) {
    case 'bottle':
      return (
        <group>
          <mesh castShadow><cylinderGeometry args={[0.22, 0.22, 0.8, 20]} /><meshStandardMaterial color="#9fd0e6" roughness={0.15} transparent opacity={0.85} /></mesh>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.1, 0.2, 0.22, 20]} /><meshStandardMaterial color="#9fd0e6" roughness={0.15} transparent opacity={0.85} /></mesh>
          <mesh position={[0, 0.66, 0]}><cylinderGeometry args={[0.1, 0.1, 0.1, 16]} /><meshStandardMaterial color="#2a5bd7" /></mesh>
        </group>
      );
    case 'can':
      return <mesh castShadow><cylinderGeometry args={[0.24, 0.24, 0.62, 24]} /><meshStandardMaterial color="#d9452b" metalness={0.8} roughness={0.25} /></mesh>;
    case 'peel':
      return <mesh castShadow rotation={[0, 0, 0.6]}><torusGeometry args={[0.35, 0.1, 10, 24, Math.PI]} /><meshStandardMaterial color="#e5c33a" roughness={0.7} /></mesh>;
    case 'scraps':
      return (
        <group>
          <mesh castShadow><icosahedronGeometry args={[0.28, 0]} /><meshStandardMaterial color="#4f7a3a" roughness={0.9} flatShading /></mesh>
          <mesh position={[0.25, -0.05, 0.1]} castShadow><icosahedronGeometry args={[0.18, 0]} /><meshStandardMaterial color="#7a4a22" roughness={0.9} flatShading /></mesh>
        </group>
      );
    case 'paper':
      return <mesh castShadow rotation={[0.3, 0.4, 0.1]}><boxGeometry args={[0.8, 0.06, 0.6]} /><meshStandardMaterial color="#e8e2d2" roughness={0.95} /></mesh>;
    case 'box':
      return <mesh castShadow><boxGeometry args={[0.6, 0.45, 0.5]} /><meshStandardMaterial color="#b8895a" roughness={0.9} /></mesh>;
  }
}

function Bin({ x, colour, label, open }: { x: number; colour: string; label: string; open: number }) {
  const lid = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.damp(lid.current.rotation.x, -open * 1.1, 8, dt);
  });
  const white = colour === '#ffffff';
  return (
    <group position={[x, 0, BIN_Z]} name={label}>
      <RoundedBox args={[1.5, 1.9, 1.3]} radius={0.22} smoothness={5} position={[0, 0.95, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color={colour} roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.25} />
      </RoundedBox>
      {/* a dark slot band, like a modern sorting station */}
      <mesh position={[0, 1.45, 0.66]}><boxGeometry args={[1.0, 0.12, 0.02]} /><meshStandardMaterial color={white ? '#1a1a1a' : '#ffffff'} /></mesh>
      <group ref={lid} position={[0, 1.92, -0.62]}>
        <RoundedBox args={[1.56, 0.14, 1.36]} radius={0.06} smoothness={4} position={[0, 0, 0.62]} castShadow>
          <meshPhysicalMaterial color={white ? '#1a1a1a' : colour} roughness={0.3} clearcoat={0.8} />
        </RoundedBox>
      </group>
      <Html position={[0, 2.55, 0]} center className="tag">{label}</Html>
    </group>
  );
}

// Nairobi River: dirtier with every piece that lands in it
function River({ dirt }: { dirt: number }) {
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  const clean = useMemo(() => new THREE.Color('#1b9ab8'), []);
  const dirty = useMemo(() => new THREE.Color('#5a4a2c'), []);
  useFrame(() => { mat.current?.color.copy(clean).lerp(dirty, Math.min(1, dirt)); });
  return (
    <group position={[TARGETS[3].x, 0, BIN_Z]}>
      {/* a glossy water channel set into the floor, running off into the distance */}
      <mesh position={[0, 0.04, -3]} receiveShadow>
        <boxGeometry args={[2.4, 0.08, 14]} />
        <meshPhysicalMaterial ref={mat} color="#1b9ab8" roughness={0.05} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      <mesh position={[-1.3, 0.1, -3]}><boxGeometry args={[0.2, 0.2, 14]} /><meshStandardMaterial color="#f2f2f2" /></mesh>
      <mesh position={[1.3, 0.1, -3]}><boxGeometry args={[0.2, 0.2, 14]} /><meshStandardMaterial color="#f2f2f2" /></mesh>
      <Html position={[0, 0.7, 0.5]} center className="tag tag--river">Nairobi River</Html>
    </group>
  );
}

type Flight = { from: THREE.Vector3; to: THREE.Vector3; t: number; target: Target | 'street' };

export type GameHandle = { throwTo: (t: Target) => void };

export const GameScene = forwardRef<GameHandle, {
  item: Item;
  busy: boolean;
  dirt: number;
  litter: number;
  onLand: (where: Target | 'street') => void;
  onThrow: () => void;
}>(function GameScene({ item, busy, dirt, litter, onLand, onThrow }, ref) {
  const held = useRef<THREE.Group>(null);
  const flight = useRef<Flight | null>(null);
  const drag = useRef<{ x: number; y: number; t: number; sx: number; sy: number } | null>(null);
  const aim = useRef(0);
  const [hover, setHover] = useState<Target | null>(null);
  const { size, camera } = useThree();
  const rest = useMemo(() => new THREE.Vector3(0, 1.2, 3), []);
  const litterSpots = useMemo(() => Array.from({ length: 30 }, (_, i) => [((i * 37) % 11) - 5.5, 0.08, BIN_Z + 1.6 + ((i * 53) % 7) * 0.35] as const), []);

  const launch = (target: Target | 'street', x: number) => {
    if (flight.current || busy) return;
    onThrow();
    const to = target === 'street' ? new THREE.Vector3(x, 0.15, BIN_Z + 2.2) : new THREE.Vector3(TARGETS.find((t) => t.id === target)!.x, target === 'river' ? 0.1 : 1.0, BIN_Z);
    flight.current = { from: held.current!.position.clone(), to, t: 0, target };
  };

  useImperativeHandle(ref, () => ({ throwTo: (t) => launch(t, 0) }));

  const pickTarget = (x: number): Target | 'street' => {
    const near = TARGETS.reduce((best, t) => (Math.abs(t.x - x) < Math.abs(best.x - x) ? t : best));
    return Math.abs(near.x - x) < (near.id === 'river' ? 1.4 : 0.9) ? near.id : 'street';
  };

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (flight.current || busy) return;
    e.stopPropagation();
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), sx: e.clientX, sy: e.clientY };
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current || !held.current) return;
    const dx = (e.clientX - drag.current.sx) / size.width;
    const dy = (e.clientY - drag.current.sy) / size.height;
    held.current.position.set(dx * 9, rest.y - dy * 3, rest.z + Math.min(0, dy) * 2);
    aim.current = dx * 9;
    const h = pickTarget(aim.current);
    setHover(h === 'street' ? null : h);
    drag.current.x = e.clientX; drag.current.y = e.clientY; drag.current.t = performance.now();
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    const flung = drag.current.sy - e.clientY > 30;
    drag.current = null;
    setHover(null);
    if (!flung) { held.current?.position.copy(rest); return; }
    const x = aim.current;
    launch(pickTarget(x), x);
  };

  useFrame((state, dt) => {
    const g = held.current;
    if (!g) return;
    const f = flight.current;
    if (f) {
      f.t = Math.min(1, f.t + dt * 1.5);
      g.position.lerpVectors(f.from, f.to, f.t);
      g.position.y += Math.sin(f.t * Math.PI) * 3;
      g.rotation.x += dt * 8; g.rotation.z += dt * 5;
      g.scale.setScalar(1 - f.t * 0.35);
      if (f.t >= 1) {
        flight.current = null;
        onLand(f.target);
        g.position.copy(rest); g.rotation.set(0, 0, 0); g.scale.setScalar(1);
      }
    } else if (!drag.current) {
      g.position.y = rest.y + Math.sin(state.clock.elapsedTime * 2) * 0.08;
      g.rotation.y += dt * 0.6;
    }
    camera.lookAt(0, 0.8, -1);
  });

  return (
    <>
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', 14, 32]} />
      <hemisphereLight args={['#ffffff', '#e6e6e6', 1.5]} />
      <directionalLight position={[5, 10, 7]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-radius={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 60]} /><meshStandardMaterial color="#ffffff" roughness={0.9} /></mesh>
      {TARGETS.slice(0, 3).map((t) => <Bin key={t.id} x={t.x} colour={t.colour} label={t.label} open={hover === t.id ? 1 : 0} />)}
      <River dirt={dirt} />
      {litterSpots.slice(0, litter).map((p, i) => (
        <mesh key={i} position={p as unknown as [number, number, number]} rotation={[0, i, 0.3]} castShadow><boxGeometry args={[0.3, 0.08, 0.2]} /><meshStandardMaterial color={['#9fd0e6', '#d9452b', '#e8e2d2', '#e5c33a'][i % 4]} /></mesh>
      ))}
      <group ref={held} position={rest} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <ItemShape kind={item.kind} />
        {/* a larger invisible handle so the piece is easy to grab on a phone */}
        <mesh visible={false}><sphereGeometry args={[0.9, 8, 8]} /></mesh>
      </group>
    </>
  );
});
