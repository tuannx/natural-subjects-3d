import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { fade } from './fade.js';

// One lesson step: the captured frames, with a caption card that slides in.
export const StepClip = ({ m, step, index }) => {
  const frame = useCurrentFrame(), { fps, durationInFrames, width } = useVideoConfig();
  const k = Math.min(step.frames - 1, Math.floor((frame * m.captureFps) / fps));
  const s = width / 1280, inK = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ opacity: fade(frame, durationInFrames, 8) }}>
      <Img src={staticFile(`captures/${m.slug}/${index}/${k}.jpg`)} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', left: 40 * s, bottom: 40 * s, maxWidth: 760 * s, padding: `${18 * s}px ${24 * s}px`, borderRadius: 20 * s,
        background: 'rgba(255,255,255,.94)', color: '#1d2b36', boxShadow: '0 8px 30px rgba(0,0,0,.25)',
        transform: `translateY(${(1 - inK) * 30 * s}px)`, opacity: inK }}>
        <div style={{ fontSize: 18 * s, fontWeight: 800, color: '#1f7ae0', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          Step {index + 1} of {m.steps.length}
        </div>
        <div style={{ fontSize: 34 * s, fontWeight: 800, lineHeight: 1.15, marginTop: 4 * s }}>{step.title}</div>
        {step.text ? <div style={{ fontSize: 23 * s, lineHeight: 1.35, marginTop: 8 * s }}>{step.text}</div> : null}
      </div>
    </AbsoluteFill>
  );
};
