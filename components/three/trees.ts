'use client';

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seeded } from './trash';

// Procedural trees: a tapering trunk that splits into branches and twigs, with clusters of
// individual leaves at the tips. "acacia" spreads into a flat crown; "broadleaf" grows round.
export type TreeSpec = { x: number; z: number; scale: number; kind: 'acacia' | 'broadleaf'; seed: number };

type Tip = { pos: THREE.Vector3; size: number };

function segment(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, 7, 1, false);
  g.translate(0, len / 2, 0);
  const dir = b.clone().sub(a).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  g.translate(a.x, a.y, a.z);
  return g;
}

function grow(spec: TreeSpec) {
  const r = seeded(spec.seed);
  const parts: THREE.BufferGeometry[] = [];
  const tips: Tip[] = [];
  const acacia = spec.kind === 'acacia';

  const branch = (start: THREE.Vector3, dir: THREE.Vector3, length: number, radius: number, depth: number) => {
    // each branch bends a little along its length
    const steps = 3;
    let p = start.clone();
    let d = dir.clone();
    let rad = radius;
    for (let s = 0; s < steps; s++) {
      d.add(new THREE.Vector3((r() - 0.5) * 0.35, acacia ? 0.05 : 0.12, (r() - 0.5) * 0.35)).normalize();
      const next = p.clone().addScaledVector(d, length / steps);
      const nr = rad * 0.82;
      parts.push(segment(p, next, rad, nr));
      p = next; rad = nr;
    }
    if (depth === 0) { tips.push({ pos: p, size: (acacia ? 0.75 : 0.95) * length * 1.2 + 0.35 }); return; }
    const kids = depth >= 3 ? (acacia ? 3 + Math.floor(r() * 2) : 3) : 2 + Math.floor(r() * 2);
    for (let k = 0; k < kids; k++) {
      const yaw = (k / kids) * Math.PI * 2 + r() * 0.8;
      // acacias fork wide and low; broadleaf trees reach up
      const spread = acacia ? 0.75 + r() * 0.35 : 0.45 + r() * 0.35;
      const nd = new THREE.Vector3(Math.cos(yaw) * spread, acacia ? 0.75 + r() * 0.2 : 1, Math.sin(yaw) * spread).add(d.clone().multiplyScalar(0.5)).normalize();
      branch(p, nd, length * (acacia ? 0.72 : 0.68), rad * 0.72, depth - 1);
    }
  };

  const trunkH = acacia ? 1.7 : 1.4;
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.2).normalize(), trunkH, 0.16, 3);
  const wood = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  return { wood, tips, acacia, r };
}

export function leafTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(64, 50, 32, 124); g.quadraticCurveTo(0, 50, 32, 4); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(32, 8); g.lineTo(32, 120); g.stroke();
  for (let y = 30; y < 110; y += 16) { g.beginPath(); g.moveTo(32, y); g.lineTo(14, y - 10); g.moveTo(32, y); g.lineTo(50, y - 10); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const GREENS = ['#2f6e2e', '#3f8a3c', '#4f9a45', '#5aa64b', '#376f33', '#6fae52'];

// Build every tree into one wood mesh and one instanced leaf mesh
export function buildForest(specs: TreeSpec[]) {
  const woods: THREE.BufferGeometry[] = [];
  const leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  specs.forEach((spec) => {
    const { wood, tips, acacia, r } = grow(spec);
    wood.scale(spec.scale, spec.scale, spec.scale);
    wood.translate(spec.x, -0.5, spec.z);
    woods.push(wood);
    tips.forEach((tip) => {
      const count = acacia ? 70 : 90;
      for (let i = 0; i < count; i++) {
        // leaves fill a cluster around each twig tip; acacia clusters are flat
        const u = r() * Math.PI * 2, w = Math.acos(2 * r() - 1), rad = tip.size * Math.cbrt(r());
        v.set(Math.sin(w) * Math.cos(u) * rad, Math.cos(w) * rad * (acacia ? 0.32 : 0.8), Math.sin(w) * Math.sin(u) * rad);
        v.add(tip.pos).multiplyScalar(spec.scale).add(new THREE.Vector3(spec.x, -0.5, spec.z));
        e.set(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI);
        q.setFromEuler(e);
        s.setScalar((0.16 + r() * 0.12) * spec.scale);
        const m = new THREE.Matrix4().compose(v.clone(), q.clone(), s.clone());
        // leaves on the outside and top catch more light
        const c = new THREE.Color(GREENS[Math.floor(r() * GREENS.length)]).multiplyScalar(0.75 + (v.y - spec.z * 0) * 0.02 + r() * 0.3);
        leaves.push({ m, c });
      }
    });
  });
  const wood = mergeGeometries(woods);
  return { wood, leaves };
}
