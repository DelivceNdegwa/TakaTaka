'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from 'three/examples/fonts/helvetiker_bold.typeface.json';
import { makeTrash, seeded } from './trash';
import { buildForest, leafTexture, type TreeSpec } from './trees';

// The story, driven by scroll progress (0..1):
// trash lies inside steel TAKA letters on the ground -> flows into the rotating billboard ->
// is sorted into heaps -> pressed into bales -> vines and moss claim the empty TAKA frames.
const COUNTS = [150, 130, 100, 200, 120, 110]; // can, bottle, carton, paper, cardboard, bag
const BB = { z: -3.2, y: 5.6, w: 6.4, h: 3.6, d: 1 };
const LETTERS = { z: 2.2, size: 3.1, depth: 1.1 };
export const STAGES = { lift: [0.06, 0.34], sort: [0.4, 0.55], bale: [0.58, 0.7], grow: [0.76, 0.97] } as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
// the billboard turns once as it fills, then settles facing the camera
const billboardAngle = (p: number) => ease(span(p, 0.04, 0.42)) * Math.PI * 2;

// ---------- the steel TAKA letters ----------
function inPoly(p: THREE.Vector2, poly: THREE.Vector2[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function useLetters() {
  return useMemo(() => {
    const font = new Font(fontJson as never);
    const geo = new TextGeometry('TAKA', { font, size: LETTERS.size, depth: LETTERS.depth, curveSegments: 6, bevelEnabled: false });
    geo.computeBoundingBox();
    // copy the bounds first: translate() updates the geometry's own bounding box
    const bb = geo.boundingBox!.clone();
    const off = new THREE.Vector3(-(bb.max.x + bb.min.x) / 2, -0.5 - bb.min.y, LETTERS.z - LETTERS.depth / 2);
    geo.translate(off.x, off.y, off.z);
    // 2D outlines, for sampling points inside the letters
    const shapes = font.generateShapes('TAKA', LETTERS.size).map((s) => ({
      outer: s.getPoints(8).map((p) => new THREE.Vector2(p.x + off.x, p.y + off.y)),
      holes: s.holes.map((h) => h.getPoints(8).map((p) => new THREE.Vector2(p.x + off.x, p.y + off.y))),
    }));
    const inside = (pt: THREE.Vector2) => shapes.some((s) => inPoly(pt, s.outer) && !s.holes.some((h) => inPoly(pt, h)));
    const box = { minX: bb.min.x + off.x, maxX: bb.max.x + off.x, minY: bb.min.y + off.y, maxY: bb.max.y + off.y };
    return { geo, edges: new THREE.EdgesGeometry(geo, 25), inside, box };
  }, []);
}
type LettersData = ReturnType<typeof useLetters>;

// A wire-mesh texture, like the billboard's steel grid
function meshTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 4); g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3.2, 3.2);
  return t;
}

function Letters({ progress, letters }: { progress: MutableRefObject<number>; letters: LettersData }) {
  const panel = useRef<THREE.MeshStandardMaterial>(null);
  const edge = useRef<THREE.LineBasicMaterial>(null);
  const [alpha] = useState(() => (typeof document === 'undefined' ? null : meshTexture()));
  const steel = useMemo(() => new THREE.Color('#3a3f3b'), []);
  const moss = useMemo(() => new THREE.Color('#3f8a3c'), []);
  useFrame(() => {
    const g = ease(span(progress.current, STAGES.grow[0], STAGES.grow[1]));
    panel.current?.color.copy(steel).lerp(moss, g * 0.9);
    edge.current?.color.copy(steel).lerp(moss, g * 0.7);
  });
  return (
    <group>
      <mesh geometry={letters.geo} castShadow receiveShadow>
        <meshStandardMaterial ref={panel} color="#3a3f3b" alphaMap={alpha} alphaTest={0.5} transparent side={THREE.DoubleSide} metalness={0.5} roughness={0.5} />
      </mesh>
      <lineSegments geometry={letters.edges}>
        <lineBasicMaterial ref={edge} color="#3a3f3b" />
      </lineSegments>
    </group>
  );
}

// ---------- trash ----------
function usePieceData(letters: LettersData) {
  return useMemo(() => {
    const r = seeded(7);
    const start: number[] = [], cage: number[] = [], heap: number[] = [], bale: number[] = [], spin: number[] = [], delay: number[] = [], size: number[] = [];
    const pt = new THREE.Vector2();
    COUNTS.forEach((n, t) => {
      const hx = (t - (COUNTS.length - 1) / 2) * 2.1;
      const side = Math.ceil(Math.cbrt(n));
      for (let k = 0; k < n; k++) {
        // inside a letter
        let tries = 0;
        do { pt.set(letters.box.minX + r() * (letters.box.maxX - letters.box.minX), letters.box.minY + r() * (letters.box.maxY - letters.box.minY)); tries++; } while (!letters.inside(pt) && tries < 60);
        start.push(pt.x, pt.y, LETTERS.z + (r() - 0.5) * (LETTERS.depth - 0.3));
        const d = r();
        delay.push(d);
        cage.push((r() - 0.5) * (BB.w - 0.5), -BB.h / 2 + 0.2 + d * (BB.h - 0.4), (r() - 0.5) * (BB.d - 0.35));
        // a heap per kind, in front of the letters
        const a = r() * Math.PI * 2, h = r(), rad = 0.95 * Math.sqrt(r()) * (1 - h * 0.85);
        heap.push(hx + Math.cos(a) * rad, -0.4 + h * 1.4, 6.2 + Math.sin(a) * rad * 0.8);
        // pressed into a cube bale
        const ix = k % side, iy = Math.floor(k / side) % side, iz = Math.floor(k / (side * side));
        const cell = 1.15 / side;
        bale.push(hx - 0.575 + (ix + 0.5) * cell, -0.5 + (iy + 0.5) * cell, 6.2 - 0.575 + (iz + 0.5) * cell);
        spin.push(r() * 6, r() * 6, r() * 6, 0.4 + r());
        size.push(0.8 + r() * 0.4);
      }
    });
    return { start, cage, heap, bale, spin, delay, size };
  }, [letters]);
}

function Pieces({ progress, letters }: { progress: MutableRefObject<number>; letters: LettersData }) {
  const data = usePieceData(letters);
  const [defs] = useState(() => (typeof document === 'undefined' ? [] : makeTrash()));
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const offsets = useMemo(() => COUNTS.map((_, t) => COUNTS.slice(0, t).reduce((a, b) => a + b, 0)), []);
  const base = useMemo(() => {
    const r = seeded(31);
    return defs.map((d, t) => Array.from({ length: COUNTS[t] }, () => new THREE.Color(d.tints[Math.floor(r() * d.tints.length)])));
  }, [defs]);
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
    const ang = billboardAngle(p);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let t = 0; t < COUNTS.length; t++) {
      const m = meshes.current[t];
      if (!m) continue;
      const def = defs[t];
      for (let j = 0; j < COUNTS[t]; j++) {
        const i = offsets[t] + j;
        const i3 = i * 3;
        const d = data.delay[i];
        const lift = ease(span(p, STAGES.lift[0] + d * 0.2, STAGES.lift[0] + 0.08 + d * 0.2));
        const sort = ease(span(p, STAGES.sort[0] + d * 0.06, STAGES.sort[0] + 0.09 + d * 0.06));
        const bale = ease(span(p, STAGES.bale[0] + d * 0.04, STAGES.bale[0] + 0.08 + d * 0.04));
        a.set(data.start[i3], data.start[i3 + 1], data.start[i3 + 2]);
        // into the turning billboard: its local cage spot, rotated with it
        const lx = data.cage[i3], ly = data.cage[i3 + 1], lz = data.cage[i3 + 2];
        b.set(lx * ca + lz * sa, BB.y + ly, BB.z - lx * sa + lz * ca);
        a.lerp(b, lift);
        a.y += Math.sin(lift * Math.PI) * 2.2;
        b.set(data.heap[i3], data.heap[i3 + 1], data.heap[i3 + 2]);
        a.lerp(b, sort);
        a.y += Math.sin(sort * Math.PI) * 1.6;
        b.set(data.bale[i3], data.bale[i3 + 1], data.bale[i3 + 2]);
        a.lerp(b, bale);
        dummy.position.copy(a);
        const s4 = i * 4;
        const loose = Math.sin(lift * Math.PI) + Math.sin(sort * Math.PI);
        dummy.rotation.set(data.spin[s4] + time * data.spin[s4 + 3] * loose, data.spin[s4 + 1] + ang * lift * (1 - sort) + time * 0.6 * loose, data.spin[s4 + 2] * (1 - bale * 0.8));
        dummy.scale.setScalar(def.size * data.size[i] * (1 - bale * 0.3));
        dummy.updateMatrix();
        m.setMatrixAt(j, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
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

// ---------- vines that climb the empty letters ----------
function Vines({ progress, letters }: { progress: MutableRefObject<number>; letters: LettersData }) {
  const leaves = useRef<THREE.InstancedMesh>(null);
  const built = useMemo(() => {
    const r = seeded(77);
    const pts: THREE.Vector2[] = [];
    const v = new THREE.Vector2();
    for (let i = 0; i < 2400; i++) {
      v.set(letters.box.minX + r() * (letters.box.maxX - letters.box.minX), letters.box.minY + r() * (letters.box.maxY - letters.box.minY));
      if (letters.inside(v)) pts.push(v.clone());
    }
    const front = LETTERS.z + LETTERS.depth / 2 + 0.06;
    const low = pts.filter((p) => p.y < letters.box.minY + 0.6);
    const curves: THREE.CatmullRomCurve3[] = [];
    for (let c = 0; c < 22; c++) {
      // start low, then climb through the letter towards the top
      let cur = low[Math.floor(r() * low.length)] ?? pts[0];
      const path = [new THREE.Vector3(cur.x, cur.y - 0.1, front)];
      for (let s = 0; s < 8; s++) {
        let best = cur, score = -Infinity;
        for (let k = 0; k < 30; k++) {
          const cand = pts[Math.floor(r() * pts.length)];
          const dist = cand.distanceTo(cur);
          if (dist < 0.15 || dist > 0.7) continue;
          const sc = (cand.y - cur.y) * 1.5 - Math.abs(dist - 0.4) + r() * 0.3;
          if (sc > score) { score = sc; best = cand; }
        }
        cur = best;
        path.push(new THREE.Vector3(cur.x, cur.y, front + (r() - 0.5) * 0.12));
      }
      curves.push(new THREE.CatmullRomCurve3(path));
    }
    const geos = curves.map((c) => new THREE.TubeGeometry(c, 80, 0.035 + r() * 0.025, 6, false));
    const spots = curves.flatMap((_, ci) => Array.from({ length: 16 }, (_, k) => ({ c: ci, t: (k + 0.4 + r() * 0.6) / 16, rot: r() * Math.PI * 2, tilt: r() - 0.5, s: 0.12 + r() * 0.12 })));
    const leaf = new THREE.ShapeGeometry(new THREE.Shape().moveTo(0, 0).quadraticCurveTo(0.5, 0.4, 0, 1.2).quadraticCurveTo(-0.5, 0.4, 0, 0));
    return { curves, geos, spots, leaf };
  }, [letters]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const g = span(progress.current, STAGES.grow[0], STAGES.grow[1]);
    built.geos.forEach((geo, i) => geo.setDrawRange(0, Math.floor((geo.index?.count ?? 0) * clamp01(g * 1.35 - (i % 5) * 0.06))));
    const m = leaves.current;
    if (!m) return;
    built.spots.forEach((l, i) => {
      const local = clamp01(g * 1.35 - (l.c % 5) * 0.06);
      const k = ease(clamp01((local - l.t) * 8));
      dummy.position.copy(built.curves[l.c].getPointAt(l.t));
      dummy.rotation.set(0.3 + l.tilt, l.tilt, l.rot);
      dummy.scale.setScalar(l.s * k + 0.0001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      {built.geos.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow>
          <meshStandardMaterial color="#2f6e2e" roughness={0.7} />
        </mesh>
      ))}
      <instancedMesh ref={leaves} args={[built.leaf, undefined, built.spots.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#4f9a45" roughness={0.6} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

// ---------- the rotating billboard ----------
function Billboard({ progress }: { progress: MutableRefObject<number> }) {
  const head = useRef<THREE.Group>(null);
  const grid = useMemo(() => {
    const pts: number[] = [];
    const { w, h, d } = BB;
    const x0 = -w / 2, y0 = -h / 2;
    for (let i = 0; i <= 14; i++) { const x = x0 + (w * i) / 14; for (const z of [-d / 2, d / 2]) pts.push(x, y0, z, x, -y0, z); }
    for (let j = 0; j <= 8; j++) { const y = y0 + (h * j) / 8; for (const z of [-d / 2, d / 2]) pts.push(x0, y, z, -x0, y, z); }
    for (const x of [x0, -x0]) for (const y of [y0, -y0]) pts.push(x, y, -d / 2, x, y, d / 2);
    pts.push(x0, y0, d / 2, -x0, -y0, d / 2, x0, -y0, d / 2, 0, 0, d / 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame(() => { if (head.current) head.current.rotation.y = billboardAngle(progress.current); });
  return (
    <group position={[0, 0, BB.z]}>
      <group ref={head} position={[0, BB.y, 0]}>
        <lineSegments geometry={grid}><lineBasicMaterial color="#3a3f3b" /></lineSegments>
        <mesh position={[-BB.w / 2 + 0.9, BB.h / 2 - 0.3, BB.d / 2 + 0.02]}>
          <boxGeometry args={[1.3, 0.36, 0.04]} />
          <meshStandardMaterial color="#1e9e4a" />
        </mesh>
      </group>
      <mesh position={[0, (BB.y - BB.h / 2) / 2 - 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, BB.y - BB.h / 2 + 1, 16]} />
        <meshStandardMaterial color="#4f7d8c" roughness={0.45} metalness={0.3} />
      </mesh>
    </group>
  );
}

// ---------- the park: forest, skyline, hills, clouds ----------
const TREES: TreeSpec[] = [
  // about half the height of the TAKA letters
  { x: -11, z: -2, scale: 0.42, kind: 'acacia', seed: 3 },
  { x: -15, z: -8, scale: 0.5, kind: 'broadleaf', seed: 8 },
  { x: -8.5, z: -11, scale: 0.4, kind: 'acacia', seed: 12 },
  { x: 10.5, z: -3, scale: 0.42, kind: 'acacia', seed: 5 },
  { x: 14.5, z: -9, scale: 0.52, kind: 'broadleaf', seed: 9 },
  { x: 19, z: -14, scale: 0.46, kind: 'acacia', seed: 15 },
  { x: 7, z: -15, scale: 0.4, kind: 'broadleaf', seed: 21 },
  { x: -20, z: -16, scale: 0.48, kind: 'acacia', seed: 27 },
];

function Forest() {
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const [forest] = useState(() => (typeof document === 'undefined' ? null : buildForest(TREES)));
  const [leafTex] = useState(() => (typeof document === 'undefined' ? null : leafTexture()));
  const leafGeo = useMemo(() => { const g = new THREE.PlaneGeometry(1, 2); g.translate(0, 1, 0); return g; }, []);
  useEffect(() => {
    const m = leafRef.current;
    if (!m || !forest) return;
    forest.leaves.forEach((l, i) => { m.setMatrixAt(i, l.m); m.setColorAt(i, l.c); });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [forest]);
  if (!forest || !leafTex) return null;
  return (
    <group>
      <mesh geometry={forest.wood} castShadow receiveShadow>
        <meshStandardMaterial color="#5b4030" roughness={0.9} />
      </mesh>
      <instancedMesh ref={leafRef} args={[leafGeo, undefined, forest.leaves.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial map={leafTex} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.5)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function Clouds() {
  const group = useRef<THREE.Group>(null);
  const [tex] = useState(() => (typeof document === 'undefined' ? null : cloudTexture()));
  const puffs = useMemo(() => { const r = seeded(41); return Array.from({ length: 26 }, () => ({ x: (r() - 0.5) * 90, y: 16 + r() * 10, z: -30 - r() * 30, s: 10 + r() * 14, o: 0.5 + r() * 0.4 })); }, []);
  useFrame(({ clock, camera }) => {
    const g = group.current;
    if (!g) return;
    g.position.x = Math.sin(clock.elapsedTime * 0.03) * 4;
    g.children.forEach((m) => m.quaternion.copy(camera.quaternion));
  });
  if (!tex) return null;
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={p.s}>
          <planeGeometry args={[1, 0.55]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} fog={false} opacity={p.o} />
        </mesh>
      ))}
    </group>
  );
}

function Park() {
  const city = useMemo(() => {
    const r = seeded(21);
    return Array.from({ length: 46 }, () => { const x = (r() - 0.5) * 46 - 4; return { x, z: -34 - r() * 10, h: 2 + r() * (Math.abs(x + 4) < 12 ? 13 : 6), w: 1.4 + r() * 2.4 }; });
  }, []);
  return (
    <group>
      {city.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 0.5, b.z]}><boxGeometry args={[b.w, b.h, b.w]} /><meshStandardMaterial color="#cfd9dc" roughness={1} /></mesh>
      ))}
      <group position={[4, -0.5, -38]}>
        <mesh position={[0, 6, 0]}><cylinderGeometry args={[1, 1, 12, 24]} /><meshStandardMaterial color="#d6cdbf" roughness={1} /></mesh>
        <mesh position={[0, 12.3, 0]}><cylinderGeometry args={[1.9, 1.3, 0.6, 32]} /><meshStandardMaterial color="#cfc3b1" roughness={1} /></mesh>
        <mesh position={[0, 13.2, 0]}><coneGeometry args={[0.25, 1.4, 12]} /><meshStandardMaterial color="#cfc3b1" /></mesh>
      </group>
      {[-30, -20, -11, -3].map((x, i) => (
        <mesh key={i} position={[x - 14, -2, -60]} scale={[9 + i, 5 + (i % 2) * 2, 6]}><sphereGeometry args={[1, 32, 16]} /><meshStandardMaterial color="#b7cdb4" roughness={1} /></mesh>
      ))}
      <Forest />
      <Clouds />
    </group>
  );
}

function Rig({ progress }: { progress: MutableRefObject<number> }) {
  const { camera, pointer } = useThree();
  const to = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const p = progress.current;
    const up = Math.sin(span(p, 0.06, 0.4) * Math.PI); // rise to watch the billboard fill
    const heaps = Math.sin(span(p, 0.38, 0.74) * Math.PI); // come forward for the heaps and bales
    const end = ease(span(p, 0.74, 0.95));
    to.set(pointer.x * 0.9 - heaps * 1.5, 3.6 + up * 2.5 + heaps * 0.6 + pointer.y * 0.4, 15 - heaps * 2 - end * 2.5);
    camera.position.lerp(to, 0.07);
    look.set(0, 2.2 + up * 2.8 - heaps * 0.8 + end * 0.2, -0.5 + heaps * 2);
    camera.lookAt(look);
  });
  return null;
}

export function RecycleScene({ progress }: { progress: MutableRefObject<number> }) {
  const letters = useLetters();
  return (
    <>
      <fog attach="fog" args={['#eef4ec', 22, 75]} />
      <hemisphereLight args={['#ffffff', '#a9c49a', 1.5]} />
      <directionalLight position={[-7, 12, 9]} intensity={2.6} color="#fff6e6" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-6} shadow-bias={-0.0004} />
      <directionalLight position={[6, 4, -6]} intensity={0.5} color="#e8f5ea" />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 6, 4]} scale={[12, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.2} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#e8f5ea" />
        <Lightformer intensity={0.8} position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#fff2dc" />
        <Lightformer intensity={0.6} position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#a9c49a" />
      </Environment>
      <Rig progress={progress} />
      <Letters progress={progress} letters={letters} />
      <Pieces progress={progress} letters={letters} />
      <Vines progress={progress} letters={letters} />
      <Billboard progress={progress} />
      <Park />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <circleGeometry args={[90, 64]} />
        <meshStandardMaterial color="#d3e4c5" roughness={1} />
      </mesh>
    </>
  );
}
