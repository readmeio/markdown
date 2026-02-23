import type { Element } from 'hast';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import Embed from '../../components/Embed';
import { mdxish, renderMdxish } from '../../lib';
import { execute } from '../helpers';

describe('Embed', () => {
  describe('mdxish', () => {
    describe('given an Embed in link mode', () => {
      const md = `
<Embed url="https://example.com" title="Example" />
`;
      const mod = renderMdxish(mdxish(md));

      it('should not error when rendering', () => {
        expect(() => render(<mod.default />)).not.toThrow();
      });

      it('should render an embed wrapper', () => {
        const { container } = render(<mod.default />);
        expect(container.querySelector('.embed')).toBeInTheDocument();
      });

      it('should render an embed-link anchor', () => {
        const { container } = render(<mod.default />);
        const link = container.querySelector('a.embed-link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://example.com');
      });

      it('should render the embed title', () => {
        const { container } = render(<mod.default />);
        const title = container.querySelector('.embed-title');
        expect(title).toBeInTheDocument();
        expect(title).toHaveTextContent('Example');
      });
    });

    describe('given an Embed in iframe mode', () => {
      const md = `
<Embed url="https://example.com" title="Example" iframe="true" />
`;
      const mod = renderMdxish(mdxish(md));

      it('should not error when rendering', () => {
        expect(() => render(<mod.default />)).not.toThrow();
      });

      it('should render an iframe element', () => {
        const { container } = render(<mod.default />);
        const iframe = container.querySelector('iframe');
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', 'https://example.com');
        expect(iframe).toHaveAttribute('title', 'Example');
      });
    });

    describe('given the HAST tree', () => {
      const md = `
<Embed url="https://example.com" title="Example" />
`;

      it('should pass props through the HAST tree', () => {
        const tree = mdxish(md);
        const node = tree.children[0] as Element;
        expect(node.tagName).toBe('embed');
        expect(node.properties?.url).toBe('https://example.com');
        expect(node.properties?.title).toBe('Example');
      });
    });
  });

  describe('mdx', () => {
    it('renders an embed in link mode', () => {
      const md = '<Embed url="https://example.com" title="Example" />';
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.querySelector('.embed')).toBeInTheDocument();
      const link = container.querySelector('a.embed-link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders an embed in iframe mode', () => {
      const md = '<Embed url="https://example.com" title="Example" iframe={true} height="550" />';
      const Content = execute(md);
      const { container } = render(<Content />);

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://example.com');
    });
  });

  describe('render', () => {
    it('renders in link mode with title', () => {
      const { container } = render(<Embed title="Example" url="https://example.com" />);
      expect(container.querySelector('.embed')).toBeInTheDocument();
      const link = container.querySelector('a.embed-link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(container.querySelector('.embed-title')).toHaveTextContent('Example');
    });

    it('renders in iframe mode', () => {
      const { container } = render(<Embed iframe={true} title="Example" url="https://example.com" />);
      const iframe = container.querySelector('iframe');
      expect(iframe).toHaveAttribute('src', 'https://example.com');
      expect(iframe).toHaveAttribute('title', 'Example');
    });

    it('renders html content when html prop is provided', () => {
      const { container } = render(<Embed html="<b>Embedded</b>" title="Example" url="https://example.com" />);
      expect(container.querySelector('.embed-media')).toBeInTheDocument();
    });

    it('derives provider from url', () => {
      const { container } = render(<Embed title="Example" url="https://www.example.com/page" />);
      expect(container.querySelector('.embed-provider')).toHaveTextContent('example.com');
    });
  });
});
