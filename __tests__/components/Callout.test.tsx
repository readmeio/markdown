import type { Element } from 'hast';

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { expect } from 'vitest';

import Callout from '../../components/Callout';
import { mdxish } from '../../lib';

import { renderingEngines } from './utils';

describe('Callout', () => {
  it('render _all_ its children', () => {
    render(
      <Callout icon="icon" theme="theme" title="Title">
        <p>Title</p>
        <p>First Paragraph</p>
        <p>Second Paragraph</p>
      </Callout>,
    );

    expect(screen.getByText('Second Paragraph')).toBeVisible();
  });

  it("doesn't render all its children if it's **empty**", () => {
    render(
      <Callout empty icon="icon" theme="theme">
        <p>Title</p>
        <p>First Paragraph</p>
        <p>Second Paragraph</p>
      </Callout>,
    );

    expect(screen.queryByText('Title')).toBeNull();
  });

  it.each(renderingEngines)('%s: renders a callout with icon and body', (_label, renderContent) => {
    const md = `<Callout theme="info" icon="📘">
Hello there
</Callout>`;
    const Content = renderContent(md);
    const { container } = render(<Content />);

    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toHaveClass('callout', 'callout_info');
    expect(blockquote?.querySelector('.callout-icon')).toHaveTextContent('📘');
    expect(blockquote?.querySelector('p')).toHaveTextContent('Hello there');
    expect(container).toMatchSnapshot();
  });

  it.each(renderingEngines)('%s: renders the markdown inside the callout body', (_label, renderContent) => {
    const md = `<Callout theme="info" icon="📘">
### This should be a heading

This should be **strong** text, *italic* text, and a ~strikethrough~ text.
</Callout>`;
    const Content = renderContent(md);
    const { container } = render(<Content />);

    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toHaveClass('callout', 'callout_info');
    expect(blockquote?.querySelector('h3')).toHaveTextContent('This should be a heading');
    expect(blockquote?.querySelector('strong')).toHaveTextContent('strong');
    expect(blockquote?.querySelector('em')).toHaveTextContent('italic');
    expect(blockquote?.querySelector('del')).toHaveTextContent('strikethrough');
    expect(container).toMatchSnapshot();
  });

  describe('testing parsing robustness to various callout structures', () => {
    it.each(renderingEngines)('%s: should parse where there is space after the opening tag and before the closing tag', (_label, renderContent) => {
      const mdWithSpaces = `<Callout theme="info" icon="📘">


## Heading here

Body with **markdown** support.



</Callout>`;
      const mdWithoutSpaces = `<Callout theme="info" icon="📘">
## Heading here

Body with **markdown** support.
</Callout>`;

      const ContentWithSpaces = renderContent(mdWithSpaces);
      const { container: containerWithSpaces } = render(<ContentWithSpaces />);
      const ContentWithoutSpaces = renderContent(mdWithoutSpaces);
      const { container: containerWithoutSpaces } = render(<ContentWithoutSpaces />);

      expect(containerWithSpaces.innerHTML).toBe(containerWithoutSpaces.innerHTML);
    });
  });

  describe('mdxish-specific behaviours', () => {
    it('should correctly parse content when', () => {
      const md = `<Callout theme="info" icon="📘">
### Title here

Body with **markdown** support.
</Callout>`;
      const ast = mdxish(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('element');

      const calloutElement = ast.children[0] as Element;
      expect(calloutElement.tagName).toBe('Callout');

      const calloutChildren = calloutElement.children as Element[];
      expect(calloutChildren).toHaveLength(2);
      expect(calloutChildren[0].tagName).toBe('h3');
      expect(calloutChildren[1].tagName).toBe('p');
    });
  });
});
