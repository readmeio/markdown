import type { CustomComponents } from '../../../types';

import { vi, describe, it, expect, beforeEach } from 'vitest';

import { mix } from '../../../lib';
import * as utils from '../../../processor/utils';


vi.mock('../../../processor/utils', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown> & { evaluate: (source: string) => unknown };
  return {
    ...actual,
    evaluate: vi.fn(actual.evaluate),
  };
});

const evaluateSpy = utils.evaluate as ReturnType<typeof vi.fn>;

describe('safeMode: evaluate() must never be called', () => {
  beforeEach(() => {
    evaluateSpy.mockClear();
  });

  it('does not call evaluate() for an inline MDX expression', () => {
    const html = mix('Result: {5 * 10}', { safeMode: true });
    expect(evaluateSpy).not.toHaveBeenCalled();
    expect(html).toContain('Result: {5 * 10}');
    expect(html).not.toContain('Result: 50');
  });

  it('does not call evaluate() for an attribute expression on a custom component', () => {
    const component = {} as CustomComponents[string];
    const html = mix('<Component value={5 * 10} />', { safeMode: true, components: { Component: component } });
    expect(evaluateSpy).not.toHaveBeenCalled();
    expect(html).toContain('value="{5 * 10}"');
    expect(html).not.toContain('value="50"');
  });

  it('does not call evaluate() for a mixed document with every expression form', () => {
    const md = `# Heading {100 + 100}

Inline: {"hi".toUpperCase()}

<Callout value={"hello".toUpperCase()}>body</Callout>`;
    const html = mix(md, { safeMode: true });
    expect(evaluateSpy).not.toHaveBeenCalled();
    expect(html).not.toContain('200');
    expect(html).toContain('{"hi".toUpperCase()}');
    expect(html).not.toContain('HI');
    expect(html).not.toContain('HELLO');
  });

  it('DOES call evaluate() without safeMode (sanity check that the spy is wired up)', () => {
    const component = {} as CustomComponents[string];
    const html = mix('<Component value={5 * 10} />', { components: { Component: component } });
    // Attribute expressions now evaluate past rehypeRaw's clone, with the export scope passed in.
    expect(evaluateSpy).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    expect(html).not.toContain('5 * 10');
  });
});
