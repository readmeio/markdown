import type { Root } from 'mdast';

import { mdxishMdastToMd } from '../../lib';
import { roundTripMdxish } from '../helpers';

const headingWithId = (id: string): Root => ({
  type: 'root',
  children: [
    { type: 'heading', depth: 2, data: { hProperties: { id } }, children: [{ type: 'text', value: 'Setup' }] },
  ],
});

describe('heading compiler (RM-18626)', () => {
  it.each([false, true])('round-trips an explicit id (safeMode: %s)', safeMode => {
    expect(roundTripMdxish('## Prérequis {#prerequisites}\n', { safeMode })).toBe('## Prérequis {#prerequisites}\n');
  });

  it('drops the id from a heading with a line break, which is written as setext', () => {
    const withBreak: Root = {
      type: 'root',
      children: [
        {
          type: 'heading',
          depth: 1,
          data: { hProperties: { id: 'two-lines' } },
          children: [{ type: 'text', value: 'Line one' }, { type: 'break' }, { type: 'text', value: 'line two' }],
        },
      ],
    };
    expect(mdxishMdastToMd(withBreak)).toBe('Line one\\\nline two\n========\n');
  });

  it('keeps an escaped brace literal across round trips', () => {
    const once = roundTripMdxish('## Use \\{#each\\}\n');
    expect(once).toBe('## Use \\{#each\\}\n');
    expect(roundTripMdxish(once)).toBe(once);
  });

  it('drops an id the {#id} syntax cannot spell', () => {
    expect(mdxishMdastToMd(headingWithId('x y'))).toBe('## Setup\n');
  });

  it('leaves headings without an id unchanged', () => {
    expect(roundTripMdxish('## Prerequisites\n')).toBe('## Prerequisites\n');
  });
});
