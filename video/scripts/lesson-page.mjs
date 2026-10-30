// What capture.mjs needs to know about the two kinds of lesson pages.

// Hide the on-screen interface so the video shows the 3D scene and its labels; Remotion adds captions.
// captions: leave room at the bottom for the video's caption card.
export async function hideChrome(page, kind, { captions = true } = {}) {
  if (kind === 'primary') {
    // The step bar stays (invisible, taller) so the camera frames the scene above the video captions.
    const steps = captions ? '.steps{visibility:hidden!important;height:210px!important}' : '.steps{display:none!important}';
    await page.addStyleTag({ content: `.bar,.card{display:none!important}${steps}.lab{font-size:${captions ? 20 : 15}px!important;padding:5px 12px!important}` });
    await page.evaluate(() => dispatchEvent(new Event('resize')));
    return;
  }
  // 3D lab lessons: fold both panels (the camera then frames the full width), then hide the bars.
  await page.evaluate(() => {
    for (const id of ['left', 'right']) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('collapsed')) el.querySelector('.fold')?.click();
    }
  });
  await page.addStyleTag({ content: '#top,#steps,#foot,.tab,#ns-dock,#toast,#left.collapsed,#right.collapsed{visibility:hidden!important}' });
}

// Caption for step i: primary lessons carry their own text; lab lessons have step titles only.
export function stepCaption(meta, i, count) {
  const s = meta.content?.steps?.[i];
  if (s) return { title: s.title, text: firstSentences(s.text) };
  if (meta.content && i >= meta.content.steps.length) return { title: 'Quick quiz', text: meta.content.quiz?.[0]?.q || '' };
  return { title: meta.steps?.[i] || `Step ${i + 1} of ${count}`, text: '' };
}

const firstSentences = (t, max = 150) => {
  let out = '';
  for (const s of t.match(/[^.!?]+[.!?]+/g) || [t]) { if ((out + s).length > max && out) break; out += s; }
  return out.trim();
};
