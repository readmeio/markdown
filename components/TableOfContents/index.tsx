import React, { useEffect, useRef } from 'react';

/**
 * Build link map and decode the hash to get the id and weird chars
 */
function buildLinkMap(nav: HTMLElement) {
  const map = new Map<string, HTMLAnchorElement[]>();

  Array.from(nav.querySelectorAll<HTMLAnchorElement>('a')).forEach(link => {
    const id = decodeURIComponent(link.hash.slice(1));
    if (!id) return;
    const list = map.get(id);
    if (list) list.push(link);
    else map.set(id, [link]);
  });

  return map;
}

/**
 * Watches headings in the viewport and toggles `active` on the
 * corresponding TOC links so the reader always knows where they are.
 */
function useScrollHighlight(navRef: React.RefObject<HTMLElement | null>, deps: unknown) {
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof IntersectionObserver === 'undefined') return;

    const linkMap = buildLinkMap(nav);
    if (linkMap.size === 0) return;

    const headings = [...linkMap.keys()]
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    let activeId: string | null = null;
    const visible = new Set<string>();

    const activate = (id: string | null) => {
      if (id === activeId) return;
      if (activeId) linkMap.get(activeId)?.forEach(a => a.classList.remove('active'));
      activeId = id;

      // set active states + border pos/size
      if (id) {
        const links = linkMap.get(id);
        links?.forEach(a => a.classList.add('active'));

        const link = links?.[0];
        if (link) {
          const navRect = nav.getBoundingClientRect();
          const linkRect = link.getBoundingClientRect();
          nav.style.setProperty('--ToC-border-active-height', `${linkRect.height}px`);
          nav.style.setProperty('--ToC-border-active-top', `${linkRect.top - navRect.top}px`);
        }
      }
    };

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        // Highlight the topmost visible heading; if none are visible,
        // keep the last active one so the user still has context.
        const topmost = headings.find(el => visible.has(el.id));
        if (topmost) activate(topmost.id);
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0 },
    );

    headings.forEach(el => { observer.observe(el); });
    // eslint-disable-next-line consistent-return
    return () => { observer.disconnect(); };
  }, [deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

function TableOfContents({ children }: React.PropsWithChildren<Record<string, never>>) {
  const navRef = useRef<HTMLElement>(null);
  useScrollHighlight(navRef, children);

  return (
    <nav ref={navRef} aria-label="Table of contents" className="rm-ToC" role="navigation">
      <ul className="toc-list">
        <li className="toc-children">{children}</li>
      </ul>
    </nav>
  );
}

export default TableOfContents;
