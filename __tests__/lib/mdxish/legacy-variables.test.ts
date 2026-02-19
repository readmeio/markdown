import type { CustomComponents } from '../../../types';
import type { Element, Text } from 'hast';

import { mdxish } from '../../../lib';

function findElementByTagName(tree: Element, tagName: string): Element | null {
  if (tree.tagName === tagName) {
    return tree;
  }
  // Recursively search children
  let result: Element | null = null;
  tree.children.some(child => {
    if ('tagName' in child) {
      result = findElementByTagName(child as Element, tagName);
      return result !== null;
    }
    return false;
  });
  return result;
}

describe('legacy variables resolution', () => {
  describe('basic resolution', () => {
    it('should resolve a long <<>> to a variable node', () => {
      const varName = 'email';
      const md = `<<${varName}>>`;
      const tree = mdxish(md);

      expect(tree.children.length).toBeGreaterThanOrEqual(1);
      expect((tree.children[0] as Element).children).toHaveLength(1);

      const variableNode = (tree.children[0] as Element).children[0] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe(varName);
    });

    it('should resolve inline <<>> to a variable node', () => {
      const varName = 'email';
      const md = `Hello <<${varName}>>!`;
      const tree = mdxish(md);

      expect(tree.children.length).toBeGreaterThanOrEqual(1);
      const parent = tree.children[0] as Element;
      expect(parent.children).toHaveLength(3);

      const variableNode = parent.children[1] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe(varName);

      expect((parent.children[0] as Text).value).toBe('Hello ');
      expect((parent.children[2] as Text).value).toBe('!');
    });

    it('should resolve <<>> that is surrounded by text', () => {
      const varName = 'email';
      const md = `abcd<<${varName}>>efg`;
      const tree = mdxish(md);

      expect(tree.children.length).toBeGreaterThanOrEqual(1);
      const parent = tree.children[0] as Element;
      expect(parent.children).toHaveLength(3);

      const variableNode = parent.children[1] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe(varName);

      expect((parent.children[0] as Text).value).toBe('abcd');
      expect((parent.children[2] as Text).value).toBe('efg');
    });

    it('should parse multiple <<variables>> in sequence', () => {
      const md = '<<first>> <<second>>';
      const tree = mdxish(md);

      const firstChild = tree.children[0] as Element;
      expect(firstChild.children).toHaveLength(3); // first variable, space, second variable
      const firstVar = firstChild.children[0] as Element;
      const secondVar = firstChild.children[2] as Element;

      expect(firstVar.tagName).toBe('variable');
      expect(firstVar.properties.name).toBe('first');
      expect(secondVar.tagName).toBe('variable');
      expect(secondVar.properties.name).toBe('second');
    });

    it('should resolve <<variable>> in heading text to a variable node', () => {
      const md = '# Hello <<name>> world';
      const tree = mdxish(md);

      const parent = tree.children[0] as Element;
      expect(parent.tagName).toBe('h1');
      expect(parent.children).toHaveLength(3);

      const variableNode = parent.children[1] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe('name');
    });

    it('should resolve <<variable>> in list item text to a variable node', () => {
      const md = '- Hello <<name>> world';
      const tree = mdxish(md);

      const ulNode = tree.children[0] as Element;
      expect(ulNode.children).toHaveLength(3);
      const liNode = ulNode.children[1] as Element;
      const variableNode = liNode.children[1] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe('name');
    });

    it('should resolve <<variable>> in blockquote text to a variable node', () => {
      const md = '> Hello <<name>> world';
      const tree = mdxish(md);
      const blockquoteNode = findElementByTagName(tree.children[0] as Element, 'blockquote');
      expect(blockquoteNode).not.toBeNull();
    });
  });

  describe('variable name formats', () => {
    it('should handle variable with hyphens and underscores: <<user-name_123>>', () => {
      const md = '<<user-name_123>>';
      const tree = mdxish(md);

      const variableNode = (tree.children[0] as Element).children[0] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe('user-name_123');
    });

    it('should handle variable with dots: <<user.name>>', () => {
      const md = '<<user.name>>';
      const tree = mdxish(md);

      const variableNode = (tree.children[0] as Element).children[0] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe('user.name');
    });

    it('should handle variable with spaces: <<user name>>', () => {
      const md = '<<user name>>';
      const tree = mdxish(md);

      const parent = tree.children[0] as Element;
      expect(parent.children).toHaveLength(1);

      const variableNode = parent.children[0] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe('user name');
    });
  });

  describe('edge cases and escaping', () => {
    it('should resolve triple brackets <<<name>>>', () => {
      const md = '<<<name>>>';
      const tree = mdxish(md);

      const parent = tree.children[0] as Element;
      expect(parent.children).toHaveLength(3);
      expect((parent.children[0] as Text).value).toBe('<');
      expect((parent.children[1] as Element).tagName).toBe('variable');
      expect((parent.children[1] as Element).properties.name).toBe('name');
      expect((parent.children[2] as Text).value).toBe('>');
    });

    it('should not resolve variable if the first < is escaped', () => {
      const md = '\\<<name>>';
      const tree = mdxish(md);

      expect(findElementByTagName(tree.children[0] as Element, 'variable')).toBeNull();
    });

    it('should resolve double escaped <<variable>>', () => {
      const md = '\\\\<<name>>';
      const tree = mdxish(md);

      // Should still resolve the variable
      const parent = tree.children[0] as Element;
      expect(parent.children).toHaveLength(2);

      expect((parent.children[0] as Text).value).toBe('\\');
      expect((parent.children[1] as Element).tagName).toBe('variable');
      expect((parent.children[1] as Element).properties.name).toBe('name');
    });

    it('should not parse <<>> as a variable', () => {
      const md = '<<>>';
      const tree = mdxish(md);
      expect(findElementByTagName(tree.children[0] as Element, 'variable')).toBeNull();

      const parent = tree.children[0] as Element;
      expect((parent.children[0] as Text).value).toBe('<<>>');
    });

    it('should reject unclosed variable open <<', () => {
      const md = '<<name';
      const tree = mdxish(md);

      expect(findElementByTagName(tree.children[0] as Element, 'variable')).toBeNull();
    });
  });

  describe('HTML/JSX/Magic Blocks interaction', () => {
    it('should not parse valid HTML tags as variables: <div>', () => {
      const md = '<div>content</div>';
      const tree = mdxish(md);

      const parent = tree.children[0] as Element;
      expect(parent.tagName).toBe('div');
      expect((parent.children[0] as Text).value).toBe('content');
      expect(findElementByTagName(parent, 'variable')).toBeNull();
    });

    it('should parse <<variable>> next to HTML tags', () => {
      const md = '<<name>> <div>world</div>';
      const tree = mdxish(md);

      // Should parse <<name>> as variable AND <div> as HTML
      const firstChild = tree.children[0] as Element;
      const variableNode = firstChild.children[0] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe('name');
    });

    it('should parse <<variable>> next to JSX components', () => {
      const md = '<<name>> <Component />';
      const tree = mdxish(md);

      const firstChild = tree.children[0] as Element;
      const variableNode = firstChild.children[0] as Element;
      expect(variableNode.tagName).toBe('variable');
      expect(variableNode.properties.name).toBe('name');
    });

    it('should parse <<variable>> inside JSX component children', () => {
      const TestComponent = {} as CustomComponents[string];
      const md = '<TestComponent>Hello <<name>></TestComponent>';
      const tree = mdxish(md, { components: { TestComponent } });

      const variableNode = findElementByTagName(tree.children[0] as Element, 'variable');
      expect(variableNode).not.toBeNull();
    });

    it('should parse <<variable>> inside a readme components such as <Callout>', () => {
      const md = `
<Callout theme="warning">
My name is not <<name>>!
</Callout>
      `;
      const tree = mdxish(md);

      const variableNode = findElementByTagName(tree.children[0] as Element, 'variable');
      expect(variableNode).not.toBeNull();
    });

    it('should parse <<variable>> inside a readme components such as <Tabs>', () => {
      const md = `
<Tabs>
  <Tab title="First Tab">My name is <<name>>!</Tab>
  <Tab title="Second Tab">My name is not <<name>>!</Tab>
</Tabs>
      `;
      const tree = mdxish(md);

      expect((tree.children[0] as Element).children).toHaveLength(2);
      const firstTabParent = (tree.children[0] as Element).children[0] as Element;
      const secondTabParent = (tree.children[0] as Element).children[1] as Element;

      expect(findElementByTagName(firstTabParent, 'variable')).not.toBeNull();
      expect(findElementByTagName(secondTabParent, 'variable')).not.toBeNull();
    });

    it('should parse <<variable>> inside callout magic blocks', () => {
      const md = `
[block:callout]
{
  "type": "info",
  "body": "My name is <<name>>!"
}
[/block]`;
      const tree = mdxish(md);

      const variableNode = findElementByTagName(tree.children[0] as Element, 'variable');
      expect(variableNode).not.toBeNull();
    });

    it('should parse <<variable>> inside image magic blocks', () => {
      const md = `[block:image]
{
"images": [
  {
    "image": [
      "https://files.readme.io/327e65d-image.png",
      null,
      "Alt text"
    ],
    "caption": "This is a picture named <<name>>!"
  }
]
}
[/block]`;
      const tree = mdxish(md);

      const variableNode = findElementByTagName(tree.children[0] as Element, 'variable');
      expect(variableNode).not.toBeNull();
    });

    it('should parse <<variable>> inside parameters magic blocks', () => {
      const md = `[block:parameters]
{
  "data": {"h-0": "Header", "0-0": "My name is <<name>>!"},
  "cols": 1,
  "rows": 1
}
[/block]`;
      const tree = mdxish(md);

      // Tables generate multiple children nodes so go through all children
      let foundVariable = false;
      tree.children.forEach(child => {
        if (child.type === 'element' && child.tagName === 'table') {
          const variableNode = findElementByTagName(child as Element, 'variable');
          foundVariable = foundVariable || variableNode !== null;
        }
      });
      expect(foundVariable).toBe(true);
    });

    it('should parse <<variable>> inside api header magic blocks', () => {
      const md = `[block:api-header]
{
  "title": "My name is <<name>>!"
}
[/block]`;
      const tree = mdxish(md);
      const variableNode = findElementByTagName(tree.children[0] as Element, 'variable');
      expect(variableNode).not.toBeNull();
    });
  });

  describe('protected blocks', () => {
    it('should not parse <<variable>> inside <HTMLBlock>', () => {
      const md = '<HTMLBlock>{` hello <<name>> world `}</HTMLBlock>';
      const tree = mdxish(md);

      const parent = tree.children[0] as Element;
      expect(findElementByTagName(parent, 'variable')).toBeNull();
    });

    it('should not parse <<variable>> inside HTML magic blocks', () => {
      const md = `
[block:html]
{
  "html": "My name is <<name>>!"
}
[/block]
      `;
      const tree = mdxish(md);

      const variableNode = findElementByTagName(tree.children[0] as Element, 'variable');
      expect(variableNode).toBeNull();

      const htmlBlock = tree.children[0] as Element;
      expect(htmlBlock.tagName).toBe('html-block');
      expect(htmlBlock.properties.html).toBe('My name is <<name>>!');
    });

    it('should not parse <<variable>> inside code magic blocks', () => {
      const md = `
[block:code]
{
  "codes": [{"code": "My name is <<name>>!"}]
}
[/block]
      `;
      const tree = mdxish(md);

      // These variables will get resolved in the Code copmonent during rendering
      const variableNode = findElementByTagName(tree.children[0] as Element, 'variable');
      expect(variableNode).toBeNull();
    });
  });

  describe('glossary variables', () => {
    it('should resolve a glossary variable to a glossary component', () => {
      const md = '<<glossary:parliament>>';
      const tree = mdxish(md);

      expect((tree.children[0] as Element).children).toHaveLength(1);
      const parent = tree.children[0] as Element;
      const glossaryNode = parent.children[0] as Element;
      expect(glossaryNode.tagName).toBe('Glossary');
      expect(glossaryNode.properties.term).toBe('parliament');
    });

    it('should resolve a glossary variable with spaces', () => {
      const md = '<<glossary:parliament of the United Kingdom>>';
      const tree = mdxish(md);

      expect((tree.children[0] as Element).children).toHaveLength(1);
      const parent = tree.children[0] as Element;
      const glossaryNode = parent.children[0] as Element;
      expect(glossaryNode.tagName).toBe('Glossary');
      expect(glossaryNode.properties.term).toBe('parliament of the United Kingdom');
    });
  });
});
