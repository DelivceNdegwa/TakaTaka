'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';

// Paper waste tells the whole story, driven by scroll progress (0..1):
// it falls into the billboard cage -> gets sorted by colour -> rises to spell TAKA.
const PER = 420; // pieces per shape
const SHAPES = 3; // crumpled ball, folded sheet, torn scrap
const N = PER * SHAPES;
const CAGE = { w: 6.4, h: 4, d: 1, y: 4.2 };

// Real paper waste: kraft, cardboard, newsprint, office white, dirty white, green and red packaging
const PAPER = [
  { c: '#a8774a', w: 3 }, // kraft brown
  { c: '#7a4f2a', w: 2 }, // cardboard
  { c: '#5a3a1f', w: 1 }, // wet cardboard
  { c: '#ffffff', w: 2 }, // office white
  { c: '#e4dccb', w: 2 }, // dirty white
  { c: '#c9c3b6', w: 1 }, // newsprint
  { c: '#1e9e4a', w: 2 }, // green packaging
  { c: '#c8321f', w: 1 }, // red packaging
];
const SORT_ORDER = [0, 1, 2, 5, 4, 3, 6, 7];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// Irregular paper geometry: dents and folds, flat shaded so every facet catches light differently
function crumpled(r: () => number) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const dents = Array.from({ length: 9 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let k = 0.82 + r() * 0.28;
    dents.forEach((d) => { k -= Math.max(0, v.dot(d) - 0.55) * 0.9; });
    v.multiplyScalar(k);
    v.y *= 0.82;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return g.toNonIndexed();
}
function folded(r: () => number) {
  const g = new THREE.PlaneGeometry(2, 1.5, 8, 6);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const fold = r() * 0.6 - 0.3;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // one sharp fold, a soft curl and small creases
    const z = -Math.abs(x - fold) * 0.55 + Math.sin(y * 2.4) * 0.12 + (r() - 0.5) * 0.06;
    pos.setZ(i, z);
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
}
function torn(r: () => number) {
  const shape = new THREE.Shape();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 0.6 + r() * 0.5;
    const x = Math.cos(a) * rad * 1.3, y = Math.sin(a) * rad;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + Math.sin(pos.getX(i) * 2) * 0.15);
  g.center();
  g.computeVertexNormals();
  return g.toNonIndexed();
}

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
  return out;
}

function usePaperData() {
  return useMemo(() => {
    const r = seeded(7);
    const weights = PAPER.flatMap((p, i) => Array(p.w).fill(i) as number[]);
    const sky: number[] = [], cage: number[] = [], sorted: number[] = [], spin: number[] = [], delay: number[] = [], shade: number[] = [], size: number[] = [];
    const colours = new Float32Array(N * 3);
    const c = new THREE.Color();
    const stackCount = new Array(PAPER.length).fill(0);
    for (let i = 0; i < N; i++) {
      const k = weights[Math.floor(r() * weights.length)];
      shade.push(k);
      // every sheet is a slightly different shade, like real dirty paper
      c.set(PAPER[k].c).offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * 0.08);
      c.toArray(colours, i * 3);
      const d = r();
      delay.push(d);
      cage.push((r() - 0.5) * (CAGE.w - 0.4), CAGE.y - CAGE.h / 2 + 0.15 + d * (CAGE.h - 0.3), (r() - 0.5) * (CAGE.d - 0.3));
      sky.push((r() - 0.5) * 12, 10 + r() * 9, (r() - 0.5) * 5 + 1);
      // sorting: one neat column per colour
      const col = SORT_ORDER.indexOf(k);
      const n = stackCount[k]++;
      sorted.push((col - (PAPER.length - 1) / 2) * 1.05 + (r() - 0.5) * 0.5, 0.2 + (n % 60) * 0.075 + (r() - 0.5) * 0.05, (Math.floor(n / 60) - 1) * 0.5 + (r() - 0.5) * 0.3);
      spin.push(r() * 6, r() * 6, r() * 6, 0.4 + r());
      size.push(0.1 + r() * 0.09);
    }
    return { sky, cage, sorted, spin, delay, colours, shade, size };
  }, []);
}

function Pieces({ progress }: { progress: MutableRefObject<number> }) {
  const data = usePaperData();
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const [word, setWord] = useState<number[] | null>(null);

  useEffect(() => {
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'sans-serif';
    document.fonts.load(`900 260px ${family}`).finally(() => setWord(wordPoints(N, family)));
  }, []);

  const geos = useMemo(() => {
    const r = seeded(3);
    return [crumpled(r), folded(r), torn(r)].map((g, s) => {
      g.setAttribute('color', new THREE.InstancedBufferAttribute(data.colours.slice(s * PER * 3, (s + 1) * PER * 3), 3));
      return g;
    });
  }, [data]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const p = progress.current;
    const time = clock.elapsedTime;
    for (let s = 0; s < SHAPES; s++) {
      const m = meshes.current[s];
      if (!m) continue;
      for (let j = 0; j < PER; j++) {
        const i = s * PER + j;
        const i3 = i * 3;
        const d = data.delay[i];
        const fall = ease(span(p, 0.02 + d * 0.28, 0.1 + d * 0.28));
        const sort = ease(span(p, 0.42 + d * 0.1, 0.52 + d * 0.1));
        const form = ease(span(p, 0.68 + d * 0.14, 0.8 + d * 0.14));
        a.set(data.sky[i3], data.sky[i3 + 1], data.sky[i3 + 2]);
        b.set(data.cage[i3], data.cage[i3 + 1], data.cage[i3 + 2]);
        a.lerp(b, fall);
        b.set(data.sorted[i3], data.sorted[i3 + 1], data.sorted[i3 + 2]);
        // lift as it travels, so pieces arc out of the cage instead of sliding through it
        a.lerp(b, sort);
        a.y += Math.sin(sort * Math.PI) * 1.5;
        if (word) {
          b.set(word[i3], word[i3 + 1], word[i3 + 2]);
          a.lerp(b, form);
          a.z += Math.sin(form * Math.PI) * 2;
        }
        dummy.position.copy(a);
        const s4 = i * 4;
        const loose = (1 - fall) + Math.sin(sort * Math.PI) + Math.sin(form * Math.PI);
        dummy.rotation.set(data.spin[s4] + time * data.spin[s4 + 3] * loose, data.spin[s4 + 1] + time * 0.7 * loose, data.spin[s4 + 2] * (1 - form * 0.7));
        dummy.scale.setScalar(data.size[i] * (1 - form * 0.15));
        dummy.updateMatrix();
        m.setMatrixAt(j, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {geos.map((g, s) => (
        <instancedMesh key={s} ref={(el) => { meshes.current[s] = el; }} args={[g, undefined, PER]} castShadow receiveShadow frustumCulled={false}>
          <meshStandardMaterial vertexColors roughness={0.92} side={THREE.DoubleSide} flatShading />
        </instancedMesh>
      ))}
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

// Nairobi skyline in the haze: low blocks and the KICC drum and saucer
function Skyline() {
  const blocks = useMemo(() => {
    const r = seeded(21);
    return Array.from({ length: 60 }, () => {
      const x = (r() - 0.5) * 80;
      return { x, z: -22 - r() * 20, h: 2 + r() * (Math.abs(x) < 16 ? 12 : 6), w: 1.4 + r() * 2.6 };
    });
  }, []);
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 0.5, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color="#dfe3dd" roughness={1} />
        </mesh>
      ))}
      <group position={[11, -0.5, -26]}>
        <mesh position={[0, 6, 0]}><cylinderGeometry args={[1, 1, 12, 24]} /><meshStandardMaterial color="#d3cabd" roughness={1} /></mesh>
        <mesh position={[0, 12.3, 0]}><cylinderGeometry args={[1.9, 1.3, 0.6, 32]} /><meshStandardMaterial color="#cbbfae" roughness={1} /></mesh>
        <mesh position={[0, 13.2, 0]}><coneGeometry args={[0.25, 1.4, 12]} /><meshStandardMaterial color="#cbbfae" /></mesh>
      </group>
    </group>
  );
}

function Rig({ progress }: { progress: MutableRefObject<number> }) {
  const { camera, pointer } = useThree();
  const to = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const p = progress.current;
    const sortView = Math.sin(span(p, 0.4, 0.7) * Math.PI);
    const end = ease(span(p, 0.7, 0.95));
    const x = pointer.x * 0.8 + sortView * 2.2;
    const y = 4.2 + pointer.y * 0.4 + sortView * 1.5 - end * 0.2;
    const z = 13 - sortView * 1 - end * 1.5;
    camera.position.lerp(to.set(x, y, z), 0.07);
    camera.lookAt(0, 3.6 - sortView * 1.4 + end * 0.6, 0);
  });
  return null;
}

export function RecycleScene({ progress }: { progress: MutableRefObject<number> }) {
  return (
    <>
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', 18, 48]} />
      <hemisphereLight args={['#ffffff', '#d9d2c4', 1.6]} />
      <directionalLight position={[-7, 12, 8]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
      <directionalLight position={[6, 4, -6]} intensity={0.6} color="#e8f5ea" />
      <Rig progress={progress} />
      <Billboard progress={progress} />
      <Pieces progress={progress} />
      <Skyline />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
    </>
  );
}
