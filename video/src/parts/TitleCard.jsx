import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { fade } from './fade.js';

export const TitleCard = ({ m }) => {
  const frame = useCurrentFrame(), { fps, durationInFrames, width } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });
  const s = width / 1280;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg,#1f7ae0,#0b1430)', color: '#fff', justifyContent: 'center', padding: 90 * s, opacity: fade(frame, durationInFrames) }}>
      <div style={{ transform: `translateY(${(1 - rise) * 40 * s}px)` }}>
        <div style={{ fontSize: 24 * s, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.8 }}>
          Natural Subjects 3D · Ages {m.ages.replace('-', '–')}
        </div>
        <div style={{ fontSize: 64 * s, fontWeight: 800, lineHeight: 1.1, margin: `${16 * s}px 0` }}>{m.title}</div>
        <div style={{ fontSize: 32 * s, opacity: 0.9 }}>{m.question}</div>
      </div>
    </AbsoluteFill>
  );
};
