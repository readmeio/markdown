import { describe, expect, it } from 'vitest';

import { cssContentText } from '../browser/css-content';

describe('cssContentText', () => {
  it('ignores content that does not paint a glyph', () => {
    expect(cssContentText('')).toBe('');
    expect(cssContentText('none')).toBe('');
    expect(cssContentText('normal')).toBe('');
    expect(cssContentText('""')).toBe('');
  });

  it('decodes a CSS hex escape to the Font Awesome character', () => {
    expect(cssContentText('"\\f030"').codePointAt(0)).toBe(0xf030);
  });

  it('keeps a glyph the browser already resolved', () => {
    expect(cssContentText('"\uf030"').codePointAt(0)).toBe(0xf030);
  });

  it('joins every quoted layer so a duotone icon loads both faces', () => {
    const text = cssContentText('"\\f030" "\\f00c"');
    expect(text.codePointAt(0)).toBe(0xf030);
    expect(text.codePointAt(1)).toBe(0xf00c);
  });

  it('decodes a second call after a global regex has already matched', () => {
    cssContentText('"\\f030"');
    expect(cssContentText('"\\f164"').codePointAt(0)).toBe(0xf164);
  });
});
