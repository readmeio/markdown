import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import App from '../../example/App';

import { cssContentText } from './css-content';

const ROOT_ID = 'rdmd-demo';

/** Same kit `example/index.html` loads. The webpack demo always had it; this harness has to ask. */
const FONT_AWESOME_KIT = 'https://kit.fontawesome.com/261068b9c7.css';

const ICON_FONT = /font awesome|fontawesome/i;

/** Cold CI has to download the kit's @import webfonts. This is a ceiling, not a sleep. */
const ICON_FONT_TIMEOUT_MS = 10_000;

let root: Root | null = null;

function mountPoint() {
  let el = document.getElementById(ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ROOT_ID;
    document.body.appendChild(el);
  }
  return el;
}

function mount(hash: string) {
  // Drop the previous router before changing the hash so the next mount
  // reads the fixture we just requested, not the previous page.
  root?.unmount();
  root = null;
  window.location.hash = hash;
  root = createRoot(mountPoint());
  root.render(<App />);
}

async function waitForMarkup() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const error = document.querySelector('.rdmd-demo--strip-error');
    if (error?.textContent?.trim()) {
      throw new Error(error.textContent.trim());
    }
    const body = document.querySelector('#hub-content .markdown-body');
    if (body && body.childElementCount > 0) return;
    // The fixture compile is async; keep polling until it paints.
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });
  }
  throw new Error('markdown did not render');
}

/** Lazy images report `complete` before they download, then expand the document. */
export async function settleImages() {
  const pending = [...document.images].flatMap(img => {
    const lazy = img.loading === 'lazy';
    if (lazy) img.loading = 'eager';
    if (!img.getAttribute('src') || (img.complete && img.naturalWidth > 0)) return [];
    // A lazy image can look complete before the browser fetches it. Kick the
    // request once; SVGs with no intrinsic size stay at naturalWidth 0.
    if (lazy && img.naturalWidth === 0) {
      const src = img.src;
      img.removeAttribute('src');
      img.src = src;
    }
    return [img];
  });
  if (!pending.length) return;

  await Promise.race([
    Promise.all(pending.map(img => img.decode().catch(() => {}))),
    new Promise(resolve => {
      setTimeout(resolve, 8_000);
    }),
  ]);
}

/**
 * Callout icon fonts and `fa-*` classes paint from the kit. `document.fonts.ready`
 * resolves before that stylesheet arrives, so the glyph is missing in the shot.
 */
function loadFontAwesomeKit() {
  document.querySelector(`link[href="${FONT_AWESOME_KIT}"][data-failed]`)?.remove();

  const link =
    document.querySelector<HTMLLinkElement>(`link[href="${FONT_AWESOME_KIT}"]`) ?? document.createElement('link');
  if (link.dataset.loaded === 'true') return Promise.resolve();

  if (!link.parentNode) {
    link.rel = 'stylesheet';
    link.href = FONT_AWESOME_KIT;
    link.crossOrigin = 'anonymous';
  }

  const pending = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Font Awesome kit timed out (${FONT_AWESOME_KIT})`));
    }, ICON_FONT_TIMEOUT_MS);
    const finish = (error?: Error) => {
      clearTimeout(timer);
      if (error) {
        link.dataset.failed = 'true';
        reject(error);
        return;
      }
      link.dataset.loaded = 'true';
      resolve();
    };
    link.addEventListener('load', () => finish(), { once: true });
    link.addEventListener(
      'error',
      () => {
        finish(new Error(`Font Awesome kit failed to load (${FONT_AWESOME_KIT})`));
      },
      { once: true },
    );
  });

  if (!link.parentNode) document.head.append(link);
  return pending;
}

/** Font shorthand plus the glyph, for each icon pseudo that uses the kit. */
function iconFontSamples() {
  const samples = new Map<string, string>();
  for (const el of document.querySelectorAll('.callout-icon, i[class*="fa-"]')) {
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(el, pseudo);
      const text = ICON_FONT.test(style.fontFamily) ? cssContentText(style.content) : '';
      if (text) samples.set(style.font, (samples.get(style.font) ?? '') + text);
    }
  }
  return [...samples];
}

function pageExpectsIconFont() {
  return iconFontSamples().length > 0 || document.querySelector('i[class*="fa-"], .callout-icon_fa') !== null;
}

/** `'unused'` when this page has no icon font, `'painted'` once the faces are on screen. */
async function iconFontsReady() {
  if (!pageExpectsIconFont()) return 'unused';

  const pending = iconFontSamples();
  if (!pending.length) return 'waiting';

  const loaded = await Promise.all(
    pending.map(async ([font, text]): Promise<FontFace[]> => {
      try {
        return await document.fonts.load(font, text);
      } catch {
        return [];
      }
    }),
  );
  if (!loaded.every(faces => faces.length > 0)) return 'waiting';

  await document.fonts.ready;
  // The screenshot reads the next paint, after the face is applied.
  await new Promise(resolve => {
    requestAnimationFrame(() => resolve());
  });
  return 'painted';
}

async function settleIconFonts() {
  let kitError: Error | undefined;
  try {
    await loadFontAwesomeKit();
  } catch (error) {
    kitError = error instanceof Error ? error : new Error(String(error));
  }

  const deadline = Date.now() + ICON_FONT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    // The kit's @import faces show up a tick after the link's load event.
    // eslint-disable-next-line no-await-in-loop
    const ready = await iconFontsReady();
    if (ready === 'unused') {
      if (kitError) console.warn(kitError.message);
      return;
    }
    if (kitError) throw kitError;
    if (ready === 'painted') return;

    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });
  }

  throw new Error('Font Awesome icons did not load before the screenshot');
}

/** Render one demo fixture the way `npm run start` does with `?ci=true`. */
export async function renderFixture(fixture: string, search = 'ci=true&darkModeDataAttribute=true') {
  document.body.style.margin = '0';
  mount(`#/${fixture}?${search}`);
  await waitForMarkup();
  await settleIconFonts();
  await document.fonts.ready;
  await settleImages();
}
