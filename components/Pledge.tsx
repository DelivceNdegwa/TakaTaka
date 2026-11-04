import { Reveal } from './Reveal';

export function Pledge() {
  return (
    <Reveal as="section" className="pledge columns">
      <h2 data-rise>Tuna taka taka.<span>Tunataka Nairobi safi.</span></h2>
      <p data-words>We have waste. We want a clean Nairobi. Sort at home, bring your bottles to a collection point, and get your estate, school or office on board.</p>
      <div className="actions" data-rise>
        <a className="btn" href="#play">Play the sorting game</a>
        <a className="btn btn--ghost" href="mailto:hello@takagreen.example">Bring Taka Green to your estate</a>
      </div>
      <footer className="foot">
        <span>Taka Green, Nairobi</span>
        <span>Contact details to be confirmed</span>
      </footer>
    </Reveal>
  );
}
