import React, { useEffect, useRef, useState } from 'react';

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

const VISIBLE_RATIO = 0.4;
/** Tolerance for subpixel rounding when checking if scrolled to the bottom. */
const SCROLL_BOTTOM_TOLERANCE = 1;

/**
 * Walk up the DOM to find the nearest scrollable ancestor.
 * Falls back to `window` when the page itself scrolls.
 */
function getScrollParent(el: HTMLElement): HTMLElement | Window {
  let parent = el.parentElement;
  while (parent) {
    const { overflow, overflowY } = getComputedStyle(parent);
    if (/(auto|scroll)/.test(overflow + overflowY) && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
}

/**
 * Watches headings in the viewport and toggles `active` on the
 * corresponding TOC links so the reader always knows where they are.
 */
function useScrollHighlight(navRef: React.RefObject<HTMLElement | null>) {
  const [linkCount, setLinkCount] = useState(0);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const count = nav.querySelectorAll('a[href^="#"]').length;
    setLinkCount(count);
  }, [navRef]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof IntersectionObserver === 'undefined' || linkCount === 0) return undefined;

    const linkMap = buildLinkMap(nav);
    if (linkMap.size === 0) return undefined;

    const headings = [...linkMap.keys()]
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return undefined;

    let activeId: string | null = null;
    let clickLocked = false;
    const visible = new Set<string>();
    const scrollParent = getScrollParent(headings[0]);

    const isAtBottom = () => {
      if (scrollParent instanceof Window) {
        return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - SCROLL_BOTTOM_TOLERANCE;
      }
      return scrollParent.scrollTop + scrollParent.clientHeight >= scrollParent.scrollHeight - SCROLL_BOTTOM_TOLERANCE;
    };

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

    const updateActive = () => {
      if (clickLocked) return;

      if (isAtBottom()) {
        activate(headings[headings.length - 1].id);
        return;
      }

      const topmost = headings.find(el => visible.has(el.id));
      if (topmost) activate(topmost.id);
    };

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        updateActive();
      },
      { rootMargin: `0px 0px -${(1 - VISIBLE_RATIO) * 100}% 0px`, threshold: 0 },
    );

    // Check on scroll so bottom-of-page detection works even when
    // no headings are crossing the intersection boundary.
    const scrollTarget = scrollParent instanceof Window ? window : scrollParent;
    const onScroll = () => { updateActive(); };

    // Click a ToC link → immediately activate it, suppress the observer
    // until the smooth scroll finishes, then hand control back.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.('a[href^="#"]');
      if (!anchor) return;
      const id = decodeURIComponent(anchor.getAttribute('href')!.slice(1));
      if (!linkMap.has(id)) return;

      e.preventDefault();
      activate(id);
      clickLocked = true;

      const unlock = () => { clickLocked = false; };
      scrollTarget.addEventListener('scrollend', unlock, { once: true });

      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    headings.forEach(el => { observer.observe(el); });
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    nav.addEventListener('click', onClick);

    // Set initial active state for the first heading visible in the viewport,
    // falling back to the first heading if none is in the observation zone yet.
    const initialHeading = headings.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight * VISIBLE_RATIO;
    }) || headings[0];
    activate(initialHeading.id);

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', onScroll);
      nav.removeEventListener('click', onClick);
    };
  }, [navRef, linkCount]);
}

function TableOfContents({ children }: React.PropsWithChildren) {
  const navRef = useRef<HTMLElement>(null);
  useScrollHighlight(navRef);

  return (
    <nav ref={navRef} aria-label="Table of contents" className="rm-ToC">
      <ul className="toc-list">
        <li className="toc-children">{children}</li>
      </ul>
    </nav>
  );
}

export default TableOfContents;
