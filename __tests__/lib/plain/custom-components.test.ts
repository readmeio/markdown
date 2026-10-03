import type { CustomComponents } from '../../../types';

import { describe, it, expect } from 'vitest';

import { hast, mdxish, mdxishTags, plain } from '../../../index';

/** Register a page's custom-component tags so mdxish keeps them (as gitto's indexer does). */
function mdxishPlain(mdx: string): string {
  const components = Object.fromEntries(mdxishTags(mdx).map(tag => [tag, {} as CustomComponents[string]]));
  return plain(mdxish(mdx, { components, safeMode: true }), { preserveVariableSyntax: true }).toString();
}

describe('plain compiler', () => {
  it('should include the title of Accordion', () => {
    const mdx = `
<Accordion title="Title">
  Body
</Accordion>
`;

    expect(plain(hast(mdx))).toContain('Title Body');
  });

  it('should include the title of Card', () => {
    const mdx = `
<Card title="Title">
  Body
</Card>
`;

    expect(plain(hast(mdx))).toContain('Title Body');
  });

  it('should include the title of Tab', () => {
    const mdx = `
<Tab title="Title">
  Body
</Tab>
`;

    expect(plain(hast(mdx))).toContain('Title Body');
  });

  // Custom components aren't rendered in safeMode, so authored copy passed as props (not just
  // children) must be pulled off the node or it never reaches the search index.
  describe('custom components (mdxish)', () => {
    it('indexes authored text passed as a string prop', () => {
      const mdx = '<Banner message="This banner is displayed inline." />';

      expect(mdxishPlain(mdx)).toContain('This banner is displayed inline.');
    });

    it('indexes both props and children', () => {
      const mdx = '<Note title="Heads up">read this carefully</Note>';

      expect(mdxishPlain(mdx)).toContain('Heads up read this carefully');
    });

    it('indexes text passed as a static template-literal expression prop', () => {
      const mdx = '<ContentModal title="Content Modal" content={`Testing search`} buttonColor="#0B1440" />';
      const result = mdxishPlain(mdx);

      expect(result).toContain('Testing search');
      expect(result).not.toContain('#0B1440');
    });

    it('indexes multi-line template-literal expression props', () => {
      const mdx = `<ContentModal content={\`First line of copy.
      Second line of copy.\`} />`;
      const result = mdxishPlain(mdx);

      expect(result).toContain('First line of copy.');
      expect(result).toContain('Second line of copy.');
    });

    it('skips interpolated templates and non-string expressions', () => {
      // The `${user.name}` is intentional literal MDX source under test, not a JS template.
      // eslint-disable-next-line no-template-curly-in-string
      const mdx = '<Banner message={`Hello ${user.name}`} count={5} enabled={true} ref={user.id} />';
      const result = mdxishPlain(mdx);

      expect(result).not.toContain('Hello');
      expect(result).not.toContain('5');
      expect(result).not.toContain('true');
    });

    it('skips styling/config prop values, mirroring built-ins', () => {
      const mdx =
        '<Banner message="Real copy" color="#118cfd" fontSize="14px" isInline={true} count={5} link="https://example.com" />';
      const result = mdxishPlain(mdx);

      expect(result).toContain('Real copy');
      expect(result).not.toContain('#118cfd');
      expect(result).not.toContain('14px');
      expect(result).not.toContain('true');
      expect(result).not.toContain('example.com');
    });

    it('skips styling props whose value is a plain word (e.g. fontWeight="bold")', () => {
      const mdx = '<Banner message="Real copy" fontWeight="bold" textAlign="center" />';
      const result = mdxishPlain(mdx);

      expect(result).toContain('Real copy');
      expect(result).not.toContain('bold');
      expect(result).not.toContain('center');
    });
  });
});
