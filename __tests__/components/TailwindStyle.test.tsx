import { act, render, waitFor } from '@testing-library/react';
import postcss from 'postcss';
import React from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import TailwindStyle from '../../components/TailwindStyle';
import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';

vi.mock('../../utils/tailwind-compiler', () => ({
  tailwindCompiler: vi.fn().mockResolvedValue({ css: '.bg-red-500 { background: red; }' }),
}));

const compiled = (css: string) => postcss().process(css, { from: undefined }).sync();

const sheetOf = (container: HTMLElement) => container.querySelector('style[data-tailwind-stylesheet]');

describe('TailwindStyle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('before first paint (RM-19138)', () => {
    const content = <div className={`${tailwindPrefix} p-4`} />;

    it('writes the compiled sheet', async () => {
      const { container } = render(<TailwindStyle>{content}</TailwindStyle>);

      await waitFor(() => expect(sheetOf(container)?.textContent).toBe('.bg-red-500 { background: red; }'));
    });

    it('writes the recompiled sheet when added content brings new utilities', async () => {
      const { container } = render(<TailwindStyle>{content}</TailwindStyle>);
      await waitFor(() => expect(sheetOf(container)).not.toBeEmptyDOMElement());
      vi.mocked(tailwindCompiler).mockResolvedValueOnce(compiled('.m-2{}'));

      container.appendChild(Object.assign(document.createElement('div'), { className: `${tailwindPrefix} m-2` }));

      await waitFor(() => expect(sheetOf(container)?.textContent).toBe('.m-2{}'));
    });

    it('writes the recompiled sheet when the dark mode attribute changes', async () => {
      vi.mocked(tailwindCompiler).mockResolvedValueOnce(compiled('.old{}')).mockResolvedValueOnce(compiled('.new{}'));
      const { container, rerender } = render(<TailwindStyle darkModeDataAttribute="data-a">{content}</TailwindStyle>);

      rerender(<TailwindStyle darkModeDataAttribute="data-b">{content}</TailwindStyle>);
      await waitFor(() => expect(sheetOf(container)?.textContent).toBe('.new{}'));
    });
  });

  describe('on initial render', () => {
    it('collects classes from pre-existing .readme-tailwind elements', async () => {
      render(
        <TailwindStyle>
          <div className={`${tailwindPrefix} text-blue-500 font-bold`} />
        </TailwindStyle>,
      );

      await waitFor(() => {
        expect(tailwindCompiler).toHaveBeenCalledWith(
          expect.arrayContaining(['text-blue-500', 'font-bold']),
          expect.anything(),
        );
      });
    });

    it('passes darkModeRootSelector through to tailwindCompiler', async () => {
      render(
        <TailwindStyle darkModeDataAttribute="data-color-mode" darkModeRootSelector=".rm-ReadMe">
          <div className={`${tailwindPrefix} dark:text-blue-500`} />
        </TailwindStyle>,
      );

      await waitFor(() => {
        expect(tailwindCompiler).toHaveBeenCalledWith(
          expect.arrayContaining(['dark:text-blue-500']),
          expect.objectContaining({ darkModeDataAttribute: 'data-color-mode', darkModeRootSelector: '.rm-ReadMe' }),
        );
      });
    });
  });

  describe('MutationObserver', () => {
    it('collects classes when a direct .readme-tailwind node is added', async () => {
      const { container } = render(
        <TailwindStyle>
          <div />
        </TailwindStyle>,
      );

      vi.clearAllMocks();

      act(() => {
        const node = document.createElement('div');
        node.classList.add(tailwindPrefix, 'bg-red-500');
        container.appendChild(node);
      });

      await waitFor(() => {
        expect(tailwindCompiler).toHaveBeenCalledWith(expect.arrayContaining(['bg-red-500']), expect.anything());
      });
    });

    it('collects classes from a nested .readme-tailwind element inside an added parent node', async () => {
      // Regression case: React replaces a subtree during client-side navigation,
      // inserting a parent wrapper whose children contain TailwindRoot elements.
      // addedNodes only contains the parent — without the fix, the nested .readme-tailwind
      // was never traversed and its Tailwind classes were never compiled.
      const { container } = render(
        <TailwindStyle>
          <div />
        </TailwindStyle>,
      );

      vi.clearAllMocks();

      act(() => {
        const parent = document.createElement('div');
        const nested = document.createElement('span');
        nested.classList.add(tailwindPrefix, 'text-green-500', 'rounded-lg');
        parent.appendChild(nested);
        container.appendChild(parent);
      });

      await waitFor(() => {
        expect(tailwindCompiler).toHaveBeenCalledWith(
          expect.arrayContaining(['text-green-500', 'rounded-lg']),
          expect.anything(),
        );
      });
    });

    it('collects classes from both a .readme-tailwind node and its nested .readme-tailwind children', async () => {
      const { container } = render(
        <TailwindStyle>
          <div />
        </TailwindStyle>,
      );

      vi.clearAllMocks();

      act(() => {
        const parent = document.createElement('div');
        parent.classList.add(tailwindPrefix, 'bg-blue-500');
        const nested = document.createElement('span');
        nested.classList.add(tailwindPrefix, 'text-red-500');
        parent.appendChild(nested);
        container.appendChild(parent);
      });

      await waitFor(() => {
        expect(tailwindCompiler).toHaveBeenCalledWith(
          expect.arrayContaining(['bg-blue-500', 'text-red-500']),
          expect.anything(),
        );
      });
    });

    it('collects classes when a class attribute is updated on an existing element', async () => {
      const { container } = render(
        <TailwindStyle>
          <div />
        </TailwindStyle>,
      );

      const target = document.createElement('div');
      target.classList.add(tailwindPrefix);
      act(() => {
        container.appendChild(target);
      });

      vi.clearAllMocks();

      act(() => {
        target.classList.add('p-4', 'shadow-md');
      });

      await waitFor(() => {
        expect(tailwindCompiler).toHaveBeenCalledWith(expect.arrayContaining(['p-4', 'shadow-md']), expect.anything());
      });
    });
  });
});
