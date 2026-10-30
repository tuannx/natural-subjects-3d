import { Composition } from 'remotion';
import { Lesson, INTRO, OUTRO } from './Lesson.jsx';

// Duration and size come from the capture manifest passed as input props.
const calculateMetadata = ({ props }) => {
  const m = props.manifest;
  const steps = m.steps.reduce((n, s) => n + Math.round((s.frames / m.captureFps) * m.fps), 0);
  return { durationInFrames: INTRO * m.fps + steps + OUTRO * m.fps, fps: m.fps, width: m.width, height: m.height };
};

const sample = {
  slug: 'sample', title: 'Lesson title', question: 'Guiding question?', ages: '6-9', level: 'primary', source: 'original',
  width: 1280, height: 720, fps: 30, captureFps: 15, steps: [],
};

export const Root = () => (
  <Composition id="Lesson" component={Lesson} durationInFrames={150} fps={30} width={1280} height={720}
    defaultProps={{ manifest: sample }} calculateMetadata={calculateMetadata} />
);
