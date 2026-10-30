import { AbsoluteFill, Series } from 'remotion';
import { TitleCard } from './parts/TitleCard.jsx';
import { StepClip } from './parts/StepClip.jsx';
import { Credits } from './parts/Credits.jsx';

export const INTRO = 3; // seconds
export const OUTRO = 4;

export const Lesson = ({ manifest: m }) => (
  <AbsoluteFill style={{ background: '#0b1430', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
    <Series>
      <Series.Sequence durationInFrames={INTRO * m.fps}><TitleCard m={m} /></Series.Sequence>
      {m.steps.map((s, i) => (
        <Series.Sequence key={i} durationInFrames={Math.round((s.frames / m.captureFps) * m.fps)}>
          <StepClip m={m} step={s} index={i} />
        </Series.Sequence>
      ))}
      <Series.Sequence durationInFrames={OUTRO * m.fps}><Credits m={m} /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
