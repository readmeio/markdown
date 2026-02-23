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

    it('renders an embed with html content', () => {
      const md = `<Embed
        html='<iframe class="embedly-embed" src="//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fwww.google.com%2Fmaps%2Fembed%2Fv1%2Fplace%3Fcenter%3D37.829698%252C-122.258166%26key%3DAIzaSyD9HrlRuI1Ani0-MTZ7pvzxwxi4pgW0BCY%26zoom%3D16%26q%3D4126%2BOpal%2BSt%2C%2BOakland%2C%2BCA%2B94609&display_name=Google+Maps&url=https%3A%2F%2Fwww.google.com%2Fmaps%2Fplace%2F4126%2BOpal%2BSt%2C%2BOakland%2C%2BCA%2B94609%2F%4037.829698%2C-122.258166%2C16z%2Fdata%3D%214m5%213m4%211s0x80857dfb145a04ff%3A0x96b17d967421636f%218m2%213d37.8296978%214d-122.2581661%3Fhl%3Den&image=http%3A%2F%2Fmaps-api-ssl.google.com%2Fmaps%2Fapi%2Fstaticmap%3Fcenter%3D37.829698%2C-122.258166%26zoom%3D15%26size%3D250x250%26sensor%3Dfalse&key=02466f963b9b4bb8845a05b53d3235d7&type=text%2Fhtml&schema=google" width="600" height="450" scrolling="no" title="Google Maps embed" frameborder="0" allow="autoplay; fullscreen" allowfullscreen="true"></iframe>'
        url="https://www.google.com/maps/place/4126+Opal+St,+Oakland,+CA+94609/@37.829698,-122.258166,16z/data=!4m5!3m4!1s0x80857dfb145a04ff:0x96b17d967421636f!8m2!3d37.8296978!4d-122.2581661?hl=en"
        title="4126 Opal St, Oakland, CA 94609"
        favicon="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico"
        image="http://maps-api-ssl.google.com/maps/api/staticmap?center=37.829698,-122.258166&zoom=15&size=250x250&sensor=false"
      />`;
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.innerHTML).toMatchSnapshot();
    });

    it('renders an embed with meta content', () => {
      const md = `<Embed
        html={false}
        url="https://www.nytimes.com/2020/05/03/us/politics/george-w-bush-coronavirus-unity.html"
        title="George W. Bush Calls for End to Pandemic Partisanship"
        favicon="https://www.nytimes.com/vi-assets/static-assets/favicon-4bf96cb6a1093748bf5b3c429accb9b4.ico"
        image="https://static01.nyt.com/images/2020/05/02/world/02dc-virus-bush-2/merlin_171999921_e857a690-fb9b-462d-a20c-28c8161107c9-facebookJumbo.jpg"
      />`;
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.innerHTML).toMatchSnapshot();
    });

    it('renders an rdmd embed link', () => {
      const md = '[rdmd](https://www.nytimes.com/2020/05/03/us/politics/george-w-bush-coronavirus-unity.html "@embed")';
      const Content = execute(md);
      const { container } = render(<Content />);

      expect(container.innerHTML).toMatchSnapshot();
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
