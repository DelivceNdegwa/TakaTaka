'use client';

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { bottleGeometry, bottleTexture, canGeometry, canTexture, cardboardGeometry, cardboardTexture, cartonGeometry, cartonTexture, newsTexture, paperGeometry } from './trash';

export type Target = 'plastic' | 'organic' | 'paper';
export type Item = { name: string; bin: Target; kind: 'bottle' | 'can' | 'peel' | 'maize' | 'paper' | 'box' | 'carton' };

export const ITEMS: Item[] = [
  { name: 'Plastic bottle', bin: 'plastic', kind: 'bottle' },
  { name: 'Soda can', bin: 'plastic', kind: 'can' },
  { name: 'Banana peel', bin: 'organic', kind: 'peel' },
  { name: 'Maize cob', bin: 'organic', kind: 'maize' },
  { name: 'Crumpled newspaper', bin: 'paper', kind: 'paper' },
  { name: 'Flattened cardboard', bin: 'paper', kind: 'box' },
  { name: 'Milk carton', bin: 'paper', kind: 'carton' },
];

export const TARGETS: { id: Target; label: string; x: number; colour: string }[] = [
  { id: 'plastic', label: 'Plastics and metals', x: -3, colour: '#1e9e4a' },
  { id: 'organic', label: 'Organic', x: 0, colour: '#6b3f1d' },
  { id: 'paper', label: 'Paper and card', x: 3, colour: '#ffffff' },
];
const BIN_Z = -5;

// A peel with brown speckles, curled the way it lands
function peelTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e8c832'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(90,55,20,${0.3 + Math.random() * 0.5})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 5, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function ItemShape({ kind }: { kind: Item['kind'] }) {
  const parts = useMemo(() => {
    switch (kind) {
      case 'can': return { geo: canGeometry(), mat: new THREE.MeshStandardMaterial({ map: canTexture(), color: '#d42a1e', metalness: 0.85, roughness: 0.3 }), scale: 0.62 };
      case 'bottle': return { geo: bottleGeometry(), mat: new THREE.MeshPhysicalMaterial({ map: bottleTexture(), transparent: true, roughness: 0.06, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }), scale: 0.6 };
      case 'paper': return { geo: paperGeometry(), mat: new THREE.MeshStandardMaterial({ map: newsTexture(), roughness: 0.95, flatShading: true }), scale: 0.9 };
      case 'box': return { geo: cardboardGeometry(), mat: new THREE.MeshStandardMaterial({ map: cardboardTexture(), roughness: 0.95 }), scale: 0.8 };
      case 'carton': return { geo: cartonGeometry(), mat: new THREE.MeshStandardMaterial({ map: cartonTexture(), roughness: 0.5 }), scale: 0.7 };
      default: return null;
    }
  }, [kind]);
  const peel = useMemo(() => (kind === 'peel' ? new THREE.MeshStandardMaterial({ map: peelTexture(), roughness: 0.7, side: THREE.DoubleSide }) : null), [kind]);
  if (parts) return <mesh geometry={parts.geo} material={parts.mat} scale={parts.scale} castShadow />;
  if (kind === 'peel') {
    // three curling strips joined at the stem
    return (
      <group rotation={[0.3, 0, 0]}>
        {[0, 2.1, 4.2].map((a, i) => (
          <mesh key={i} rotation={[0, a, 0]} position={[Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12]} material={peel!} castShadow>
            <cylinderGeometry args={[0.32, 0.18, 0.9, 10, 6, true, -0.45, 0.9]} />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.05, 0.07, 0.22, 8]} /><meshStandardMaterial color="#5a4520" /></mesh>
      </group>
    );
  }
  // maize cob: kernels in rows, with dry husk leaves
  return (
    <group rotation={[0, 0, 0.5]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.75, 8, 18]} />
        <meshStandardMaterial color="#e9b63c" roughness={0.55} />
      </mesh>
      {Array.from({ length: 48 }, (_, i) => {
        const a = (i % 12) / 12 * Math.PI * 2, y = Math.floor(i / 12) * 0.2 - 0.3;
        return <mesh key={i} position={[Math.cos(a) * 0.2, y, Math.sin(a) * 0.2]}><sphereGeometry args={[0.055, 6, 5]} /><meshStandardMaterial color="#f2c64a" roughness={0.4} /></mesh>;
      })}
      {[0, 2, 4].map((a, i) => (
        <mesh key={i} rotation={[0, a, 0.25]} position={[0, -0.45, 0]}><cylinderGeometry args={[0.28, 0.1, 0.7, 8, 1, true, 0, 1.4]} /><meshStandardMaterial color="#c9b98a" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      ))}
    </group>
  );
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
      <Label text={label} position={[0, 2.55, 0]} />
    </group>
  );
}

// Labels drawn into the scene as sprites: crisp pills that always face the camera
function Label({ text, position, bg = '#ffffff', fg = '#111611' }: { text: string; position: [number, number, number]; bg?: string; fg?: string }) {
  const { tex, aspect } = useMemo(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('2d')!;
    const font = '600 44px "Instrument Sans", system-ui, sans-serif';
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 64;
    c.width = w; c.height = 84;
    g.font = font;
    g.fillStyle = bg;
    g.beginPath(); g.roundRect(0, 0, w, 84, 42); g.fill();
    g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(text, 32, 44);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { tex: t, aspect: w / 84 };
  }, [text, bg, fg]);
  return (
    <sprite position={position} scale={[0.36 * aspect, 0.36, 1]}>
      <spriteMaterial map={tex} transparent depthTest={false} toneMapped={false} />
    </sprite>
  );
}

type Flight = { from: THREE.Vector3; to: THREE.Vector3; t: number; target: Target | 'street' };

export type GameHandle = { throwTo: (t: Target | 'street') => void };

export const GameScene = forwardRef<GameHandle, {
  item: Item;
  busy: boolean;
  litter: number;
  onLand: (where: Target | 'street') => void;
  onThrow: () => void;
}>(function GameScene({ item, busy, litter, onLand, onThrow }, ref) {
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
    const to = target === 'street' ? new THREE.Vector3(x, 0.15, BIN_Z + 2.2) : new THREE.Vector3(TARGETS.find((t) => t.id === target)!.x, 1.0, BIN_Z);
    flight.current = { from: held.current!.position.clone(), to, t: 0, target };
  };

  useImperativeHandle(ref, () => ({ throwTo: (t) => launch(t, t === 'street' ? 0.6 : 0) }));

  const pickTarget = (x: number): Target | 'street' => {
    const near = TARGETS.reduce((best, t) => (Math.abs(t.x - x) < Math.abs(best.x - x) ? t : best));
    return Math.abs(near.x - x) < 1.0 ? near.id : 'street';
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
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.5} position={[0, 5, 5]} scale={[10, 3, 1]} />
        <Lightformer intensity={0.6} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#e8f5ea" />
      </Environment>
      <directionalLight position={[5, 10, 7]} intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-radius={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 60]} /><meshStandardMaterial color="#ffffff" roughness={0.9} /></mesh>
      {TARGETS.map((t) => <Bin key={t.id} x={t.x} colour={t.colour} label={t.label} open={hover === t.id ? 1 : 0} />)}
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
