import type { Element } from 'hast';

import { render, screen } from '@testing-library/react';
import React from 'react';

import Callout from '../../components/Callout';
import { mdxish } from '../../lib';

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

  describe('mdxish', () => {
    it('renders a callout with no title with no empty blank heading', () => {
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
