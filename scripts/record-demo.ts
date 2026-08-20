/**
 * Re-records the cross-remote demo in README.md.
 *
 * This exists because the previous GIF was produced by hand, and its
 * burned-in caption went on describing a "typed event bus" long after that
 * bus was replaced by props. Nobody noticed, because nobody could regenerate
 * it to find out. A committed script makes the demo a build artifact of the
 * real applications rather than a screen capture whose provenance is lost.
 *
 * It drives the actual apps. The two panes are same-origin iframes, so the
 * shell's BroadcastChannel relay genuinely carries the event between them —
 * the KPI moves because the bus works, not because this script typed a
 * number into the page. If the architecture breaks, the recording breaks,
 * which is the property worth having.
 *
 * Run it with the dev servers already up:
 *
 *   pnpm dev            # in one terminal
 *   pnpm demo:record    # in another
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { PNG } from 'pngjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(REPO_ROOT, 'docs/assets/cross-remote-kpi.gif');
const SHELL = 'http://localhost:3000';

/** Milliseconds between captured frames, and the delay written into the GIF. */
const STEP = 130;
/** How long the finished state stays on screen before the loop restarts. */
const HOLD = 1800;

/**
 * Both panes are scrolled here before anything is recorded.
 *
 * At this width the apps stack their nav under the header, so the part worth
 * filming — the KPI on one side, the table on the other — starts about this
 * far down. Scrolling to it rather than filming from the top is what keeps
 * the payoff on screen when the number changes.
 */
const CONTENT_OFFSET = 225;

function fail(message: string): never {
  console.error(`record-demo: ${message}`);
  process.exit(1);
}

async function requireDevServer(): Promise<void> {
  try {
    const response = await fetch(SHELL, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(String(response.status));
  } catch {
    fail(`${SHELL} is not responding. Start the apps first with \`pnpm dev\`.`);
  }
}

/**
 * The composition around the two apps: a label per pane and the caption.
 *
 * Written here rather than kept as an .html file next to this script because
 * it is not a page anyone visits — it is a frame around two iframes that
 * exists for the length of one recording.
 */
const SCENE = `
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; background: #0b0f14; }
  body {
    font: 500 13px/1.4 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
    color: #8b98a9; padding: 14px; width: 1140px;
  }
  .row { display: flex; gap: 14px; }
  .pane { display: flex; flex-direction: column; gap: 6px; }
  .label { padding-left: 2px; }
  .label b { color: #e6edf5; font-weight: 600; }
  .label span { color: #5c6a7d; font-weight: 400; }
  iframe {
    width: 556px; height: 420px; border: 1px solid #202a36;
    border-radius: 8px; background: #0d1117;
  }
  .caption {
    margin-top: 12px; padding-left: 2px; height: 16px;
    color: #4a9eff; font-size: 12px; font-weight: 500;
    opacity: 0; transition: opacity .25s ease;
  }
  .caption.on { opacity: 1; }
  .caption i { color: #6b7a8d; font-style: normal; }
</style>
<div class="row">
  <div class="pane">
    <div class="label"><b>admin</b> <span>&mdash; tab 1</span></div>
    <iframe id="admin" src="${SHELL}/admin"></iframe>
  </div>
  <div class="pane">
    <div class="label"><b>dashboard</b> <span>&mdash; tab 2</span></div>
    <iframe id="dashboard" src="${SHELL}/dashboard"></iframe>
  </div>
</div>
<div class="caption" id="caption">
  dashboard's KPI moved <i>&mdash; host-owned bus, across tabs, no reload</i>
</div>
`;

/**
 * Encodes the captured frames.
 *
 * Two choices keep a clip this size under a tenth of a megabyte. One palette
 * is computed for the whole animation instead of one per frame, so a later
 * frame reuses indices rather than shipping a fresh colour table. And every
 * pixel identical to the previous frame is written as the transparent index
 * over `dispose: 1`, which leaves what is already on screen — turning most of
 * each frame into a long run of one value, the shape LZW compresses best.
 * Encoding the same take naively produced roughly seven times as much.
 */
function encode(frames: readonly Buffer[]): Uint8Array {
  const decoded = frames.map((frame) => PNG.sync.read(frame));
  const first = decoded[0];
  if (!first) fail('no frames were captured.');
  const { width, height } = first;

  // Every third frame is enough to see every colour the animation uses, and
  // quantizing the full set is needlessly slow.
  const sample = Buffer.concat(
    decoded.filter((_, index) => index % 3 === 0).map((png) => Buffer.from(png.data)),
  );
  const palette = quantize(new Uint8ClampedArray(sample), 255);
  const transparentIndex = palette.length;
  palette.push([0, 0, 0]);

  const gif = GIFEncoder();
  let previous: Buffer | null = null;

  for (const [index, png] of decoded.entries()) {
    const indexed = applyPalette(png.data, palette);
    if (previous) {
      for (let pixel = 0; pixel < indexed.length; pixel++) {
        const offset = pixel * 4;
        const unchanged =
          png.data[offset] === previous[offset] &&
          png.data[offset + 1] === previous[offset + 1] &&
          png.data[offset + 2] === previous[offset + 2];
        if (unchanged) indexed[pixel] = transparentIndex;
      }
    }
    const isFirst = index === 0;
    const options = {
      first: isFirst,
      delay: index === decoded.length - 1 ? HOLD : STEP,
      transparent: !isFirst,
      transparentIndex,
      dispose: 1,
    };
    // The palette is written once, with the first frame. Passing it again
    // would embed a local colour table in every frame — the cost this
    // encoding exists to avoid.
    gif.writeFrame(indexed, width, height, isFirst ? { ...options, palette } : options);
    previous = png.data;
  }

  gif.finish();
  return gif.bytes();
}

async function main(): Promise<void> {
  await requireDevServer();

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1168, height: 512 },
    deviceScaleFactor: 1,
  });
  await page.setContent(SCENE);

  const admin = page.frameLocator('#admin');
  const dashboard = page.frameLocator('#dashboard');

  // Nothing is recorded until both remotes have actually composed, so a slow
  // first federation load never shows up as empty frames at the start.
  await admin.getByRole('heading', { name: 'Admin' }).waitFor({ timeout: 60_000 });
  await dashboard.getByText('1,204').waitFor({ timeout: 60_000 });

  // The scene is not same-origin with the apps, so the iframes are scrolled
  // through their own frame context rather than through contentWindow.
  const frameFor = (path: string) => {
    const frame = page.frames().find((candidate) => candidate.url().includes(path));
    if (!frame) fail(`the ${path} iframe never loaded.`);
    return frame;
  };
  await frameFor('/dashboard').evaluate((offset) => window.scrollTo(0, offset), CONTENT_OFFSET);

  const frames: Buffer[] = [];
  let recording = true;
  const capturing = (async () => {
    while (recording) {
      frames.push(await page.screenshot({ type: 'png' }));
      await page.waitForTimeout(STEP);
    }
  })();

  const beat = (ms: number) => page.waitForTimeout(ms);

  await beat(750);
  await admin.getByRole('button', { name: /sign in/i }).click();
  await beat(450);
  await admin.getByRole('button', { name: /invite or edit user/i }).click();
  await beat(650);
  await admin.getByLabel(/change an existing user's role/i).click();
  await beat(500);
  await admin.getByLabel('New role').selectOption('editor');
  await beat(650);
  await admin.getByRole('button', { name: /^submit$/i }).click();

  // The assertion the whole recording exists to make. If the bus stops
  // working this times out, and no misleading GIF is written.
  await dashboard.getByText('1,205').waitFor({ timeout: 20_000 });

  // Clicking through the table scrolled admin away; put it back so the last
  // frame shows the changed role and the moved KPI side by side.
  await frameFor('/admin').evaluate(
    (offset) => window.scrollTo(0, offset as number),
    CONTENT_OFFSET,
  );
  await page.locator('#caption').evaluate((element) => element.classList.add('on'));
  await beat(HOLD);

  recording = false;
  await capturing;
  await browser.close();

  const bytes = encode(frames);
  writeFileSync(OUTPUT, Buffer.from(bytes));
  console.log(`record-demo — ${frames.length} frames, ${(bytes.length / 1024).toFixed(0)} KB`);
  console.log(`  ${OUTPUT}`);
}

// Matches every other script here: `tsx` compiles to CJS in this workspace,
// where a top-level await does not survive the transform.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
