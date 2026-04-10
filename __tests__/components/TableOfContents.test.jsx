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
      window.location.hash = '';
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
      expect(window.location.hash).toBe('#heading-2');

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
