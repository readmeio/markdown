import type { MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';

import { parseAttributes, parseTag } from '../../../../lib/utils/mdxish/mdxish-component-tag-parser';

describe('parseAttributes', () => {
  describe('boolean attributes', () => {
    it('should parse a lone attribute name as a boolean (null value)', () => {
      expect(parseAttributes('disabled')).toStrictEqual([{ type: 'mdxJsxAttribute', name: 'disabled', value: null }]);
    });

    it('should parse multiple boolean attributes separated by whitespace', () => {
      expect(parseAttributes('disabled hidden')).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'disabled', value: null },
        { type: 'mdxJsxAttribute', name: 'hidden', value: null },
      ]);
    });
  });

  describe('quoted string attributes', () => {
    it('should parse multiple double-quoted attributes', () => {
      const result = parseAttributes('attr1="value1" attr2="value2"');
      expect(result).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'attr1', value: 'value1' },
        { type: 'mdxJsxAttribute', name: 'attr2', value: 'value2' },
      ]);
    });

    it('should parse a single-quoted value', () => {
      expect(parseAttributes("title='hello world'")).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'title', value: 'hello world' },
      ]);
    });

    it('should keep the opposite quote character inside the value', () => {
      expect(parseAttributes('title="it\'s me"')).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'title', value: "it's me" },
      ]);
    });

    it('should not break when there are special characters in the attribute value', () => {
      expect(parseAttributes('attr1="!@#$%^&*()_+"')).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'attr1', value: '!@#$%^&*()_+' },
      ]);
    });

    it('should allow whitespace around =', () => {
      expect(parseAttributes('title = "hi"')).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'title', value: 'hi' },
      ]);
    });
  });

  describe('unquoted values', () => {
    it('should parse unquoted attributes', () => {
      expect(parseAttributes('attr1=value1 attr2=value2')).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'attr1', value: 'value1' },
        { type: 'mdxJsxAttribute', name: 'attr2', value: 'value2' },
      ]);
    });

    it('should stop at the closing tag marker', () => {
      expect(parseAttributes('href=/docs>')).toStrictEqual([{ type: 'mdxJsxAttribute', name: 'href', value: '/docs' }]);
    });

    it('should not break when there are special characters in an unquoted value', () => {
      expect(parseAttributes('attr1=!@#$%^&*()_+')).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'attr1', value: '!@#$%^&*()_+' },
      ]);
    });

    it('should not break when there is a / character in an unquoted value', () => {
      expect(parseAttributes('attr1=https://example.com')).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'attr1', value: 'https://example.com' },
      ]);
    });
  });

  describe('expression attributes', () => {
    it('should parse a simple expression', () => {
      expect(parseAttributes('count={1 + 1}')).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'count',
          value: { type: 'mdxJsxAttributeValueExpression', value: '1 + 1' },
        },
      ]);
    });

    it('should parse template literal attributes as expression values', () => {
      const result = parseAttributes('attr1={`value1`} attr2={`value2`}');
      expect(result).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'attr1',
          value: { type: 'mdxJsxAttributeValueExpression', value: '`value1`' },
        },
        {
          type: 'mdxJsxAttribute',
          name: 'attr2',
          value: { type: 'mdxJsxAttributeValueExpression', value: '`value2`' },
        },
      ]);
    });

    it('should handle two levels of nested braces', () => {
      expect(parseAttributes('data={{ a: { b: 1 } }}')).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: { type: 'mdxJsxAttributeValueExpression', value: '{ a: { b: 1 } }' },
        },
      ]);
    });

    it('should handle three levels of nested braces', () => {
      expect(parseAttributes('config={{ theme: { colors: { primary: "#000" } } }}')).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'config',
          value: { type: 'mdxJsxAttributeValueExpression', value: '{ theme: { colors: { primary: "#000" } } }' },
        },
      ]);
    });

    it('should parse array props', () => {
      expect(parseAttributes('data={[ { id: 1 }, { id: 2 } ]}')).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: { type: 'mdxJsxAttributeValueExpression', value: '[ { id: 1 }, { id: 2 } ]' },
        },
      ]);
    });

    it('should parse object props', () => {
      expect(parseAttributes('data={{ name: "John Doe", age: 30 }}')).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: { type: 'mdxJsxAttributeValueExpression', value: '{ name: "John Doe", age: 30 }' },
        },
      ]);
    });

    it('should ignore braces inside string literals', () => {
      const attrs = parseAttributes('value={"}" + "}"}');
      const expr = attrs[0].value as MdxJsxAttributeValueExpression;
      expect(expr.value).toBe('"}" + "}"');
    });

    it('should handle braces inside strings within expressions', () => {
      expect(parseAttributes('data={{ key: "value with { and }" }}')).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: { type: 'mdxJsxAttributeValueExpression', value: '{ key: "value with { and }" }' },
        },
      ]);
    });

    it('should handle escaped quotes inside string values within expressions', () => {
      expect(parseAttributes(String.raw`data={{ message: "He said \"hello\"" }}`)).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: String.raw`{ message: "He said \"hello\"" }`,
          },
        },
      ]);
    });

    it('should not be affected by empty lines inside the expression', () => {
      const attrString = `
  data={[
    {
      'code': 'EXAMPLE_CODE_1',
      'status': 'EXAMPLE_STATUS_1'
    },

  ]}
        `;
      const expectedInner = `[
    {
      'code': 'EXAMPLE_CODE_1',
      'status': 'EXAMPLE_STATUS_1'
    },

  ]`;
      expect(parseAttributes(attrString)).toStrictEqual([
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: { type: 'mdxJsxAttributeValueExpression', value: expectedInner },
        },
      ]);
    });
  });

  describe('preserveExpressionsAsText', () => {
    it('should keep a simple expression as raw literal including braces', () => {
      expect(parseAttributes('count={1 + 1}', { preserveExpressionsAsText: true })).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'count', value: '{1 + 1}' },
      ]);
    });

    it('should preserve template literal text alongside simple expressions', () => {
      expect(parseAttributes('attr1={1+1} attr2={`value2`}', { preserveExpressionsAsText: true })).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'attr1', value: '{1+1}' },
        { type: 'mdxJsxAttribute', name: 'attr2', value: '{`value2`}' },
      ]);
    });

    it('should preserve deeply nested expressions', () => {
      expect(parseAttributes('style={{ color: { r: 255 } }}', { preserveExpressionsAsText: true })).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'style', value: '{{ color: { r: 255 } }}' },
      ]);
    });
  });

  describe('mixed attribute types', () => {
    it('should parse mixed string, boolean, and deeply nested expression attributes', () => {
      const result = parseAttributes('title="Hello" data={{ items: [{ id: 1 }] }} active');
      expect(result).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'title', value: 'Hello' },
        {
          type: 'mdxJsxAttribute',
          name: 'data',
          value: { type: 'mdxJsxAttributeValueExpression', value: '{ items: [{ id: 1 }] }' },
        },
        { type: 'mdxJsxAttribute', name: 'active', value: null },
      ]);
    });

    it('should parse single-quoted attributes alongside expression attributes', () => {
      expect(parseAttributes("label='Click me' onClick={() => alert('hi')}")).toStrictEqual([
        { type: 'mdxJsxAttribute', name: 'label', value: 'Click me' },
        {
          type: 'mdxJsxAttribute',
          name: 'onClick',
          value: { type: 'mdxJsxAttributeValueExpression', value: "() => alert('hi')" },
        },
      ]);
    });

    it('should handle attribute names with hyphens, colons, and dots', () => {
      const attrs = parseAttributes('data-id="1" aria:label="x" x.y="z"');
      expect(attrs.map(a => a.name)).toStrictEqual(['data-id', 'aria:label', 'x.y']);
    });
  });
});

describe('parseTag', () => {
  it('should parse a simple self-closing tag', () => {
    const result = parseTag('<MyComp />');
    expect(result).toStrictEqual({
      tag: 'MyComp',
      attributes: [],
      selfClosing: true,
      contentAfterTag: '',
      attrString: ' ',
    });
  });

  it('should parse a self-closing tag without a space before the slash', () => {
    const result = parseTag('<MyComp/>');
    expect(result?.tag).toBe('MyComp');
    expect(result?.selfClosing).toBe(true);
  });

  it('should parse a self-closing tag with attributes', () => {
    const result = parseTag('<MyComponent theme="dark" size="large" />');
    expect(result?.tag).toBe('MyComponent');
    expect(result?.selfClosing).toBe(true);
    expect(result?.contentAfterTag).toBe('');
    expect(result?.attrString.trim()).toBe('theme="dark" size="large"');
  });

  it('should parse component with opening, closing tags, and content in between', () => {
    const result = parseTag('<Callout theme="info">Some content</Callout>');
    expect(result?.tag).toBe('Callout');
    expect(result?.selfClosing).toBe(false);
    expect(result?.contentAfterTag).toBe('Some content</Callout>');
    expect(result?.attrString.trim()).toBe('theme="info"');
  });

  it('should return null for lowercase (non-component) tags', () => {
    expect(parseTag('<div class="foo">')).toBeNull();
  });

  it('should return null when there is no tag to match', () => {
    expect(parseTag('hello')).toBeNull();
  });

  it('should return null when the closing > is missing', () => {
    expect(parseTag('<MyComp attr="unterminated')).toBeNull();
  });

  it('should parse a tag whose quoted attribute contains >', () => {
    const result = parseTag('<Image caption="A > B" />');
    expect(result?.tag).toBe('Image');
    expect(result?.attrString.trim()).toBe('caption="A > B"');
  });

  it('should ignore > inside an expression attribute value', () => {
    const result = parseTag('<MyComp check={a > b} />');
    const expr = result?.attributes[0].value as MdxJsxAttributeValueExpression;
    expect(expr.value).toBe('a > b');
    expect(result?.selfClosing).toBe(true);
  });

  it('should parse a tag with complex deeply nested object expression attributes', () => {
    const result = parseTag('<Component style={{ color: { r: 255, g: 0 } }} />');
    expect(result?.tag).toBe('Component');
    expect(result?.selfClosing).toBe(true);
    expect(result?.attributes).toStrictEqual([
      {
        type: 'mdxJsxAttribute',
        name: 'style',
        value: { type: 'mdxJsxAttributeValueExpression', value: '{ color: { r: 255, g: 0 } }' },
      },
    ]);
  });

  it('should parse a self-closing tag that spans multiple lines', () => {
    const result = parseTag(`<Image
  src="https://example.com/image.jpg"
  alt="Some helpful text"
  border
/>`);
    expect(result?.tag).toBe('Image');
    expect(result?.attrString).toBe(`
  src="https://example.com/image.jpg"
  alt="Some helpful text"
  border
`);
  });

  it('should pass preserveExpressionsAsText through to parseAttributes', () => {
    const result = parseTag('<MyComp count={1+1} />', { preserveExpressionsAsText: true });
    expect(result?.attributes[0].value).toBe('{1+1}');
  });

  it('should tolerate PascalCase names with digits and underscores', () => {
    expect(parseTag('<My_Comp2 />')?.tag).toBe('My_Comp2');
  });

  describe('attributes extraction', () => {
    it('should capture an attribute that spans multiple lines', () => {
      const result = parseTag(`<AdvancedTable
    data={[
      {
        'code': 'EXAMPLE_CODE_1',
        'status': 'EXAMPLE_STATUS_1'
      },
      {
        'code': 'EXAMPLE_CODE_2',
        'status': 'EXAMPLE_STATUS_2'
      },
    ]}
  />`);
      expect(result?.tag).toBe('AdvancedTable');
      expect(result?.attrString).toBe(`
    data={[
      {
        'code': 'EXAMPLE_CODE_1',
        'status': 'EXAMPLE_STATUS_1'
      },
      {
        'code': 'EXAMPLE_CODE_2',
        'status': 'EXAMPLE_STATUS_2'
      },
    ]}
  `);
    });

    it('should capture multiline attributes that may contain empty lines', () => {
      const result = parseTag(`<AdvancedTable
  data={[
    {
      'code': 'EXAMPLE_CODE_1',
      'status': 'EXAMPLE_STATUS_1'
    },

  ]}
/>`);
      expect(result?.tag).toBe('AdvancedTable');
      expect(result?.attrString).toBe(`
  data={[
    {
      'code': 'EXAMPLE_CODE_1',
      'status': 'EXAMPLE_STATUS_1'
    },

  ]}
`);
    });
  });
});
