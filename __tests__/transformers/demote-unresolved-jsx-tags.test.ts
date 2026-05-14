import { describe, expect, it } from 'vitest';

import { mix } from '../../lib';

describe('demote unresolved PascalCase JSX tags', () => {
  it('renders text after an unknown <Version> tag instead of dropping it', () => {
    const html = mix('<Batch_id>_<File_Type>_<Version>.csv\n');

    expect(html).toContain('Version');
    expect(html).toContain('.csv');
  });

  it('escapes a bare unknown PascalCase opening tag as literal text', () => {
    const html = mix('Use <Version> in the filename.\n');

    expect(html).toContain('Version');
    expect(html).toContain('in the filename.');
  });

  it('escapes a paired unknown PascalCase tag with content', () => {
    const html = mix('Hello <Foo>world</Foo>!\n');

    expect(html).toContain('Foo');
    expect(html).toContain('world');
    expect(html).toContain('!');
  });

  it('renders content following multiple unknown PascalCase tags', () => {
    const html = mix('<Alpha> middle <Beta> tail\n');

    expect(html).toContain('middle');
    expect(html).toContain('tail');
  });

  it('leaves lowercase HTML tags alone', () => {
    const html = mix('Line one<br />line two\n');

    expect(html).toContain('<br>');
    expect(html).toContain('Line one');
    expect(html).toContain('line two');
  });

  it('still renders known custom components', () => {
    const html = mix('<Callout icon="📘">hello</Callout>\n');

    expect(html).toContain('Callout');
    expect(html).toContain('hello');
  });
});
