import type { Element } from 'hast';
import type { Root as MdastRoot } from 'mdast';

import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import Tabs, { Tab } from '../../components/Tabs';
import { mdxish } from '../../lib';
import { mdxishAstProcessor, mdxishMdastToMd } from '../../lib/mdxish';

import { captureMdxishProps, renderingEngines } from './utils';

describe('Tabs', () => {
  describe.each(renderingEngines)('%s', (_label, renderContent) => {
    it('renders multiple Tab children', () => {
      const md = `
<Tabs>
  <Tab title="First">First tab content</Tab>
  <Tab title="Second">Second tab content</Tab>
</Tabs>
`;
      const Component = renderContent(md);
      const { container } = render(<Component />);

      expect(container.querySelector('.TabGroup')).toBeInTheDocument();
      const buttons = container.querySelectorAll('.TabGroup-nav button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent('First');
      expect(buttons[1]).toHaveTextContent('Second');
      expect(container).toHaveTextContent('First tab content');
    });

    it('keeps inactive tabs mounted in the DOM but hidden, and swaps visibility on click', () => {
      const md = `
<Tabs>
  <Tab title="First">First tab content</Tab>
  <Tab title="Second">
    <Accordion title="Random">Second tab content</Accordion>
  </Tab>
</Tabs>
`;
      const Component = renderContent(md);
      const { container } = render(<Component />);

      const panels = container.querySelectorAll('.TabGroup section > div');
      expect(panels).toHaveLength(2);
      // Inactive panel stays in the DOM so runtime Tailwind can scan its classes on first paint
      expect(panels[1].querySelector('.Accordion')).toBeInTheDocument();
      expect(panels[0]).toBeVisible();
      expect(panels[1]).not.toBeVisible();

      const buttons = container.querySelectorAll('.TabGroup-nav button');
      fireEvent.click(buttons[1]);

      // Panel visibility swaps, and the custom component stays mounted and rendered
      expect(panels[0]).not.toBeVisible();
      expect(panels[1]).toBeVisible();
      expect(panels[1].querySelector('.Accordion')).toBeInTheDocument();
      expect(panels[1]).toHaveTextContent('Second tab content');
    });

    it('renders a single Tab without crashing', () => {
      const md = `
<Tabs>
  <Tab title="Only">Only tab content</Tab>
</Tabs>
`;
      const Component = renderContent(md);
      const { container } = render(<Component />);

      expect(container.querySelector('.TabGroup')).toBeInTheDocument();
      const buttons = container.querySelectorAll('.TabGroup-nav button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent('Only');
      expect(container).toHaveTextContent('Only tab content');
    });

    it('renders a single Tab containing a fenced code block', () => {
      const md = [
        '<Tabs>',
        '  <Tab title="JSON Schema">',
        '    ```json',
        '    {',
        '      "$schema": "http://json-schema.org/draft-07/schema#"',
        '    }',
        '    ```',
        '  </Tab>',
        '</Tabs>',
        '',
      ].join('\n');
      const Component = renderContent(md);
      const { container } = render(<Component />);

      const tabButtons = container.querySelectorAll('.TabGroup-nav button');
      expect(tabButtons).toHaveLength(1);
      expect(tabButtons[0]).toHaveTextContent('JSON Schema');
      expect(container.querySelector('.CodeTabs')).toBeInTheDocument();
      expect(container).toHaveTextContent('$schema');
    });

    it('renders Tabs with icon and iconColor props', () => {
      const md = `
<Tabs>
  <Tab title="Settings" icon="fa-gear" iconColor="#FF0000">Settings content</Tab>
  <Tab title="Profile" icon="fa-user" iconColor="#00FF00">Profile content</Tab>
</Tabs>
`;
      const Component = renderContent(md);
      const { container } = render(<Component />);

      const icons = container.querySelectorAll('i.TabGroup-icon');
      expect(icons).toHaveLength(2);
      expect(icons[0]).toHaveClass('fa-gear');
      expect(icons[1]).toHaveClass('fa-user');
    });

    it('renders inline markdown formatting inside a Tab', () => {
      const md = `
<Tabs>
  <Tab title="A">Some **bold** text and a [link](https://example.com).</Tab>
  <Tab title="B">Plain text.</Tab>
</Tabs>
`;
      const Component = renderContent(md);
      const { container } = render(<Component />);

      expect(container.querySelector('strong')).toHaveTextContent('bold');
      expect(container.querySelector('a')).toHaveTextContent('link');
    });

    it('renders Tabs after sibling content without crashing', () => {
      const md = `
Hello
<Tabs>
  <Tab title="First">First</Tab>
  <Tab title="Second">Second</Tab>
</Tabs>
`;
      const Component = renderContent(md);
      expect(() => render(<Component />)).not.toThrow();
    });
  });

  describe('mdxish HAST tree', () => {
    it('preserves Tab children as direct children of Tabs', () => {
      const md = `
<Tabs>
  <Tab title="First">First tab content</Tab>
  <Tab title="Second">Second tab content</Tab>
</Tabs>
`;
      const tree = mdxish(md);
      const tabsNode = tree.children[0] as Element;
      expect(tabsNode.tagName).toBe('Tabs');

      const tabChildren = tabsNode.children.filter(
        (child): child is Element => child.type === 'element' && child.tagName === 'Tab',
      );
      expect(tabChildren).toHaveLength(2);
      expect(tabChildren[0].properties?.title).toBe('First');
      expect(tabChildren[1].properties?.title).toBe('Second');
    });

    it('preserves a single Tab child as a direct child of Tabs', () => {
      const md = `
<Tabs>
  <Tab title="Only">Only tab content</Tab>
</Tabs>
`;
      const tree = mdxish(md);
      const tabsNode = tree.children[0] as Element;
      expect(tabsNode.tagName).toBe('Tabs');

      const tabChildren = tabsNode.children.filter(
        (child): child is Element => child.type === 'element' && child.tagName === 'Tab',
      );
      expect(tabChildren).toHaveLength(1);
      expect(tabChildren[0].properties?.title).toBe('Only');
    });

    it('passes icon props through unchanged', () => {
      const md = `
<Tabs>
  <Tab title="Settings" icon="fa-gear" iconColor="#FF0000">Settings content</Tab>
</Tabs>
`;
      const tree = mdxish(md);
      const tabsNode = tree.children[0] as Element;
      const tabNode = tabsNode.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'Tab',
      );
      expect(tabNode.properties?.icon).toBe('fa-gear');
      expect(tabNode.properties?.iconColor).toBe('#FF0000');
    });
  });

  describe('roundtrip (mdxish)', () => {
    const roundtrip = (md: string) => {
      const { processor, parserReadyContent } = mdxishAstProcessor(md);
      const mdast = processor.runSync(processor.parse(parserReadyContent)) as MdastRoot;
      return mdxishMdastToMd(mdast);
    };

    it('preserves a multi-Tab block', () => {
      const md = `<Tabs>
  <Tab title="First">First tab content</Tab>
  <Tab title="Second">Second tab content</Tab>
</Tabs>
`;
      const out = roundtrip(md);
      expect(out).toContain('<Tabs>');
      expect(out).toContain('<Tab title="First"');
      expect(out).toContain('<Tab title="Second"');
      expect(out).toContain('First tab content');
      expect(out).toContain('Second tab content');
      expect(roundtrip(out)).toBe(out);
    });

    it('preserves a single-Tab block', () => {
      const md = `<Tabs>
  <Tab title="Only">Only tab content</Tab>
</Tabs>
`;
      const out = roundtrip(md);
      expect(out).toContain('<Tabs>');
      expect(out).toContain('<Tab title="Only"');
      expect(out).toContain('Only tab content');
      const tabCount = (out.match(/<Tab\b/g) ?? []).length;
      expect(tabCount).toBe(1);
      expect(roundtrip(out)).toBe(out);
    });

    it('preserves icon and iconColor props', () => {
      const md = `<Tabs>
  <Tab title="Settings" icon="fa-gear" iconColor="#FF0000">Settings content</Tab>
  <Tab title="Profile" icon="fa-user" iconColor="#00FF00">Profile content</Tab>
</Tabs>
`;
      const out = roundtrip(md);
      expect(out).toMatch(/icon="fa-gear"/);
      expect(out).toMatch(/iconColor="#FF0000"/);
      expect(out).toMatch(/icon="fa-user"/);
      expect(out).toMatch(/iconColor="#00FF00"/);
      expect(roundtrip(out)).toBe(out);
    });

    it('preserves a single Tab containing a fenced code block', () => {
      const md = `<Tabs>
  <Tab title="JSON Schema">

\`\`\`json
{ "$schema": "http://json-schema.org/draft-07/schema#" }
\`\`\`

  </Tab>
</Tabs>
`;
      const out = roundtrip(md);
      expect(out).toContain('<Tabs>');
      expect(out).toContain('<Tab title="JSON Schema"');
      expect(out).toContain('```json');
      expect(out).toContain('$schema');
      const tabCount = (out.match(/<Tab\b/g) ?? []).length;
      expect(tabCount).toBe(1);
    });
  });

  describe('render', () => {
    it('renders a TabGroup wrapper', () => {
      const { container } = render(
        <Tabs>
          <Tab title="A">a</Tab>
          <Tab title="B">b</Tab>
        </Tabs>,
      );
      expect(container.querySelector('.TabGroup')).toBeInTheDocument();
    });

    it('renders a button for each Tab', () => {
      const { container } = render(
        <Tabs>
          <Tab title="A">a</Tab>
          <Tab title="B">b</Tab>
        </Tabs>,
      );
      const buttons = container.querySelectorAll('.TabGroup-nav button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent('A');
      expect(buttons[1]).toHaveTextContent('B');
    });

    it('keeps every tab mounted but shows only the active one, and swaps on click', () => {
      const { container } = render(
        <Tabs>
          <Tab title="A">aaa</Tab>
          <Tab title="B">bbb</Tab>
        </Tabs>,
      );
      const panels = container.querySelectorAll('.TabGroup section > div');
      expect(panels).toHaveLength(2);
      expect(panels[0]).toBeVisible();
      expect(panels[0]).toHaveTextContent('aaa');
      expect(panels[1]).not.toBeVisible();
      expect(panels[1]).toHaveTextContent('bbb');

      const buttons = container.querySelectorAll('.TabGroup-nav button');
      fireEvent.click(buttons[1]);

      expect(panels[0]).not.toBeVisible();
      expect(panels[1]).toBeVisible();
    });

    it('renders a single Tab without crashing', () => {
      const { container } = render(
        <Tabs>
          <Tab title="Only">only</Tab>
        </Tabs>,
      );
      const buttons = container.querySelectorAll('.TabGroup-nav button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent('Only');
      expect(container).toHaveTextContent('only');
    });

    it('renders no buttons when given no children', () => {
      const { container } = render(<Tabs />);
      expect(container.querySelector('.TabGroup')).toBeInTheDocument();
      expect(container.querySelectorAll('.TabGroup-nav button')).toHaveLength(0);
    });

    it('renders icon and iconColor when provided', () => {
      const { container } = render(
        <Tabs>
          <Tab icon="fa-gear" iconColor="#FF0000" title="Settings">x</Tab>
        </Tabs>,
      );
      const icon = container.querySelector('i.TabGroup-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('fa-gear');
      expect(icon).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    });

    it('mdxish: <Tab style="..."> renders without crashing and receives style as an object', () => {
      const md = '<Tabs>\n  <Tab title="Styled" style="color: red">body</Tab>\n</Tabs>';
      const [, renderMdxishContent] = renderingEngines.find(([label]) => label === 'mdxish')!;
      const Content = renderMdxishContent(md);

      expect(() => render(<Content />)).not.toThrow();

      const captured = captureMdxishProps(md, 'Tab');
      expect(typeof captured.style).toBe('object');
      expect(captured.style).toMatchObject({ color: 'red' });
    });
  });
});
