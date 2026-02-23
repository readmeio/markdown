import type { Element } from 'hast';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import PostmanRunButton from '../../components/PostmanRunButton';
import { mdxish, renderMdxish } from '../../lib';

describe('PostmanRunButton', () => {
  describe('mdxish', () => {
    const md = `
<PostmanRunButton action="collection/fork" collectionId="123" collectionUrl="https://example.com" visibility="public" />
`;
    const mod = renderMdxish(mdxish(md));

    it('should not error when rendering', () => {
      expect(() => render(<mod.default />)).not.toThrow();
    });

    it('should render a postman-run-button element', () => {
      const { container } = render(<mod.default />);
      expect(container.querySelector('.postman-run-button')).toBeInTheDocument();
    });

    it('should set data attributes for simple props', () => {
      const { container } = render(<mod.default />);
      const button = container.querySelector('.postman-run-button');
      expect(button).toHaveAttribute('data-postman-action', 'collection/fork');
      expect(button).toHaveAttribute('data-postman-visibility', 'public');
    });

    it('should pass props through the HAST tree', () => {
      const tree = mdxish(md);
      const node = tree.children[0] as Element;
      expect(node.tagName).toBe('PostmanRunButton');
      expect(node.properties?.action).toBe('collection/fork');
      expect(node.properties?.colLectionId).toBe('123');
      expect(node.properties?.colLectionUrl).toBe('https://example.com');
      expect(node.properties?.visibility).toBe('public');
    });
  });

  describe('mdx', () => {
    it.todo('should render through the mdx pipeline');
  });

  describe('render', () => {
    it('renders a postman-run-button element', () => {
      const { container } = render(
        <PostmanRunButton action="collection/fork" collectionId="123" collectionUrl="https://example.com" visibility="public" />,
      );
      expect(container.querySelector('.postman-run-button')).toBeInTheDocument();
    });

    it('sets data attributes correctly', () => {
      const { container } = render(
        <PostmanRunButton action="collection/fork" collectionId="abc" collectionUrl="https://example.com" visibility="public" />,
      );
      const button = container.querySelector('.postman-run-button');
      expect(button).toHaveAttribute('data-postman-action', 'collection/fork');
      expect(button).toHaveAttribute('data-postman-var-1', 'abc');
      expect(button).toHaveAttribute('data-postman-collection-url', 'https://example.com');
      expect(button).toHaveAttribute('data-postman-visibility', 'public');
    });
  });
});
