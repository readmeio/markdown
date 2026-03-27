import { act, render, waitFor } from '@testing-library/react';
import React from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import TailwindStyle from '../../components/TailwindStyle';
import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';

vi.mock('../../utils/tailwind-compiler', () => ({
  tailwindCompiler: vi.fn().mockResolvedValue({ css: '.bg-red-500 { background: red; }' }),
}));

describe('TailwindStyle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  describe('MutationObserver', () => {
    it('collects classes when a direct .readme-tailwind node is added', async () => {
      const { container } = render(<TailwindStyle><div /></TailwindStyle>);

      vi.clearAllMocks();

      act(() => {
        const node = document.createElement('div');
        node.classList.add(tailwindPrefix, 'bg-red-500');
        container.appendChild(node);
      });

      await waitFor(() => {
        expect(tailwindCompiler).toHaveBeenCalledWith(
          expect.arrayContaining(['bg-red-500']),
          expect.anything(),
        );
      });
    });

    it('collects classes from a nested .readme-tailwind element inside an added parent node', async () => {
      // Regression case: React replaces a subtree during client-side navigation,
      // inserting a parent wrapper whose children contain TailwindRoot elements.
      // addedNodes only contains the parent — without the fix, the nested .readme-tailwind
      // was never traversed and its Tailwind classes were never compiled.
      const { container } = render(<TailwindStyle><div /></TailwindStyle>);

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

    it('collects classes when a class attribute is updated on an existing element', async () => {
      const { container } = render(<TailwindStyle><div /></TailwindStyle>);

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
        expect(tailwindCompiler).toHaveBeenCalledWith(
          expect.arrayContaining(['p-4', 'shadow-md']),
          expect.anything(),
        );
      });
    });
  });
});
