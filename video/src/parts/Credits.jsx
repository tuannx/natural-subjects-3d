import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fade } from './fade.js';

// Closing card with the license credit the lesson requires (CC BY-NC 4.0).
export const Credits = ({ m }) => {
  const frame = useCurrentFrame(), { durationInFrames, width } = useVideoConfig();
  const s = width / 1280;
  const credit = m.source === 'tongjiang-lab'
    ? 'Adapted from Tongjiang Lab (lab.tongjiang.app). Translated into English; changes made.'
    : 'An original Natural Subjects 3D lesson.';
  return (
    <AbsoluteFill style={{ background: '#0b1430', color: '#fff', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 80 * s, opacity: fade(frame, durationInFrames) }}>
      <div style={{ fontSize: 46 * s, fontWeight: 800 }}>Try it yourself in 3D</div>
      <div style={{ fontSize: 28 * s, marginTop: 14 * s, opacity: 0.9 }}>Natural Subjects 3D · /{m.slug}</div>
      <div style={{ fontSize: 20 * s, marginTop: 40 * s, opacity: 0.75, maxWidth: 900 * s, lineHeight: 1.4 }}>
        {credit} Licensed under CC BY-NC 4.0: free for non-commercial use with credit.
      </div>
    </AbsoluteFill>
  );
};
