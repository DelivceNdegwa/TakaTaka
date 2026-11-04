import { Reveal } from './Reveal';
import { Stairs } from './Transitions';

const PATHS = [
  {
    title: 'Drains',
    text: 'A bottle tossed on the road rides the next downpour into a storm drain. Enough of them and the drain blocks, and the street floods.',
    icon: <path d="M4 10h16M4 14h16M7 6v12M12 6v12M17 6v12" />,
  },
  {
    title: 'The animals',
    text: 'Goats, cows and birds pick through roadside heaps and swallow plastic bags and wrappers that they cannot digest.',
    icon: <path d="M5 10c0-3 3-5 7-5s7 2 7 5v3c0 3-3 6-7 6s-7-3-7-6v-3ZM5 9 2 6M19 9l3-3M9.5 12h.01M14.5 12h.01M10 16c1.2.8 2.8.8 4 0" />,
  },
  {
    title: 'The smoke',
    text: 'Burned in a heap, plastic releases toxic fumes that the whole neighbourhood breathes, and the material is lost for good.',
    icon: <path d="M8 20c-2-3 2-5 0-8s2-5 0-8M14 20c-2-3 2-5 0-8s2-5 0-8M19 20h-15" />,
  },
];

export function FlipSide() {
  return (
    <>
    <Stairs colour="var(--brown)" />
    <Reveal as="section" className="flip">
      <div className="flip__head" id="problem">
        <h2 data-rise>The same waste, <span>in the wrong place.</span></h2>
        <p data-words>
          Kenya banned plastic carrier bags in 2017, but cans, bottles, cartons and food waste still end up on roadsides, in drains and at the dumpsite in Dandora. Where it lands decides whether it becomes something new or a problem.
        </p>
      </div>
      <div className="paths">
        {PATHS.map((p) => (
          <article key={p.title} className="path" data-rise>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p.icon}</svg>
            <h3>{p.title}</h3>
            <p data-words>{p.text}</p>
          </article>
        ))}
      </div>
    </Reveal>
    </>
  );
}
