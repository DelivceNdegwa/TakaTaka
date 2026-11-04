'use client';

import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { GameScene, ITEMS, TARGETS, type GameHandle, type Target } from './three/GameScene';

const RIVER_LINES = [
  'That is how the Nairobi River chokes. Waste dropped upstream ends up here.',
  'Plastic in water breaks into tiny pieces that fish and livestock swallow.',
  'Blocked rivers and drains overflow when the long rains come.',
];

export function SortGame() {
  const [round, setRound] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [dirt, setDirt] = useState(0);
  const [litter, setLitter] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: 'good' | 'bad'; title: string; text: string } | null>(null);
  const [live, setLive] = useState(false);
  const game = useRef<GameHandle>(null);
  const box = useRef<HTMLDivElement>(null);
  const item = ITEMS[round % ITEMS.length];

  // Only render the scene while it is on screen
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const land = (where: Target | 'street') => {
    const label = TARGETS.find((t) => t.id === where)?.label;
    if (where === item.bin) {
      setRight((n) => n + 1);
      setToast({ tone: 'good', title: 'Mahali pake!', text: `${item.name} in ${label}. That is one more thing that can be made into something new.` });
    } else if (where === 'river') {
      setWrong((n) => n + 1);
      setDirt((d) => Math.min(1, d + 0.2));
      setToast({ tone: 'bad', title: 'Into the river', text: RIVER_LINES[wrong % RIVER_LINES.length] });
    } else if (where === 'street') {
      setWrong((n) => n + 1);
      setLitter((l) => Math.min(30, l + 1));
      setToast({ tone: 'bad', title: 'Dropped on the street', text: 'Litter on the road washes into drains with the next rain. Aim for a bin.' });
    } else {
      setWrong((n) => n + 1);
      setToast({ tone: 'bad', title: 'Wrong bin', text: `${item.name} belongs in ${TARGETS.find((t) => t.id === item.bin)?.label}. Mixed waste is much harder to recycle.` });
    }
    setRound((r) => r + 1);
    setBusy(false);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const health = Math.round((1 - dirt) * 100);

  return (
    <section className="game light columns" id="play" aria-labelledby="play-title">
      <div className="game__head">
        <h2 id="play-title">Where does <span>it go?</span></h2>
        <p>Grab the piece and flick it up towards a bin. Try the river too, if you want to see what it costs. Or choose a place with the buttons below.</p>
      </div>
      <div className="arena" ref={box}>
        <Canvas shadows dpr={[1, 1.5]} frameloop={live ? 'always' : 'never'} camera={{ position: [0, 3.4, 7.2], fov: 46 }}>
          <GameScene ref={game} item={item} busy={busy} dirt={dirt} litter={litter} onThrow={() => setBusy(true)} onLand={land} />
        </Canvas>
        <div className="hud">
          <div className="score" aria-live="polite">
            <span><b>{right}</b>Sorted</span>
            <span className="bad"><b>{wrong}</b>Misplaced</span>
          </div>
          <div className="health">River health {health}%<span><i style={{ width: `${health}%` }} /></span></div>
        </div>
        <div className="toast" data-show={toast ? 'true' : 'false'} data-tone={toast?.tone ?? 'good'} role="status">
          <strong>{toast?.title ?? ''}</strong>
          <p>{toast?.text ?? ''}</p>
        </div>
        <div className="picker">
          <span className="lead">Now holding: <b>{item.name}</b></span>
          {TARGETS.map((t) => (
            <button key={t.id} type="button" disabled={busy} onClick={() => game.current?.throwTo(t.id)}>
              {t.id === 'river' ? 'Toss in the river' : `Put in ${t.label}`}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
