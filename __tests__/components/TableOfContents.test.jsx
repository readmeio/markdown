import { render, act } from '@testing-library/react';
import React from 'react';

import TableOfContents from '../../components/TableOfContents';
import { utils, reactProcessor, reactTOC } from '../../index';

const { GlossaryContext, VariablesContext } = utils;
const variables = {
  defaults: [{ test: 'Default Value' }],
  user: { test: 'User Override' },
};
const glossaryTerms = [
  {
    term: 'demo',
    definition: 'a thing that breaks on presentation',
  },
];

describe('Table of Contents', () => {
  it('should render toc children', () => {
    const { container } = render(
      <TableOfContents>
        <h1>Heading 1</h1>
      </TableOfContents>,
    );

    expect(container.querySelector('.toc-children')).toHaveTextContent('Heading 1');
  });

  it.skip('generates TOC from headings', () => {
    const txt = '# Heading Zed\n\n# Heading One';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
  });

  it.skip('includes two heading levels', () => {
    const txt = '# Heading Zed\n\n## Subheading One\n\n### Deep Heading Two';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it.skip('normalizes root depth level', () => {
    const txt = '##### Heading Zed\n\n###### Subheading Zed';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(toc);

    expect(container.querySelectorAll('li > a[href]:not([href="#"])')).toHaveLength(2);
  });

  it.skip('includes variables', () => {
    const txt = '# Heading <<test>>';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(<VariablesContext.Provider value={variables}>{toc}</VariablesContext.Provider>);

    expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(`Heading ${variables.user.test}`);
  });

  it.skip('includes glossary items', () => {
    const txt = '# Heading <<glossary:demo>>';
    const ast = reactProcessor().parse(txt);
    const toc = reactTOC(ast);
    const { container } = render(<GlossaryContext.Provider value={glossaryTerms}>{toc}</GlossaryContext.Provider>);

    expect(container.querySelector('li > a[href]:not([href="#"])')).toHaveTextContent(
      `Heading ${glossaryTerms[0].term}`,
    );
  });

  describe('scroll highlight', () => {
    let observerCallback;
    let observedElements;

    let scrollContainer;

    beforeEach(() => {
      observedElements = [];
      // Mock IntersectionObserver
      global.IntersectionObserver = class {
        constructor(callback) {
          observerCallback = callback;
        }
        observe(el) { observedElements.push(el); }
        disconnect() {}
      };

      // Create a scrollable container (mimics ReadMe's nested scroll div)
      scrollContainer = document.createElement('div');
      Object.defineProperties(scrollContainer, {
        scrollTop: { value: 0, writable: true },
        clientHeight: { value: 800, writable: true },
        scrollHeight: { value: 2000, writable: true },
      });
      scrollContainer.style.overflow = 'auto';
      document.body.appendChild(scrollContainer);

      // Create headings inside the scroll container
      ['heading-1', 'heading-2', 'heading-3'].forEach(id => {
        const el = document.createElement('h2');
        el.id = id;
        el.getBoundingClientRect = () => ({ top: 100, height: 30 });
        el.scrollIntoView = vi.fn();
        scrollContainer.appendChild(el);
      });
    });

    afterEach(() => {
      scrollContainer?.remove();
      delete global.IntersectionObserver;
    });

    it('should highlight the first visible heading, not the last', async () => {
      // In jsdom (and in ReadMe where content scrolls in a container),
      // isAtBottom() returns true because window.scrollY is 0 and
      // scrollHeight <= innerHeight. This bug causes the TOC to always
      // highlight the last heading.
      const { container } = render(
        <TableOfContents>
          <a href="#heading-1">Heading 1</a>
          <a href="#heading-2">Heading 2</a>
          <a href="#heading-3">Heading 3</a>
        </TableOfContents>,
      );

      // Wait for the useEffect to run
      await act(async () => {});

      // Simulate the first heading entering the viewport
      act(() => {
        observerCallback([
          { target: document.getElementById('heading-1'), isIntersecting: true },
        ]);
      });

      const links = container.querySelectorAll('a');
      const firstLink = [...links].find(a => a.getAttribute('href') === '#heading-1');
      const lastLink = [...links].find(a => a.getAttribute('href') === '#heading-3');

      expect(firstLink.classList.contains('active')).toBe(true);
      expect(lastLink.classList.contains('active')).toBe(false);
    });

    it('should resume scroll tracking after clicking a TOC link', async () => {
      const { container } = render(
        <TableOfContents>
          <a href="#heading-1">Heading 1</a>
          <a href="#heading-2">Heading 2</a>
          <a href="#heading-3">Heading 3</a>
        </TableOfContents>,
      );

      await act(async () => {});

      const links = container.querySelectorAll('a');
      const secondLink = [...links].find(a => a.getAttribute('href') === '#heading-2');

      // Click a TOC link
      act(() => {
        secondLink.click();
      });

      expect(secondLink.classList.contains('active')).toBe(true);
      // The handler must NOT set window.location.hash directly — in frame
      // preview the iframe's location is stale and writing to it navigates
      // back to the wrong page. The browser's default <a> behavior or the
      // FramePreview delegator handles the hash update instead.
      expect(window.location.hash).toBe('');

      // Simulate scrollend on the scroll container (not window)
      act(() => {
        scrollContainer.dispatchEvent(new Event('scrollend'));
      });

      // Observer fires with heading-1 visible — should update since click lock is released
      act(() => {
        observerCallback([
          { target: document.getElementById('heading-1'), isIntersecting: true },
        ]);
      });

      const firstLink = [...links].find(a => a.getAttribute('href') === '#heading-1');
      expect(firstLink.classList.contains('active')).toBe(true);
      expect(secondLink.classList.contains('active')).toBe(false);
    });

    it('should rebuild linkMap when children change (page navigation)', async () => {
      // Simulate page navigation: TOC re-renders with new children
      // but the TableOfContents instance persists (same position in tree).
      // The click handler must recognize the NEW heading IDs.

      // Add new headings to the DOM for "page 2"
      ['new-heading-1', 'new-heading-2'].forEach(id => {
        const el = document.createElement('h2');
        el.id = id;
        el.getBoundingClientRect = () => ({ top: 100, height: 30 });
        scrollContainer.appendChild(el);
      });

      const { container, rerender } = render(
        <TableOfContents>
          <a href="#heading-1">Heading 1</a>
          <a href="#heading-2">Heading 2</a>
          <a href="#heading-3">Heading 3</a>
        </TableOfContents>,
      );

      await act(async () => {});

      // "Navigate" to a new page — rerender with different children
      rerender(
        <TableOfContents>
          <a href="#new-heading-1">New Heading 1</a>
          <a href="#new-heading-2">New Heading 2</a>
        </TableOfContents>,
      );

      // Wait for effects to detect the content change and rebuild
      await act(async () => {});

      const links = container.querySelectorAll('a');
      const newLink = [...links].find(a => a.getAttribute('href') === '#new-heading-1');

      // Click a link from the new page — the handler should recognize it
      act(() => {
        newLink.click();
      });

      expect(newLink.classList.contains('active')).toBe(true);
    });

    describe('active link auto-scroll', () => {
      it('scrolls the TOC-local scroll container when the active link is out of view, without scrollIntoView', async () => {
        // The TOC has its own scroll area (separate from the content scroller).
        const tocScrollContainer = document.createElement('div');
        Object.defineProperties(tocScrollContainer, {
          scrollTop: { value: 100, writable: true },
          clientHeight: { value: 200, writable: true },
          scrollHeight: { value: 600, writable: true },
        });
        tocScrollContainer.style.overflow = 'auto';
        tocScrollContainer.scrollTo = vi.fn();
        tocScrollContainer.getBoundingClientRect = () => ({ top: 0, bottom: 200, height: 200 });
        document.body.appendChild(tocScrollContainer);

        const { container } = render(
          <TableOfContents>
            <a href="#heading-1">Heading 1</a>
            <a href="#heading-2">Heading 2</a>
            <a href="#heading-3">Heading 3</a>
          </TableOfContents>,
          { container: tocScrollContainer },
        );

        await act(async () => {});

        // The link for heading-2 sits below the TOC scroller's viewport.
        const secondLink = [...container.querySelectorAll('a')].find(a => a.hash === '#heading-2');
        secondLink.getBoundingClientRect = () => ({ top: 250, bottom: 270, height: 20 });
        secondLink.scrollIntoView = vi.fn();

        act(() => {
          observerCallback([{ target: document.getElementById('heading-2'), isIntersecting: true }]);
        });

        // Scrolled just far enough to reveal the link (block: 'nearest' semantics),
        // on the TOC's own scroller only.
        expect(tocScrollContainer.scrollTo).toHaveBeenCalledWith({ top: 100 + (270 - 200), behavior: 'smooth' });
        // scrollIntoView walks every scrollable ancestor and cancels in-flight
        // smooth scrolls on the page's content scroller (CX-3667) — it must not be used.
        expect(secondLink.scrollIntoView).not.toHaveBeenCalled();

        tocScrollContainer.remove();
      });

      it('never scrolls a container that holds the page content (CX-3667)', async () => {
        // No TOC-local scroll area: the TOC lives directly inside the content
        // scroller, so the link's nearest scrollable ancestor is the same
        // scroller the page animates during navigation. Auto-scrolling it would
        // cancel the hub's scroll-to-top reset.
        scrollContainer.scrollTo = vi.fn();
        scrollContainer.getBoundingClientRect = () => ({ top: 0, bottom: 800, height: 800 });

        // Render into a plain wrapper inside the content scroller (rendering
        // straight into scrollContainer would wipe the headings from the DOM).
        const wrapper = document.createElement('div');
        scrollContainer.appendChild(wrapper);

        const { container } = render(
          <TableOfContents>
            <a href="#heading-1">Heading 1</a>
            <a href="#heading-2">Heading 2</a>
            <a href="#heading-3">Heading 3</a>
          </TableOfContents>,
          { container: wrapper },
        );

        await act(async () => {});

        // Even with the active link far out of view, the shared scroller stays put.
        const secondLink = [...container.querySelectorAll('a')].find(a => a.hash === '#heading-2');
        secondLink.getBoundingClientRect = () => ({ top: 5000, bottom: 5020, height: 20 });
        secondLink.scrollIntoView = vi.fn();

        act(() => {
          observerCallback([{ target: document.getElementById('heading-2'), isIntersecting: true }]);
        });

        expect(secondLink.classList.contains('active')).toBe(true);
        expect(scrollContainer.scrollTo).not.toHaveBeenCalled();
        expect(secondLink.scrollIntoView).not.toHaveBeenCalled();
      });
    });

    it('should work when hrefs contain query params (frame preview mode)', async () => {
      // In frame preview mode, links may include query params before the hash,
      // e.g. href="?isFramePreview=true#heading-1" instead of "#heading-1".
      // The TOC must still detect these links via HTMLAnchorElement.hash and
      // must NOT set window.location.hash (the iframe's location is stale).

      const { container } = render(
        <TableOfContents>
          <a href="?isFramePreview=true#heading-1">Heading 1</a>
          <a href="?isFramePreview=true#heading-2">Heading 2</a>
          <a href="?isFramePreview=true#heading-3">Heading 3</a>
        </TableOfContents>,
      );

      await act(async () => {});

      // Observer should be watching the headings
      expect(observedElements.map(el => el.id)).toEqual(
        expect.arrayContaining(['heading-1', 'heading-2', 'heading-3']),
      );

      // Simulate a heading entering the viewport
      act(() => {
        observerCallback([
          { target: document.getElementById('heading-1'), isIntersecting: true },
        ]);
      });

      const links = container.querySelectorAll('a');
      const firstLink = [...links].find(a => a.hash === '#heading-1');
      expect(firstLink.classList.contains('active')).toBe(true);

      // Click should activate without setting window.location.hash
      const secondLink = [...links].find(a => a.hash === '#heading-2');
      act(() => {
        secondLink.click();
      });

      expect(secondLink.classList.contains('active')).toBe(true);
    });
  });

  it('renders with rm-ToC class', () => {
    const { container } = render(
      <TableOfContents>
        <h1>Heading 1</h1>
      </TableOfContents>,
    );

    expect(container.querySelector('.rm-ToC')).toBeInTheDocument();
  });
});
