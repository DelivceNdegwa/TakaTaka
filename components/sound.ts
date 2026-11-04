'use client';

// All sound is synthesised in the browser: soft wind, birdsong, paper crunch and a bin thud.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambience: (() => void) | null = null;
let enabled = false;
const listeners = new Set<(on: boolean) => void>();

export const soundOn = () => enabled;
export const onSound = (fn: (on: boolean) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  return { ctx, master: master! };
}

function noise(seconds: number) {
  const { ctx } = audio();
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function startAmbience() {
  const { ctx, master } = audio();
  // wind: looping filtered noise, very low
  const src = ctx.createBufferSource();
  src.buffer = noise(4); src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const g = ctx.createGain(); g.gain.value = 0.05;
  src.connect(lp).connect(g).connect(master); src.start();
  // birds: short chirps at random moments
  let timer = 0;
  const chirp = () => {
    const t = ctx.currentTime;
    const notes = 2 + Math.floor(Math.random() * 3);
    const base = 2200 + Math.random() * 1800;
    for (let n = 0; n < notes; n++) {
      const o = ctx.createOscillator(); const eg = ctx.createGain();
      const st = t + n * (0.09 + Math.random() * 0.05);
      o.type = 'sine';
      o.frequency.setValueAtTime(base, st);
      o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), st + 0.07);
      eg.gain.setValueAtTime(0, st); eg.gain.linearRampToValueAtTime(0.04, st + 0.01); eg.gain.exponentialRampToValueAtTime(0.0001, st + 0.09);
      o.connect(eg).connect(master); o.start(st); o.stop(st + 0.1);
    }
    timer = window.setTimeout(chirp, 1800 + Math.random() * 4200);
  };
  chirp();
  return () => { src.stop(); clearTimeout(timer); };
}

export function setSound(on: boolean) {
  enabled = on;
  if (on) {
    const { ctx } = audio();
    void ctx.resume();
    if (!ambience) ambience = startAmbience();
  } else {
    ambience?.(); ambience = null;
    void ctx?.suspend();
  }
  listeners.forEach((fn) => fn(on));
}

export function crunch() {
  if (!enabled) return;
  const { ctx, master } = audio();
  const src = ctx.createBufferSource(); src.buffer = noise(0.25);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.8;
  const g = ctx.createGain(); const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  for (let i = 0; i < 6; i++) g.gain.setValueAtTime(0.12 * Math.random() + 0.04, t + i * 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  src.connect(bp).connect(g).connect(master); src.start();
}

export function thud() {
  if (!enabled) return;
  const { ctx, master } = audio();
  const o = ctx.createOscillator(); const g = ctx.createGain(); const t = ctx.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(master); o.start(); o.stop(t + 0.4);
}

export function chime(good: boolean) {
  if (!enabled) return;
  const { ctx, master } = audio();
  const t = ctx.currentTime;
  (good ? [660, 880, 1320] : [300, 220]).forEach((f, i) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = good ? 'triangle' : 'sawtooth';
    const st = t + i * 0.08;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(good ? 0.08 : 0.04, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.3);
    o.connect(g).connect(master); o.start(st); o.stop(st + 0.32);
  });
}
