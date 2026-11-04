import { FlipSide } from '@/components/FlipSide';
import { Pledge } from '@/components/Pledge';
import { SmoothScroll } from '@/components/SmoothScroll';
import { SortGame } from '@/components/SortGame';
import { Story } from '@/components/Story';
import { Uses } from '@/components/Uses';

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <header className="bar">
        <a className="logo" href="#top" aria-label="Taka Green home">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 3c7 4 10 10 7 17-2 5-7 8-12 7 0-8 2-15 5-24Z" fill="#c8f24a" /><path d="M11 27c1-6 3-11 6-15" stroke="#07120d" strokeWidth="1.8" strokeLinecap="round" /></svg>
          Taka Green
        </a>
        <nav aria-label="Sections">
          <a className="chip" href="#problem">The problem</a>
          <a className="chip" href="#uses">What it becomes</a>
          <a className="chip chip--lime" href="#play">Play</a>
        </nav>
      </header>
      <main id="top">
        <Story />
        <FlipSide />
        <SortGame />
        <Uses />
        <Pledge />
      </main>
    </>
  );
}
