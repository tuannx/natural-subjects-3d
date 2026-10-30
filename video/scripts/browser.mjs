// Chrome for capture and rendering. Remotion downloads a headless Chrome on first use; set
// REMOTION_BROWSER=/path/to/chrome-headless-shell to use one you already have (e.g. offline).
import { ensureBrowser } from '@remotion/renderer';

export async function browserPath() {
  if (process.env.REMOTION_BROWSER) return process.env.REMOTION_BROWSER;
  const s = await ensureBrowser();
  if (!s.path) throw new Error('No browser available for Remotion: ' + JSON.stringify(s));
  return s.path;
}
