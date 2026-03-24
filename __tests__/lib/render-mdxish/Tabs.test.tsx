import type { Element } from 'hast';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';

describe('Tabs renderer', () => {
  describe('given a basic Tabs with two Tab children', () => {
    const md = `
<Tabs>
  <Tab title="First">First tab content</Tab>
  <Tab title="Second">Second tab content</Tab>
</Tabs>
`;
    const mod = renderMdxish(mdxish(md));

    it('should not error when rendering', () => {
      expect(() => render(<mod.default />)).not.toThrow();
    });

    it('should render a TabGroup container', () => {
      const { container } = render(<mod.default />);
      expect(container.querySelector('div.TabGroup')).toBeInTheDocument();
    });

    it('should render a button for each tab', () => {
      const { container } = render(<mod.default />);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent('First');
      expect(buttons[1]).toHaveTextContent('Second');
    });

    it('should display the first tab content by default', () => {
      const { container } = render(<mod.default />);
      expect(container.textContent).toContain('First tab content');
    });

    it('should render each Tab as a direct child of Tabs', () => {
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
  });

  describe('given Tabs with icon props', () => {
    const md = `
<Tabs>
  <Tab title="Settings" icon="fa-gear" iconColor="#FF0000">Settings content</Tab>
  <Tab title="Profile" icon="fa-user" iconColor="#00FF00">Profile content</Tab>
</Tabs>
`;
    const mod = renderMdxish(mdxish(md));

    it('should render icon elements on the tab buttons', () => {
      const { container } = render(<mod.default />);
      const icons = container.querySelectorAll('i.TabGroup-icon');
      expect(icons).toHaveLength(2);
    });

    it('should pass icon props through the HAST tree', () => {
      const tree = mdxish(md);
      const tabsNode = tree.children[0] as Element;
      const tabChildren = tabsNode.children.filter(
        (child): child is Element => child.type === 'element' && child.tagName === 'Tab',
      );
      expect(tabChildren[0].properties?.icon).toBe('fa-gear');
      expect(tabChildren[0].properties?.iconColor).toBe('#FF0000');
      expect(tabChildren[1].properties?.icon).toBe('fa-user');
      expect(tabChildren[1].properties?.iconColor).toBe('#00FF00');
    });
  });

  describe('given a single Tab child', () => {
    const md = `
<Tabs>
  <Tab title="Only">Only tab content</Tab>
</Tabs>
`;
    const mod = renderMdxish(mdxish(md));

    it('should render a single tab button with the correct title', () => {
      const { container } = render(<mod.default />);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent('Only');
    });

    it('should display the tab content', () => {
      const { container } = render(<mod.default />);
      expect(container.textContent).toContain('Only tab content');
    });
  });

  describe('given Tabs with raw HTML content inside Tab children', () => {
    const mdCases = [
      [
        'compact indentation',
        `
<Tabs>
<Tab title="Certificate authentication">
<ol>
<li>
Sign into <strong>app.beyondtrust.io</strong>.<br>
The <strong>Home</strong> page displays.
</li>
<li>
Select <strong>Active Directory Settings</strong>.
</li>
<li>
Click the <strong>Microsoft Entra ID</strong> tab.
</li>
</ol>
</Tab>
<Tab title="Client-secret authentication">
<ol>
<li>
In the <a href="https://portal.azure.com/">Azure portal</a>,
add a client secret.
</li>
<li>
Copy the client secret to the <strong>Client Secret</strong> box.
</li>
</ol>
</Tab>
</Tabs>
`,
      ],
      [
        'more nested indentation',
        `
<Tabs>
  <Tab title="Certificate authentication">
<ol>
  <li>
    Sign into <strong>app.beyondtrust.io</strong>.<br>
    The <strong>Home</strong> page displays.
  </li>
  <li>
    Select <strong>Active Directory Settings</strong>.
  </li>
  <li>
    Click the <strong>Microsoft Entra ID</strong> tab.
  </li>
</ol>
  </Tab>
  <Tab title="Client-secret authentication">
<ol>
  <li>
    In the <a href="https://portal.azure.com/">Azure portal</a>,
    add a client secret.
  </li>
  <li>
    Copy the client secret to the <strong>Client Secret</strong> box.
  </li>
</ol>
  </Tab>
</Tabs>
`,
      ],
    ] as const;

    it.each(mdCases)('should not error when rendering (%s)', (_name, md) => {
      const mod = renderMdxish(mdxish(md));
      expect(() => render(<mod.default />)).not.toThrow();
    });

    it.each(mdCases)('should render both tab buttons (%s)', (_name, md) => {
      const mod = renderMdxish(mdxish(md));
      const { container } = render(<mod.default />);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent('Certificate authentication');
      expect(buttons[1]).toHaveTextContent('Client-secret authentication');
    });

    it.each(mdCases)('should produce two Tab children in the HAST tree (%s)', (_name, md) => {
      const tree = mdxish(md);
      const tabsNode = tree.children[0] as Element;
      expect(tabsNode.tagName).toBe('Tabs');

      const tabChildren = tabsNode.children.filter(
        (child): child is Element => child.type === 'element' && child.tagName === 'Tab',
      );
      expect(tabChildren).toHaveLength(2);
      expect(tabChildren[0].properties?.title).toBe('Certificate authentication');
      expect(tabChildren[1].properties?.title).toBe('Client-secret authentication');
    });
  });

  describe('given Tabs with markdown content inside Tab children', () => {
    const md = `
<Tabs>
  <Tab title="Code">

Some **bold** text and a [link](https://example.com).

  </Tab>
  <Tab title="Preview">

A list:
- item one
- item two

  </Tab>
</Tabs>
`;
    const mod = renderMdxish(mdxish(md));

    it('should not error when rendering', () => {
      expect(() => render(<mod.default />)).not.toThrow();
    });

    it('should render markdown in the active tab', () => {
      const { container } = render(<mod.default />);
      expect(container.querySelector('strong')).toHaveTextContent('bold');
      expect(container.querySelector('a')).toHaveTextContent('link');
    });
  });
});
