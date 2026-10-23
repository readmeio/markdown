// @vitest-environment node
import React from 'react';
import { renderToString } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import TailwindStyle from '../../components/TailwindStyle';
import { tailwindPrefix } from '../../utils/consts';
import { tailwindCompiler } from '../../utils/tailwind-compiler';
import { silenceConsole } from '../helpers';

vi.mock('../../utils/tailwind-compiler', () => ({
  tailwindCompiler: vi.fn(),
}));

describe('TailwindStyle on the server', () => {
  it('renders an empty sheet without compiling or warning', () => {
    silenceConsole()(consoleError => {
      const html = renderToString(
        <TailwindStyle>
          <div className={`${tailwindPrefix} p-4`} />
        </TailwindStyle>,
      );

      expect(html).toBe(`<style data-tailwind-stylesheet="true"></style><div class="${tailwindPrefix} p-4"></div>`);
      expect(tailwindCompiler).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    });
  });
});
