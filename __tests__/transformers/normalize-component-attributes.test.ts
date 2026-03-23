import { normalizeComponentAttributes } from '../../processor/transform/mdxish/normalize-component-attributes';

describe('normalize-component-attributes', () => {
  describe('self-closing block components', () => {
    it('quotes unquoted URL in Image src', () => {
      expect(normalizeComponentAttributes('<Image src=https://example.com/image.png alt=test />')).toBe(
        '<Image src="https://example.com/image.png" alt="test" />',
      );
    });

    it('quotes unquoted URL in Embed', () => {
      expect(normalizeComponentAttributes('<Embed url=https://example.com title=Example />')).toBe(
        '<Embed url="https://example.com" title="Example" />',
      );
    });

    it('quotes unquoted attributes in Recipe', () => {
      expect(normalizeComponentAttributes('<Recipe slug=my-recipe title=Recipe link=https://example.com/recipe />')).toBe(
        '<Recipe slug="my-recipe" title="Recipe" link="https://example.com/recipe" />',
      );
    });
  });

  describe('block components with children', () => {
    it('quotes unquoted emoji and simple values in Callout', () => {
      expect(normalizeComponentAttributes('<Callout icon=📘 theme=info>')).toBe('<Callout icon="📘" theme="info">');
    });

    it('quotes unquoted attributes in multi-line Callout', () => {
      const input = `<Callout icon=📘 theme=info>
content
</Callout>`;
      const expected = `<Callout icon="📘" theme="info">
content
</Callout>`;
      expect(normalizeComponentAttributes(input)).toBe(expected);
    });
  });

  describe('inline components', () => {
    it('quotes unquoted URL in Anchor at line start', () => {
      expect(normalizeComponentAttributes('<Anchor href=https://readme.com>ReadMe</Anchor>')).toBe(
        '<Anchor href="https://readme.com">ReadMe</Anchor>',
      );
    });
  });

  describe('already-quoted attributes', () => {
    it('leaves double-quoted attributes unchanged', () => {
      const input = '<Image src="https://example.com/image.png" alt="test" />';
      expect(normalizeComponentAttributes(input)).toBe(input);
    });

    it('normalizes single-quoted attributes to double quotes', () => {
      const input = "<Callout icon='📘' theme='info'>";
      expect(normalizeComponentAttributes(input)).toBe('<Callout icon="📘" theme="info">');
    });
  });

  describe('boolean attributes', () => {
    it('preserves boolean attributes without values', () => {
      expect(normalizeComponentAttributes('<Image src=test.png border />')).toBe(
        '<Image src="test.png" border />',
      );
    });
  });

  describe('mixed quoted and unquoted attributes', () => {
    it('only quotes the unquoted ones', () => {
      expect(normalizeComponentAttributes('<Image src="test.png" alt=test />')).toBe(
        '<Image src="test.png" alt="test" />',
      );
    });
  });

  describe('does not affect non-component content', () => {
    it('ignores lowercase HTML tags', () => {
      const input = '<div class=container>';
      expect(normalizeComponentAttributes(input)).toBe(input);
    });

    it('ignores content inside fenced code blocks', () => {
      const input = `\`\`\`html
<Image src=https://example.com/image.png alt=test />
\`\`\``;
      expect(normalizeComponentAttributes(input)).toBe(input);
    });

    it('ignores content inside indented code blocks', () => {
      const input = '    <Image src=https://example.com/image.png alt=test />';
      expect(normalizeComponentAttributes(input)).toBe(input);
    });

    it('ignores PascalCase tags not at line start (inline)', () => {
      const input = 'Use <Anchor href=https://readme.com>ReadMe</Anchor> for links.';
      expect(normalizeComponentAttributes(input)).toBe(input);
    });
  });

  describe('multi-line documents', () => {
    it('normalizes multiple component tags independently', () => {
      const input = `<Image src=https://example.com/a.png alt=first />

<Recipe slug=my-recipe title=Recipe />

<Callout icon=📘 theme=info>
content
</Callout>`;
      const expected = `<Image src="https://example.com/a.png" alt="first" />

<Recipe slug="my-recipe" title="Recipe" />

<Callout icon="📘" theme="info">
content
</Callout>`;
      expect(normalizeComponentAttributes(input)).toBe(expected);
    });

    it('does not affect multi-line JSX expression tags', () => {
      const input = `<AdvancedTable
  data={[
    { 'code': '<INPUT_CODE_1>' }
  ]}
/>`;
      expect(normalizeComponentAttributes(input)).toBe(input);
    });
  });
});
