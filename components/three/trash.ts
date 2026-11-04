'use client';

import * as THREE from 'three';

// Realistic trash, modelled and textured in code: crushed cans, PET bottles, milk cartons,
// crumpled newspaper, cardboard and plastic bags. Every piece is irregular.

export const seeded = (seed: number) => {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
};

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
};
const texture = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
// grime: dirt speckles and smudges so nothing looks fresh out of a shop
function grime(g: CanvasRenderingContext2D, w: number, h: number, r: () => number, amount = 1) {
  for (let i = 0; i < 260 * amount; i++) {
    g.fillStyle = `rgba(${60 + r() * 40},${45 + r() * 30},${25 + r() * 20},${0.05 + r() * 0.18})`;
    const rad = 1 + r() * (r() > 0.92 ? 26 : 5);
    g.beginPath(); g.arc(r() * w, r() * h, rad, 0, Math.PI * 2); g.fill();
  }
}

// ---------- textures ----------
export function canTexture() {
  const [c, g] = canvas(512, 256);
  const r = seeded(5);
  // a white body so per-piece colour tints it (red, green, blue, silver)
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#ffffff'; g.fillRect(0, 70, 512, 120);
  g.fillStyle = '#222'; g.font = '900 64px "Inter Tight", system-ui, sans-serif';
  g.save(); g.translate(40, 150); g.fillText('FIZZ', 0, 0); g.fillText('FIZZ', 256, 0); g.restore();
  g.fillStyle = 'rgba(0,0,0,0.5)'; g.font = '600 18px system-ui'; g.fillText('330 ml', 60, 180); g.fillText('330 ml', 316, 180);
  // silver rims
  g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 512, 18); g.fillRect(0, 238, 512, 18);
  grime(g, 512, 256, r, 0.6);
  return texture(c);
}

export function bottleTexture() {
  const [c, g] = canvas(512, 512);
  const r = seeded(9);
  // clear plastic is drawn faint; the label band is opaque
  g.fillStyle = 'rgba(210,235,245,0.38)'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#1e5fa8'; g.fillRect(0, 230, 512, 110);
  g.fillStyle = '#ffffff'; g.font = '800 46px "Inter Tight", system-ui, sans-serif';
  g.fillText('MAJI SAFI', 30, 300); g.fillText('MAJI SAFI', 286, 300);
  g.fillStyle = '#7cc4ea'; g.fillRect(0, 322, 512, 8);
  grime(g, 512, 512, r, 0.4);
  return texture(c);
}

export function cartonTexture() {
  const [c, g] = canvas(512, 512);
  const r = seeded(13);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#1b7fc1'; g.fillRect(0, 300, 512, 212);
  // a cow-spot band and the product name, in Swahili
  g.fillStyle = '#111';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * 512, 60 + r() * 160, 18 + r() * 30, 12 + r() * 18, r() * 3, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#ffffff'; g.font = '900 70px "Inter Tight", system-ui, sans-serif';
  g.fillText('MAZIWA', 20, 400); g.font = '600 28px system-ui'; g.fillText('fresh milk 500 ml', 24, 450);
  grime(g, 512, 512, r, 1);
  return texture(c);
}

export function newsTexture() {
  const [c, g] = canvas(512, 512);
  const r = seeded(17);
  g.fillStyle = '#ece8dc'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#222'; g.font = '900 44px Georgia, serif'; g.fillText('THE DAILY', 20, 54);
  g.fillRect(20, 64, 472, 3);
  // columns of grey text lines and a photo block
  for (let col = 0; col < 3; col++) {
    for (let y = 90; y < 500; y += 11) {
      if (col === 1 && y > 150 && y < 300) continue;
      g.fillStyle = `rgba(40,40,40,${0.35 + r() * 0.3})`;
      g.fillRect(20 + col * 162, y, 140 - r() * 30, 5);
    }
  }
  g.fillStyle = '#8f8a80'; g.fillRect(182, 150, 140, 140);
  grime(g, 512, 512, r, 1.2);
  return texture(c);
}

export function cardboardTexture() {
  const [c, g] = canvas(512, 512);
  const r = seeded(23);
  g.fillStyle = '#b07a45'; g.fillRect(0, 0, 512, 512);
  // corrugation ribs and fibres
  for (let x = 0; x < 512; x += 6) { g.fillStyle = `rgba(90,55,25,${0.08 + r() * 0.06})`; g.fillRect(x, 0, 3, 512); }
  g.strokeStyle = 'rgba(40,30,20,0.85)'; g.lineWidth = 6;
  // printed arrows, like a shipping box
  for (const x of [140, 260]) { g.beginPath(); g.moveTo(x, 300); g.lineTo(x, 180); g.moveTo(x - 30, 210); g.lineTo(x, 180); g.lineTo(x + 30, 210); g.stroke(); }
  g.fillStyle = 'rgba(40,30,20,0.85)'; g.font = '800 30px system-ui'; g.fillText('THIS SIDE UP', 110, 350);
  grime(g, 512, 512, r, 1.4);
  return texture(c);
}

export function bagTexture() {
  const [c, g] = canvas(256, 256);
  const r = seeded(29);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  // stretch marks and creases on thin plastic
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(r() * 256, r() * 256); g.lineTo(r() * 256, r() * 256); g.stroke(); }
  grime(g, 256, 256, r, 0.3);
  return texture(c);
}

// ---------- geometry ----------
function lathe(profile: [number, number][], segments = 28) {
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments);
}

// Squash a lathe body unevenly and dent it, the way a stepped-on can folds
function crush(g: THREE.BufferGeometry, r: () => number, amount: number) {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const dents = Array.from({ length: 6 }, () => ({ a: r() * Math.PI * 2, y: (r() - 0.5) * 0.8, k: 0.1 + r() * 0.2 }));
  const tilt = (r() - 0.5) * amount;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    let rad = Math.hypot(x, z);
    // accordion folds around the middle
    const fold = Math.sin(y * 9 + ang * 2) * 0.04 * amount;
    dents.forEach((d) => {
      const da = Math.cos(ang - d.a), dy = Math.exp(-((y - d.y) ** 2) * 18);
      rad -= Math.max(0, da) ** 3 * dy * d.k * amount;
    });
    rad = Math.max(0.02, rad + fold);
    y = y * (1 - amount * 0.35) + x * tilt * 0.4;
    x = Math.cos(ang) * rad; z = Math.sin(ang) * rad;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

export function canGeometry(r = seeded(1)) {
  const profile: [number, number][] = [[0, -0.6], [0.26, -0.6], [0.3, -0.54], [0.33, -0.45], [0.33, 0.42], [0.29, 0.53], [0.27, 0.58], [0.26, 0.6], [0, 0.6]];
  return crush(lathe(profile, 32), r, 0.9);
}

export function bottleGeometry(r = seeded(2)) {
  const profile: [number, number][] = [[0, -0.9], [0.26, -0.9], [0.3, -0.82], [0.3, 0.25], [0.26, 0.45], [0.13, 0.65], [0.1, 0.72], [0.1, 0.86], [0, 0.86]];
  return crush(lathe(profile, 28), r, 0.55);
}

export function cartonGeometry(r = seeded(3)) {
  const g = new THREE.BoxGeometry(0.62, 1.0, 0.62, 4, 6, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // gable top: pinch the top into a ridge
    if (y > 0.3) { const t = (y - 0.3) / 0.2; z *= 1 - t * 0.85; y += Math.abs(x) * 0.05; }
    // bulges and a crushed corner
    x += Math.sin(y * 6) * 0.02 + (r() - 0.5) * 0.015;
    z += Math.cos(y * 5) * 0.02 + (r() - 0.5) * 0.015;
    if (x > 0.2 && y < -0.2) { x -= 0.08; y += 0.04; }
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

export function paperGeometry(r = seeded(4)) {
  const g = new THREE.IcosahedronGeometry(0.5, 3);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const dents = Array.from({ length: 14 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    let k = 1;
    dents.forEach((d) => { k -= Math.max(0, n.dot(d) - 0.6) * 1.1; });
    // sharp creases
    k += (Math.sin(n.x * 17) * Math.sin(n.y * 13) * Math.sin(n.z * 11)) * 0.12;
    v.copy(n).multiplyScalar(0.5 * k);
    v.y *= 0.85;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  const out = g.toNonIndexed();
  out.computeVertexNormals();
  return out;
}

export function cardboardGeometry(r = seeded(6)) {
  // a flattened, folded piece of box
  const g = new THREE.BoxGeometry(1.2, 0.05, 0.9, 10, 1, 8);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const fold = (r() - 0.5) * 0.4;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = pos.getY(i) + Math.max(0, x - fold) * 0.9 + Math.sin(z * 3) * 0.04 + (r() - 0.5) * 0.015;
    pos.setY(i, y);
  }
  g.computeVertexNormals();
  return g;
}

export function bagGeometry(r = seeded(7)) {
  const g = new THREE.IcosahedronGeometry(0.5, 3);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    // a loose, baggy shape with drooping handles
    const k = 0.75 + Math.sin(v.x * 7 + v.z * 4) * 0.14 + Math.sin(v.y * 11) * 0.06 + (r() - 0.5) * 0.04;
    v.multiplyScalar(0.55 * k);
    v.x *= 1.25; v.y *= 0.7;
    if (v.y > 0.25 && Math.abs(v.x) > 0.2) v.y += 0.18;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// ---------- the catalogue ----------
export type TrashKind = 'can' | 'bottle' | 'carton' | 'paper' | 'cardboard' | 'bag';
export type TrashDef = { kind: TrashKind; geometry: THREE.BufferGeometry; material: THREE.Material; tints: string[]; size: number; sortColour: string };

export function makeTrash(): TrashDef[] {
  const can = new THREE.MeshStandardMaterial({ map: canTexture(), metalness: 0.85, roughness: 0.32 });
  const bottle = new THREE.MeshPhysicalMaterial({ map: bottleTexture(), transparent: true, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const carton = new THREE.MeshStandardMaterial({ map: cartonTexture(), roughness: 0.55 });
  const paper = new THREE.MeshStandardMaterial({ map: newsTexture(), roughness: 0.95, flatShading: true });
  const cardboard = new THREE.MeshStandardMaterial({ map: cardboardTexture(), roughness: 0.95 });
  const bag = new THREE.MeshPhysicalMaterial({ map: bagTexture(), roughness: 0.45, transmission: 0, transparent: true, opacity: 0.92, sheen: 1, sheenRoughness: 0.4, side: THREE.DoubleSide });
  return [
    { kind: 'can', geometry: canGeometry(), material: can, tints: ['#d42a1e', '#1e9e4a', '#2456c9', '#d9dbe0', '#f2b705'], size: 0.42, sortColour: '#c9ccd0' },
    { kind: 'bottle', geometry: bottleGeometry(), material: bottle, tints: ['#ffffff', '#d8f0e4', '#e0ecf7'], size: 0.4, sortColour: '#9fd0e6' },
    { kind: 'carton', geometry: cartonGeometry(), material: carton, tints: ['#ffffff', '#f3efe6'], size: 0.42, sortColour: '#ffffff' },
    { kind: 'paper', geometry: paperGeometry(), material: paper, tints: ['#ffffff', '#efe9dc', '#dcd3c2', '#cfc6b4'], size: 0.5, sortColour: '#e7e1d3' },
    { kind: 'cardboard', geometry: cardboardGeometry(), material: cardboard, tints: ['#ffffff', '#e8dccb', '#cdb79c'], size: 0.42, sortColour: '#b07a45' },
    { kind: 'bag', geometry: bagGeometry(), material: bag, tints: ['#ffffff', '#2a2a2a', '#3a6fd1', '#e8e8e8'], size: 0.48, sortColour: '#f0f0f0' },
  ];
}
