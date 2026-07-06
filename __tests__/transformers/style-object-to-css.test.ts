import React from 'react';

import { isPlainObject, styleObjectToCssText } from '../../processor/transform/mdxish/style-object-to-css';

describe('styleObjectToCssText', () => {
  it('kebab-cases keys and joins declarations', () => {
    expect(styleObjectToCssText({ color: 'red', backgroundColor: 'blue' })).toBe('color:red;background-color:blue');
  });

  it('appends px to non-zero numeric values on dimensional properties', () => {
    expect(styleObjectToCssText({ fontSize: 12, width: 200, padding: 20 })).toBe(
      'font-size:12px;width:200px;padding:20px',
    );
  });

  it('leaves unitless properties without px', () => {
    expect(
      styleObjectToCssText({ lineHeight: 1.5, opacity: 0.5, zIndex: 3, fontWeight: 600, flexGrow: 1, order: 2 }),
    ).toBe('line-height:1.5;opacity:0.5;z-index:3;font-weight:600;flex-grow:1;order:2');
  });

  it('does not append px to a zero value (matches React)', () => {
    expect(styleObjectToCssText({ margin: 0, padding: 0 })).toBe('margin:0;padding:0');
  });

  it('leaves string values (already-unitized) untouched', () => {
    expect(styleObjectToCssText({ fontSize: '15px', width: '200%', margin: '0 auto' })).toBe(
      'font-size:15px;width:200%;margin:0 auto',
    );
  });

  it('preserves CSS custom properties verbatim, without px on numbers', () => {
    expect(styleObjectToCssText({ '--gap': 8, '--brand': 'red' })).toBe('--gap:8;--brand:red');
  });

  it('drops undefined, null, and empty-string entries', () => {
    expect(styleObjectToCssText({ color: 'red', width: undefined, height: null, margin: '' })).toBe('color:red');
  });

  it('serializes a mixed real-world grid style', () => {
    expect(
      styleObjectToCssText({
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 20,
        marginBottom: 36,
        color: 'rgb(48, 53, 58)',
        fontWeight: 400,
      }),
    ).toBe('display:grid;grid-template-columns:1fr;gap:20px;margin-bottom:36px;color:rgb(48, 53, 58);font-weight:400');
  });
});

describe('isPlainObject', () => {
  it('is true for a plain style object', () => {
    expect(isPlainObject({ color: 'red' })).toBe(true);
  });

  it('is false for arrays, null, strings, and React elements', () => {
    expect(isPlainObject(['a'])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('color:red')).toBe(false);
    expect(isPlainObject(React.createElement('div'))).toBe(false);
  });
});
