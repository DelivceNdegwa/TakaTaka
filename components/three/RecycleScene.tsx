'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer } from '@react-three/drei';
import { makeTrash, seeded } from './trash';

// Real trash tells the whole story, driven by scroll progress (0..1):
// it falls into the billboard cage -> is sorted by type -> rises to spell TAKA -> moss and vines grow over it.
const COUNTS = [170, 150, 110, 230, 140, 130]; // can, bottle, carton, paper, cardboard, bag
const N = COUNTS.reduce((a, b) => a + b, 0);
const CAGE = { w: 6.4, h: 4, d: 1, y: 4.2 };
export const STAGES = { fall: [0.07, 0.36], sort: [0.4, 0.58], form: [0.6, 0.76], grow: [0.78, 0.97] } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// Points that fill the word TAKA, read from the display font on a 2D canvas
function wordPoints(count: number, family: string) {
  const c = document.createElement('canvas');
  c.width = 900; c.height = 300;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 260px ${family}`;
  g.fillText('TAKA', 450, 160);
  const img = g.getImageData(0, 0, c.width, c.height).data;
  const filled: [number, number][] = [];
  for (let y = 0; y < c.height; y += 4) for (let x = 0; x < c.width; x += 4) if (img[(y * c.width + x) * 4 + 3] > 128) filled.push([x, y]);
  const r = seeded(99);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const [x, y] = filled[Math.floor(r() * filled.length)] ?? [450, 150];
    out.push((x - 450) / 82 + 1.2, 4.6 - (y - 160) / 82, (r() - 0.5) * 0.5);
  }
  return { out, filled };
}
const toWorld = ([x, y]: [number, number]) => new THREE.Vector3((x - 450) / 82 + 1.2, 4.6 - (y - 160) / 82, 0.35);

function usePieceData() {
  return useMemo(() => {
    const r = seeded(7);
    const sky: number[] = [], cage: number[] = [], sorted: number[] = [], spin: number[] = [], delay: number[] = [], size: number[] = [], type: number[] = [];
    let idx = 0;
    COUNTS.forEach((n, t) => {
      for (let k = 0; k < n; k++, idx++) {
        type.push(t);
        const d = r();
        delay.push(d);
        cage.push((r() - 0.5) * (CAGE.w - 0.5), CAGE.y - CAGE.h / 2 + 0.2 + d * (CAGE.h - 0.4), (r() - 0.5) * (CAGE.d - 0.35));
        sky.push((r() - 0.5) * 12, 11 + r() * 9, (r() - 0.5) * 5 + 1);
        // sorting: one pile per kind of waste
        const col = t - (COUNTS.length - 1) / 2;
        sorted.push(col * 1.25 + (r() - 0.5) * 0.7, 0.15 + (k / n) * 3.6 * (1 - Math.abs(col) * 0.08) + (r() - 0.5) * 0.12, (r() - 0.5) * 0.9);
        spin.push(r() * 6, r() * 6, r() * 6, 0.4 + r());
        size.push(0.8 + r() * 0.45);
      }
    });
    return { sky, cage, sorted, spin, delay, size, type };
  }, []);
}

function Pieces({ progress, word }: { progress: MutableRefObject<number>; word: number[] | null }) {
  const data = usePieceData();
  const [defs] = useState(() => (typeof document === 'undefined' ? [] : makeTrash()));
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const offsets = useMemo(() => COUNTS.map((_, t) => COUNTS.slice(0, t).reduce((a, b) => a + b, 0)), []);
  const moss = useMemo(() => new THREE.Color('#3f8a3c'), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const base = useMemo(() => {
    const r = seeded(31);
    return defs.map((d, t) => Array.from({ length: COUNTS[t] }, () => new THREE.Color(d.tints[Math.floor(r() * d.tints.length)])));
  }, [defs]);
  const lastGrow = useRef(-1);

  // starting tints
  useEffect(() => {
    meshes.current.forEach((m, t) => {
      if (!m) return;
      base[t].forEach((c, j) => m.setColorAt(j, c));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, [base]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const p = progress.current;
    const time = clock.elapsedTime;
    const growP = span(p, STAGES.grow[0], STAGES.grow[1]);
    for (let t = 0; t < COUNTS.length; t++) {
      const m = meshes.current[t];
      if (!m) continue;
      const def = defs[t];
      for (let j = 0; j < COUNTS[t]; j++) {
        const i = offsets[t] + j;
        const i3 = i * 3;
        const d = data.delay[i];
        const fall = ease(span(p, STAGES.fall[0] + d * 0.24, STAGES.fall[0] + 0.07 + d * 0.24));
        const sort = ease(span(p, STAGES.sort[0] + d * 0.08, STAGES.sort[0] + 0.1 + d * 0.08));
        const form = ease(span(p, STAGES.form[0] + d * 0.06, STAGES.form[0] + 0.1 + d * 0.06));
        a.set(data.sky[i3], data.sky[i3 + 1], data.sky[i3 + 2]);
        b.set(data.cage[i3], data.cage[i3 + 1], data.cage[i3 + 2]);
        a.lerp(b, fall);
        b.set(data.sorted[i3], data.sorted[i3 + 1], data.sorted[i3 + 2]);
        a.lerp(b, sort);
        a.y += Math.sin(sort * Math.PI) * 1.4;
        if (word) {
          b.set(word[i3], word[i3 + 1], word[i3 + 2]);
          a.lerp(b, form);
          a.z += Math.sin(form * Math.PI) * 2;
        }
        dummy.position.copy(a);
        const s4 = i * 4;
        const loose = (1 - fall) + Math.sin(sort * Math.PI) + Math.sin(form * Math.PI);
        dummy.rotation.set(data.spin[s4] + time * data.spin[s4 + 3] * loose, data.spin[s4 + 1] + time * 0.7 * loose, data.spin[s4 + 2]);
        dummy.scale.setScalar(def.size * data.size[i] * (1 - form * 0.2));
        dummy.updateMatrix();
        m.setMatrixAt(j, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    // moss creeps over the letters: paper and card turn green first, from the bottom up
    if (Math.abs(growP - lastGrow.current) > 0.004 && word) {
      lastGrow.current = growP;
      meshes.current.forEach((m, t) => {
        if (!m) return;
        const soft = t >= 2 && t <= 4;
        for (let j = 0; j < COUNTS[t]; j++) {
          const i = offsets[t] + j;
          const y = word[i * 3 + 1];
          const k = clamp01((growP * 1.6 - (y - 2.6) / 4)) * (soft ? 0.85 : 0.35);
          tmp.copy(base[t][j]).lerp(moss, k);
          m.setColorAt(j, tmp);
        }
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      });
    }
  });

  return (
    <>
      {defs.map((d, t) => (
        <instancedMesh key={d.kind} ref={(el) => { meshes.current[t] = el; }} args={[d.geometry, d.material, COUNTS[t]]} castShadow={d.kind !== 'bottle' && d.kind !== 'bag'} receiveShadow frustumCulled={false} />
      ))}
    </>
  );
}

// Vines that climb through the letters, sprouting leaves as they grow
function Vines({ progress, filled }: { progress: MutableRefObject<number>; filled: [number, number][] | null }) {
  const leaves = useRef<THREE.InstancedMesh>(null);
  const tubes = useRef<THREE.Mesh[]>([]);
  const built = useMemo(() => {
    if (!filled?.length) return null;
    const r = seeded(77);
    const curves: THREE.CatmullRomCurve3[] = [];
    for (let v = 0; v < 26; v++) {
      // a walk through the filled letter pixels, from low to high
      let cur = filled[Math.floor(r() * filled.length)];
      const pts = [toWorld(cur)];
      for (let s = 0; s < 9; s++) {
        let best = cur, bestScore = -Infinity;
        for (let tries = 0; tries < 24; tries++) {
          const cand = filled[Math.floor(r() * filled.length)];
          const dx = cand[0] - cur[0], dy = cand[1] - cur[1];
          const dist = Math.hypot(dx, dy);
          if (dist < 12 || dist > 60) continue;
          const score = -dy * 0.6 - Math.abs(dist - 34) + r() * 10;
          if (score > bestScore) { bestScore = score; best = cand; }
        }
        cur = best;
        const w = toWorld(cur);
        w.z += (r() - 0.5) * 0.3;
        pts.push(w);
      }
      curves.push(new THREE.CatmullRomCurve3(pts));
    }
    const geos = curves.map((c) => new THREE.TubeGeometry(c, 90, 0.035 + r() * 0.03, 6, false));
    const leafSpots = curves.flatMap((c, ci) => Array.from({ length: 14 }, (_, k) => ({ c: ci, t: (k + 0.5 + r() * 0.5) / 14, rot: r() * Math.PI * 2, s: 0.12 + r() * 0.14 })));
    const leaf = new THREE.ShapeGeometry(new THREE.Shape().moveTo(0, 0).quadraticCurveTo(0.5, 0.4, 0, 1.2).quadraticCurveTo(-0.5, 0.4, 0, 0));
    return { curves, geos, leafSpots, leaf };
  }, [filled]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    if (!built) return;
    const g = span(progress.current, STAGES.grow[0], STAGES.grow[1]);
    built.geos.forEach((geo, i) => {
      const local = clamp01(g * 1.4 - (i % 5) * 0.06);
      geo.setDrawRange(0, Math.floor((geo.index?.count ?? 0) * local));
    });
    const m = leaves.current;
    if (!m) return;
    built.leafSpots.forEach((l, i) => {
      const local = clamp01(g * 1.4 - (l.c % 5) * 0.06);
      const grow = clamp01((local - l.t) * 8);
      const pt = built.curves[l.c].getPointAt(l.t);
      dummy.position.copy(pt);
      dummy.rotation.set(0.4, 0, l.rot);
      dummy.scale.setScalar(l.s * ease(grow) + 0.0001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  if (!built) return null;
  return (
    <group>
      {built.geos.map((geo, i) => (
        <mesh key={i} geometry={geo} ref={(el) => { if (el) tubes.current[i] = el; }} castShadow>
          <meshStandardMaterial color="#2f6e2e" roughness={0.7} />
        </mesh>
      ))}
      <instancedMesh ref={leaves} args={[built.leaf, undefined, built.leafSpots.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#4f9a45" roughness={0.6} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

function Trash({ progress }: { progress: MutableRefObject<number> }) {
  const [word, setWord] = useState<{ out: number[]; filled: [number, number][] } | null>(null);
  useEffect(() => {
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'sans-serif';
    document.fonts.load(`900 260px ${family}`).finally(() => setWord(wordPoints(N, family)));
  }, []);
  return (
    <>
      <Pieces progress={progress} word={word?.out ?? null} />
      <Vines progress={progress} filled={word?.filled ?? null} />
    </>
  );
}

// The steel mesh billboard on its pole, from the Tuna Taka Taka reference
function Billboard({ progress }: { progress: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const grid = useMemo(() => {
    const pts: number[] = [];
    const { w, h, d } = CAGE;
    const x0 = -w / 2, y0 = -h / 2;
    for (let i = 0; i <= 14; i++) { const x = x0 + (w * i) / 14; for (const z of [-d / 2, d / 2]) pts.push(x, y0, z, x, -y0, z); }
    for (let j = 0; j <= 9; j++) { const y = y0 + (h * j) / 9; for (const z of [-d / 2, d / 2]) pts.push(x0, y, z, -x0, y, z); }
    for (const x of [x0, -x0]) for (const y of [y0, -y0]) pts.push(x, y, -d / 2, x, y, d / 2);
    pts.push(x0, y0, d / 2, -x0, -y0, d / 2, x0, -y0, d / 2, 0, 0, d / 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const away = ease(span(progress.current, 0.4, 0.56));
    g.position.set(0, -away * 0.5, -away * 7);
    g.scale.setScalar(1 - away * 0.15);
  });
  return (
    <group ref={group}>
      <group position={[0, CAGE.y, 0]}>
        <lineSegments geometry={grid}>
          <lineBasicMaterial color="#3a3f3b" />
        </lineSegments>
        <mesh position={[-CAGE.w / 2 + 0.9, CAGE.h / 2 - 0.3, CAGE.d / 2 + 0.02]}>
          <boxGeometry args={[1.3, 0.36, 0.04]} />
          <meshStandardMaterial color="#1e9e4a" />
        </mesh>
      </group>
      <mesh position={[0, (CAGE.y - CAGE.h / 2) / 2 - 0.5, -0.1]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, CAGE.y - CAGE.h / 2 + 1, 16]} />
        <meshStandardMaterial color="#4f7d8c" roughness={0.45} metalness={0.3} />
      </mesh>
    </group>
  );
}

// Soft cloud sprites: the camera starts above them and descends through the mist
function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Clouds({ progress }: { progress: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const [tex] = useState(() => (typeof document === 'undefined' ? null : cloudTexture()));
  const puffs = useMemo(() => {
    const r = seeded(41);
    return Array.from({ length: 46 }, () => ({ x: (r() - 0.5) * 40, y: 9 + r() * 9, z: (r() - 0.5) * 30 - 2, s: 6 + r() * 10, spin: r() * Math.PI, o: 0.5 + r() * 0.4 }));
  }, []);
  useFrame(({ clock, camera }) => {
    const g = group.current;
    if (!g) return;
    g.position.x = Math.sin(clock.elapsedTime * 0.05) * 1.5;
    // clouds part and thin out once we are below them
    const thin = 1 - span(progress.current, 0.04, 0.16);
    g.children.forEach((m, i) => {
      m.quaternion.copy(camera.quaternion);
      ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = puffs[i].o * (0.25 + thin * 0.75);
    });
  });
  if (!tex) return null;
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={p.s}>
          <planeGeometry args={[1, 0.6]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} fog={false} opacity={p.o} />
        </mesh>
      ))}
    </group>
  );
}

// Nairobi from the National Park: grassland, acacias, the skyline and the Ngong Hills in the haze
function Park() {
  const city = useMemo(() => {
    const r = seeded(21);
    return Array.from({ length: 46 }, () => {
      const x = (r() - 0.5) * 46 - 4;
      return { x, z: -34 - r() * 10, h: 2 + r() * (Math.abs(x + 4) < 12 ? 13 : 6), w: 1.4 + r() * 2.4 };
    });
  }, []);
  const acacias = useMemo(() => [[-19, -12, 1.2], [-25, -18, 1.5], [9.5, -8, 1.1], [15, -16, 1.6], [-14, -28, 1], [21, -22, 1.3]] as const, []);
  return (
    <group>
      {city.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 0.5, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color="#cfd9dc" roughness={1} />
        </mesh>
      ))}
      <group position={[4, -0.5, -38]}>
        <mesh position={[0, 6, 0]}><cylinderGeometry args={[1, 1, 12, 24]} /><meshStandardMaterial color="#d6cdbf" roughness={1} /></mesh>
        <mesh position={[0, 12.3, 0]}><cylinderGeometry args={[1.9, 1.3, 0.6, 32]} /><meshStandardMaterial color="#cfc3b1" roughness={1} /></mesh>
        <mesh position={[0, 13.2, 0]}><coneGeometry args={[0.25, 1.4, 12]} /><meshStandardMaterial color="#cfc3b1" /></mesh>
      </group>
      {/* Ngong Hills: soft knuckles on the horizon */}
      {[-30, -20, -11, -3].map((x, i) => (
        <mesh key={i} position={[x - 14, -2, -60]} scale={[9 + i, 5 + (i % 2) * 2, 6]}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshStandardMaterial color="#b7cdb4" roughness={1} />
        </mesh>
      ))}
      {acacias.map(([x, z, k], i) => (
        <group key={i} position={[x, -0.5, z]} scale={k}>
          <mesh position={[0, 1.3, 0]} castShadow><cylinderGeometry args={[0.07, 0.12, 2.6, 10]} /><meshStandardMaterial color="#6b4a2c" roughness={0.9} /></mesh>
          {/* layered umbrella canopy: a few soft tiers, darker underneath */}
          {[[0, 2.75, 0, 2.2, 0.34, 1.6, '#3f8a3c'], [0.9, 2.95, 0.3, 1.4, 0.28, 1.1, '#4f9a45'], [-0.8, 2.9, -0.2, 1.3, 0.26, 1.0, '#47923f'], [0.1, 2.55, 0, 2.0, 0.16, 1.4, '#2f6e2e']].map(([x, y, z, sx, sy, sz, c], j) => (
            <mesh key={j} position={[x as number, y as number, z as number]} scale={[sx as number, sy as number, sz as number]} castShadow>
              <icosahedronGeometry args={[1, 3]} />
              <meshStandardMaterial color={c as string} roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[0.45, 2.2, 0]} rotation={[0, 0, -0.7]}><cylinderGeometry args={[0.04, 0.06, 1.1, 8]} /><meshStandardMaterial color="#6b4a2c" /></mesh>
          <mesh position={[-0.45, 2.2, 0]} rotation={[0, 0, 0.7]}><cylinderGeometry args={[0.04, 0.06, 1.1, 8]} /><meshStandardMaterial color="#6b4a2c" /></mesh>
        </group>
      ))}
    </group>
  );
}

function Rig({ progress }: { progress: MutableRefObject<number> }) {
  const { camera, pointer } = useThree();
  const to = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const p = progress.current;
    // descend from above the clouds into the park
    const descend = 1 - ease(span(p, 0, 0.14));
    const sortView = Math.sin(span(p, 0.4, 0.7) * Math.PI);
    const end = ease(span(p, 0.7, 0.95));
    const x = pointer.x * 0.8 + sortView * 2.2;
    const y = 4.2 + descend * 13 + pointer.y * 0.4 + sortView * 1.5 - end * 0.2;
    const z = 13 + descend * 4 - sortView * 1 - end * 1.5;
    camera.position.lerp(to.set(x, y, z), 0.07);
    camera.lookAt(0, 3.6 + descend * 6 - sortView * 1.4 + end * 0.6, 0);
  });
  return null;
}

export function RecycleScene({ progress }: { progress: MutableRefObject<number> }) {
  return (
    <>
      <fog attach="fog" args={['#eef4ec', 20, 70]} />
      <hemisphereLight args={['#ffffff', '#a9c49a', 1.5]} />
      <directionalLight position={[-7, 12, 8]} intensity={2.6} color="#fff6e6" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
      <directionalLight position={[6, 4, -6]} intensity={0.5} color="#e8f5ea" />
      {/* soft studio reflections for metal and plastic, generated, no image download */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 6, 4]} scale={[12, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#e8f5ea" />
        <Lightformer intensity={0.8} position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#fff2dc" />
        <Lightformer intensity={0.6} position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#a9c49a" />
      </Environment>
      <Rig progress={progress} />
      <Billboard progress={progress} />
      <Trash progress={progress} />
      <Park />
      <Clouds progress={progress} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[90, 64]} />
        <meshStandardMaterial color="#d3e4c5" roughness={1} />
      </mesh>
    </>
  );
}
