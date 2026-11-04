import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import App from '../../example/App';

const ROOT_ID = 'rdmd-demo';

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
    Promise.all(pending.map(img => img.decode().catch(() => undefined))),
    new Promise(resolve => {
      setTimeout(resolve, 8_000);
    }),
  ]);
}

/** Render one demo fixture the way `npm run start` does with `?ci=true`. */
export async function renderFixture(fixture: string, search = 'ci=true&darkModeDataAttribute=true') {
  document.body.style.margin = '0';
  mount(`#/${fixture}?${search}`);
  await waitForMarkup();
  await document.fonts.ready;
  await settleImages();
}
