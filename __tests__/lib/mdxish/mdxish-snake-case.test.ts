import type { Element } from 'hast';

import { mdxish } from '../../../lib/mdxish';
import { type RMDXModule } from '../../../types';

const stubModule: RMDXModule = {
  default: () => null,
  Toc: null,
  toc: [],
};

const makeComponents = (...names: string[]) =>
  names.reduce<Record<string, RMDXModule>>((acc, name) => {
    acc[name] = stubModule;
    return acc;
  }, {});

describe('mdxish snake_case component integration', () => {
  describe('basic rendering', () => {
    it('should render snake_case component as HAST element', () => {
      const doc = '<Snake_case />';
      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(component).toBeDefined();
      expect(component?.type).toBe('element');
      expect(component?.tagName).toBe('Snake_case');
    });

    it('should render component with multiple underscores', () => {
      const doc = '<Multiple_Underscore_Component />';
      const components = makeComponents('Multiple_Underscore_Component');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(
        child => child.type === 'element' && child.tagName === 'Multiple_Underscore_Component',
      );
      expect(component).toBeDefined();
    });

    it('should remove undefined snake_case component', () => {
      const doc = '<Undefined_Component />';
      const hast = mdxish(doc);

      const component = hast.children.find(
        child => child.type === 'element' && child.tagName === 'Undefined_Component',
      );
      expect(component).toBeUndefined();
    });
  });

  describe('components with content', () => {
    it('should render snake_case component with text content', () => {
      const doc = `<Snake_case>
Simple text content
</Snake_case>`;

      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(component).toBeDefined();
      expect(component?.type).toBe('element');

      const elementNode = component as Element;
      expect(elementNode.children.length).toBeGreaterThan(0);
    });

    it('should render snake_case component with markdown content', () => {
      const doc = `<Snake_case>

# Heading

Some **bold** and *italic* text.

</Snake_case>`;

      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(component).toBeDefined();

      const elementNode = component as Element;
      expect(elementNode.children.length).toBeGreaterThan(0);
    });
  });

  describe('components with attributes', () => {
    it('should preserve string attributes', () => {
      const doc = '<Snake_case theme="info" id="test-id" />';
      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(component).toBeDefined();
      expect(component?.type).toBe('element');

      const elementNode = component as Element;
      expect(elementNode.properties?.theme).toBe('info');
      expect(elementNode.properties?.id).toBe('test-id');
    });

    it('should preserve boolean attributes', () => {
      const doc = '<Snake_case empty />';
      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(component).toBeDefined();
      expect(component?.type).toBe('element');

      const elementNode = component as Element;
      expect(elementNode.properties?.empty).toBeDefined();
    });
  });

  describe('multiple components', () => {
    it('should render multiple instances of same snake_case component', () => {
      const doc = `<Snake_case />

<Snake_case />

<Snake_case />`;

      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const componentsFound = hast.children.filter(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(componentsFound).toHaveLength(3);
    });

    it('should render multiple different snake_case components', () => {
      const doc = `<First_Component />

<Second_Component />

<First_Component />`;

      const components = makeComponents('First_Component', 'Second_Component');

      const hast = mdxish(doc, { components });

      const firstComponents = hast.children.filter(
        child => child.type === 'element' && child.tagName === 'First_Component',
      );
      const secondComponents = hast.children.filter(
        child => child.type === 'element' && child.tagName === 'Second_Component',
      );

      expect(firstComponents).toHaveLength(2);
      expect(secondComponents).toHaveLength(1);
    });
  });

  describe('nested components', () => {
    it('should handle nested snake_case components', () => {
      const doc = `<Outer_Component>

<Inner_Component />

</Outer_Component>`;

      const components = makeComponents('Outer_Component', 'Inner_Component');

      const hast = mdxish(doc, { components });

      const outerComponent = hast.children.find(
        child => child.type === 'element' && child.tagName === 'Outer_Component',
      );
      expect(outerComponent).toBeDefined();
      expect(outerComponent?.type).toBe('element');

      const outerElement = outerComponent as Element;
      const innerComponent = outerElement.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'Inner_Component',
      );
      expect(innerComponent).toBeDefined();
    });
  });

  describe('mixed component types', () => {
    it('should handle snake_case alongside PascalCase components', () => {
      const doc = `<Snake_case />

<PascalCase />`;

      const components = makeComponents('Snake_case', 'PascalCase');

      const hast = mdxish(doc, { components });

      const snakeComponent = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      const pascalComponent = hast.children.find(child => child.type === 'element' && child.tagName === 'PascalCase');

      expect(snakeComponent).toBeDefined();
      expect(pascalComponent).toBeDefined();
    });

    it('should handle snake_case alongside markdown', () => {
      const doc = `# Main Heading

Some regular markdown text.

<Snake_case />

More markdown after the component.`;

      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const heading = hast.children.find(child => child.type === 'element' && child.tagName === 'h1');
      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      const paragraphs = hast.children.filter(child => child.type === 'element' && child.tagName === 'p');

      expect(heading).toBeDefined();
      expect(component).toBeDefined();
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle consecutive underscores', () => {
      const doc = '<Component__Double />';
      const components = makeComponents('Component__Double');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Component__Double');
      expect(component).toBeDefined();
    });

    it('should NOT transform lowercase snake_case tags', () => {
      const doc = '<snake_case />\n\n<Snake_case />';
      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      const upperComponent = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(upperComponent).toBeDefined();
    });

    it('should NOT transform snake_case tags that are not in the components list', () => {
      const doc = `<Snake_case />

\`\`\`
<Unknown_Component />
\`\`\``;

      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      // The known component should be rendered
      const snakeComponent = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case');
      expect(snakeComponent).toBeDefined();

      // The unknown component inside code block should remain as-is (not transformed to placeholder)
      const codeBlock = hast.children.find(child => child.type === 'element' && child.tagName === 'pre');
      expect(codeBlock).toBeDefined();

      const codeElement = (codeBlock as Element).children[0] as Element;
      const textNode = codeElement.children[0] as { type: string; value: string };
      expect(textNode.value).toContain('Unknown_Component');
      expect(textNode.value).not.toContain('MDXishSnakeCase');
    });

    it('should preserve known snake_case tags inside code blocks', () => {
      const doc = `<Snake_case />

\`\`\`
<Snake_case />
\`\`\``;

      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      // The code block content should show the original tag name (restored)
      const codeBlock = hast.children.find(child => child.type === 'element' && child.tagName === 'pre');
      expect(codeBlock).toBeDefined();

      const codeElement = (codeBlock as Element).children[0] as Element;
      const textNode = codeElement.children[0] as { type: string; value: string };
      expect(textNode.value).toContain('Snake_case');
      expect(textNode.value).not.toContain('MDXishSnakeCase');
    });

    it('should preserve known snake_case tags inside code blocks with language specifier', () => {
      const doc = `<Snake_case_name />

\`\`\`html
<Snake_case_name>
  content
</Snake_case_name>
\`\`\``;

      const components = makeComponents('Snake_case_name');

      const hast = mdxish(doc, { components });

      // The real component outside code block should be rendered
      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'Snake_case_name');
      expect(component).toBeDefined();

      // The code block is transformed into CodeTabs by the pipeline
      // Check that the code content preserves the original snake_case name
      const codeTabs = hast.children.find(child => child.type === 'element' && child.tagName === 'CodeTabs');
      expect(codeTabs).toBeDefined();

      // Verify the code content contains the original name, not the placeholder
      const codeTabsStr = JSON.stringify(codeTabs);
      expect(codeTabsStr).toContain('Snake_case_name');
      expect(codeTabsStr).not.toContain('MDXishSnakeCase');
    });

    it('should preserve inline code with snake_case tags', () => {
      const doc = '<Snake_case />\n\nUse `<Snake_case />` to render the component.';

      const components = makeComponents('Snake_case');

      const hast = mdxish(doc, { components });

      // Find the paragraph with inline code
      const paragraph = hast.children.find(
        child => child.type === 'element' && child.tagName === 'p',
      ) as Element;
      expect(paragraph).toBeDefined();

      // Find the code element inside the paragraph
      const inlineCode = paragraph.children.find(
        child => child.type === 'element' && (child as Element).tagName === 'code',
      ) as Element;
      expect(inlineCode).toBeDefined();

      const textNode = inlineCode.children[0] as { type: string; value: string };
      expect(textNode.value).toContain('Snake_case');
      expect(textNode.value).not.toContain('MDXishSnakeCase');
    });

    it('should not collide with existing MDXishSnakeCase component names', () => {
      const doc = `<Snake_case />

<MDXishSnakeCase0 />`;

      const components = makeComponents('Snake_case', 'MDXishSnakeCase0');

      const hast = mdxish(doc, { components });

      // Both components should render correctly without collision
      const snakeCase = hast.children.find(
        child => child.type === 'element' && child.tagName === 'Snake_case',
      );
      const existingPlaceholder = hast.children.find(
        child => child.type === 'element' && child.tagName === 'MDXishSnakeCase0',
      );

      expect(snakeCase).toBeDefined();
      expect(existingPlaceholder).toBeDefined();
    });
  });

  describe('regression tests', () => {
    it('should still render PascalCase components correctly', () => {
      const doc = '<MyComponent />';
      const components = makeComponents('MyComponent');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'MyComponent');
      expect(component).toBeDefined();
    });

    it('should still render kebab-case components correctly', () => {
      const doc = '<my-component />';
      const components = makeComponents('my-component');

      const hast = mdxish(doc, { components });

      const component = hast.children.find(child => child.type === 'element' && child.tagName === 'my-component');
      expect(component).toBeDefined();
    });

    it('should still render GFM blockquotes', () => {
      const doc = '> This is a blockquote';
      const hast = mdxish(doc);

      const blockquote = hast.children.find(child => child.type === 'element' && child.tagName === 'blockquote');
      expect(blockquote).toBeDefined();
    });
  });
});
