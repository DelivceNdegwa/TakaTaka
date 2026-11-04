'use client';

import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { chime, crunch, thud } from './sound';
import { GameScene, ITEMS, TARGETS, type GameHandle, type Target } from './three/GameScene';

const STREET_LINES = [
  'Litter on the road washes into the drains with the next rain.',
  'Goats and birds pick through what is left on the roadside.',
  'Blocked drains overflow when the long rains come.',
];

export function SortGame() {
  const [round, setRound] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
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
      thud(); chime(true);
      setRight((n) => n + 1);
      setStreak((n) => { const next = n + 1; setBest((b) => Math.max(b, next)); return next; });
      setToast({ tone: 'good', title: streak + 1 >= 3 ? `Mahali pake! ${streak + 1} in a row` : 'Mahali pake!', text: `${item.name} in ${label}. That is one more thing that can become something new.` });
    } else if (where === 'street') {
      chime(false);
      setWrong((n) => n + 1);
      setStreak(0);
      setLitter((l) => Math.min(30, l + 1));
      setToast({ tone: 'bad', title: 'Dropped on the street', text: STREET_LINES[wrong % STREET_LINES.length] });
    } else {
      thud(); chime(false);
      setWrong((n) => n + 1);
      setStreak(0);
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


  return (
    <section className="game light columns" id="play" aria-labelledby="play-title">
      <div className="game__head">
        <h2 id="play-title">Where does <span>it go?</span></h2>
        <p>Grab the piece and flick it up towards the right bin. Miss, and it lands on the street. You can also choose with the buttons below.</p>
      </div>
      <div className="arena" ref={box}>
        <Canvas shadows dpr={[1, 1.5]} frameloop={live ? 'always' : 'never'} camera={{ position: [0, 3.4, 7.2], fov: 46 }}>
          <GameScene ref={game} item={item} busy={busy} litter={litter} onThrow={() => { crunch(); setBusy(true); }} onLand={land} />
        </Canvas>
        <div className="hud">
          <div className="score" aria-live="polite">
            <span><b>{right}</b>Sorted</span>
            <span className="bad"><b>{wrong}</b>Misplaced</span>
          </div>
          <div className="score score--right"><span><b>{streak}</b>Streak</span><span><b>{best}</b>Best</span></div>
        </div>
        <div className="toast" data-show={toast ? 'true' : 'false'} data-tone={toast?.tone ?? 'good'} role="status">
          <strong>{toast?.title ?? ''}</strong>
          <p>{toast?.text ?? ''}</p>
        </div>
        <div className="picker">
          <span className="lead">Now holding: <b>{item.name}</b></span>
          {TARGETS.map((t) => (
            <button key={t.id} type="button" disabled={busy} onClick={() => game.current?.throwTo(t.id)}>
              {`Put in ${t.label}`}
            </button>
          ))}
          <button type="button" disabled={busy} onClick={() => game.current?.throwTo('street')}>Drop it on the street</button>
        </div>
      </div>
    </section>
  );
}
