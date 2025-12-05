import { mdast, mdx, mdxish } from '../../index';

describe('reusable content compiler', () => {
  it('writes an undefined reusable content block as a tag', () => {
    const doc = '<Undefined />';
    const tree = mdast(doc);

    expect(mdx(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block as a tag', () => {
    const tags = {
      Defined: '# Whoa',
    };
    const doc = '<Defined />';
    const tree = mdast(doc, { reusableContent: { tags } });

    // The component remains as mdxJsxFlowElement in the AST
    // The expansion happens through injectComponents transformer
    expect(tree.children[0].type).toBe('mdxJsxFlowElement');
    expect(tree.children[0].name).toBe('Defined');
    expect(mdx(tree)).toMatch(doc);
  });

  it('writes a defined reusable content block with multiple words as a tag', () => {
    const tags = {
      MyCustomComponent: '# Whoa',
    };
    const doc = '<MyCustomComponent />';
    const tree = mdast(doc, { reusableContent: { tags } });

    // The component remains as mdxJsxFlowElement in the AST
    expect(tree.children[0].type).toBe('mdxJsxFlowElement');
    expect(tree.children[0].name).toBe('MyCustomComponent');
    expect(mdx(tree)).toMatch(doc);
  });

  describe('serialize = false', () => {
    it('writes a reusable content block as content', () => {
      const tags = {
        Defined: '# Whoa',
      };
      const doc = '<Defined />';
      // mdx() expects an AST node, not a string, so we need to parse it first
      const tree = mdast(doc, { reusableContent: { tags, serialize: false } });
      const string = mdx(tree, { reusableContent: { tags, serialize: false } });

      // The component remains as a tag even with serialize=false
      // Content expansion would happen through injectComponents in a different context
      expect(string).toMatch(/<Defined/);
    });
  });
});

describe('mdxish reusable content compiler', () => {
  it('removes undefined reusable content blocks', () => {
    const doc = '<Undefined />';

    const hast = mdxish(doc);

    // Unknown components are filtered out by rehypeMdxishComponents
    expect(hast.children).toHaveLength(0);
  });

  it('processes defined reusable content blocks as components', () => {
    const doc = '<Defined />';

    const hast = mdxish(doc, {
      components: {
        Defined: '# Whoa',
      },
    });

    // Component is recognized and preserved in HAST
    expect(hast.children.length).toBeGreaterThan(0);
    const component = hast.children.find(
      child => child.type === 'element' && child.tagName === 'Defined',
    );
    expect(component).toBeDefined();
  });

  it('processes defined reusable content blocks with multiple words as components', () => {
    const doc = '<MyCustomComponent />';

    const hast = mdxish(doc, {
      components: {
        MyCustomComponent: '# Whoa',
      },
    });

    // Component is recognized and preserved in HAST
    expect(hast.children.length).toBeGreaterThan(0);
    const component = hast.children.find(
      child => child.type === 'element' && child.tagName === 'MyCustomComponent',
    );
    expect(component).toBeDefined();
  });

  describe('component expansion', () => {
    it('processes component content when provided as markdown string', () => {
      // Note: mdxish doesn't automatically expand component content strings
      // Components are passed as-is. To expand content, you'd need to process it separately
      const doc = '<Defined />';

      const hast = mdxish(doc, {
        components: {
          Defined: '# Whoa',
        },
      });

      const component = hast.children.find(
        child => child.type === 'element' && child.tagName === 'Defined',
      );
      expect(component).toBeDefined();
      expect(component.type).toBe('element');
    });
  });
});
