/** A blank document so injected CSS is not mixed with the Vitest page. */
export function renderIsolated(css: string, html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'width: 1400px; height: 800px; border: 0;');
  document.body.replaceChildren(iframe);

  const doc = iframe.contentDocument;
  const view = iframe.contentWindow;
  if (!doc || !view) throw new Error('iframe document is unavailable');

  doc.head.append(Object.assign(doc.createElement('style'), { textContent: css }));
  doc.body.innerHTML = html;
  return { doc, view };
}
