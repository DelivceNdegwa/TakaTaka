import { Cursor } from '@/components/Cursor';
import { FlipSide } from '@/components/FlipSide';
import { Gate } from '@/components/Gate';
import { Header } from '@/components/Header';
import { Pledge } from '@/components/Pledge';
import { SmoothScroll } from '@/components/SmoothScroll';
import { SortGame } from '@/components/SortGame';
import { Story } from '@/components/Story';
import { Uses } from '@/components/Uses';

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Gate />
      <Cursor />
      <Header />
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
