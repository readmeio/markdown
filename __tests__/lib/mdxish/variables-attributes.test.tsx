// `${...}` in these strings is markdown source for a template literal, not a JS template
/* eslint-disable no-template-curly-in-string */
import type { Variables } from '../../../types';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';
import { findElementByTagName } from '../../helpers';

const variables: Variables = {
  defaults: [{ name: 'region', default: 'us-east-1' }],
  user: { name: 'Dimas' },
};

const renderMd = (md: string, opts: { safeMode?: boolean } = {}) => {
  const tree = mdxish(md, { ...opts, variables });
  const { default: Content } = renderMdxish(tree, { variables });
  return render(<Content />).container;
};

describe('variables in component attributes', () => {
  describe.each([
    ['safeMode', true],
    ['unsafeMode', false],
  ])('%s', (_label, safeMode) => {
    it('resolves {user.*} in an Accordion title', () => {
      const container = renderMd('<Accordion title={user.name}>\nHi\n</Accordion>', { safeMode });

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('Dimas');
    });

    it('resolves {user.*} in a Card title nested inside Cards', () => {
      const md = `<Cards>
  <Card title={user.name} icon="fa-rocket">
   Hi
  </Card>
</Cards>`;
      const container = renderMd(md, { safeMode });

      expect(container.querySelector('.Card-title')).toHaveTextContent('Dimas');
    });

    it('leaves legacy <<>> syntax alone, since attributes are MDX-only', () => {
      const container = renderMd('<Accordion title="<<name>>">\nHi\n</Accordion>', { safeMode });

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('<<name>>');
    });

    it('falls back to a project default, then the uppercased name', () => {
      const md = '<Accordion title="{user.region} / {user.missing}">\nHi\n</Accordion>';
      const container = renderMd(md, { safeMode });

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('us-east-1 / MISSING');
    });

    it('substitutes variables embedded in surrounding attribute text', () => {
      const md = '<Accordion title="Hi {user.name}, you are in {user.region}">\nHi\n</Accordion>';
      const container = renderMd(md, { safeMode });

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('Hi Dimas, you are in us-east-1');
    });

    it('resolves attributes on plain HTML tags', () => {
      const container = renderMd('<a href="/docs/{user.region}" title="{user.name}">link</a>', { safeMode });

      expect(container.querySelector('a')).toHaveAttribute('href', '/docs/us-east-1');
      expect(container.querySelector('a')).toHaveAttribute('title', 'Dimas');
    });

    it('leaves escaped variables unsubstituted', () => {
      const container = renderMd('<Accordion title="\\{user.name\\}">\nHi\n</Accordion>', { safeMode });

      // Attribute strings are literal, so the escape characters survive as authored
      expect(container.querySelector('.Accordion-title')).toHaveTextContent('\\{user.name\\}');
    });
  });

  describe('formatting variations', () => {
    it('resolves across a multi-line opening tag', () => {
      const md = `<Accordion
  title={user.name}
  icon="fa-rocket"
>

Hi

</Accordion>`;
      const container = renderMd(md);

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('Dimas');
    });

    it('resolves on a condensed self-closing tag', () => {
      const container = renderMd('<Card title={user.name} href="/x"/>');

      expect(container.querySelector('.Card-title')).toHaveTextContent('Dimas');
    });
  });

  describe('resolution stays at render time', () => {
    it('keeps the unresolved reference in the parsed tree', () => {
      const tree = mdxish('<Accordion title={user.name}>\nHi\n</Accordion>', { variables });

      expect(findElementByTagName(tree, 'Accordion')).toMatchObject({
        tagName: 'Accordion',
        properties: { title: '{user.name}' },
      });
    });

    it('resolves a tree parsed without variables, as the MDX cache path does', () => {
      const serverTree = mdxish('<Accordion title={user.name}>\nHi\n</Accordion>');
      const { default: Content } = renderMdxish(serverTree, { variables });
      const { container } = render(<Content />);

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('Dimas');
    });
  });

  describe('composite expressions', () => {
    it.each([
      [
        'template literal',
        '<Accordion title={`Hi ${user.name} from ${user.region}`}>\nHi\n</Accordion>',
        'Hi Dimas from us-east-1',
      ],
      ['concatenation', '<Accordion title={"Hi " + user.name}>\nHi\n</Accordion>', 'Hi Dimas'],
      ['ternary', '<Accordion title={user.name ? `Hey ${user.name}` : "Anon"}>\nHi\n</Accordion>', 'Hey Dimas'],
      ['method call', '<Accordion title={user.name.toUpperCase()}>\nHi\n</Accordion>', 'DIMAS'],
    ])('resolves a %s', (_label, md, expected) => {
      expect(renderMd(md).querySelector('.Accordion-title')).toHaveTextContent(expected);
    });

    it('resolves on a plain HTML attribute', () => {
      const container = renderMd('<a href={`/docs/${user.region}`}>link</a>');

      expect(container.querySelector('a')).toHaveAttribute('href', '/docs/us-east-1');
    });

    it('resolves through a JSON round trip, as the MDX cache path does', () => {
      const serverTree = JSON.parse(
        JSON.stringify(mdxish('<Accordion title={`Hi ${user.name}`}>\nHi\n</Accordion>')),
      ) as Parameters<typeof renderMdxish>[0];
      const { default: Content } = renderMdxish(serverTree, { variables });

      expect(render(<Content />).container.querySelector('.Accordion-title')).toHaveTextContent('Hi Dimas');
    });

    it('re-resolves when the same tree is rendered for a second reader', () => {
      const tree = mdxish('<Accordion title={`Hi ${user.name}`}>\nHi\n</Accordion>');
      const first = renderMdxish(tree, { variables });
      const second = renderMdxish(tree, { variables: { defaults: [], user: { name: 'Alex' } } });

      expect(render(<first.default />).container.querySelector('.Accordion-title')).toHaveTextContent('Hi Dimas');
      expect(render(<second.default />).container.querySelector('.Accordion-title')).toHaveTextContent('Hi Alex');
    });

    it('is not supported in safeMode, which never evaluates expressions', () => {
      const md = '<Accordion title={`Hi ${user.name}`}>\nHi\n</Accordion>';

      expect(renderMd(md, { safeMode: true }).querySelector('.Accordion-title')).toHaveTextContent(
        '{`Hi ${user.name}`}',
      );
    });
  });

  describe('non-variable content', () => {
    it('keeps an unevaluatable attribute expression as literal braces', () => {
      const container = renderMd('<a href="#" title={someUnknownThing}>link</a>');

      expect(container.querySelector('a')).toHaveAttribute('title', '{someUnknownThing}');
    });

    it('does not retry an unresolved expression that never mentioned user', () => {
      // Retrying every parse-time failure at render would newly execute it in the reader's
      // browser, where globals differ from the server that parsed the cached tree
      const serverTree = mdxish('<a href="#" title={someUnknownThing}>link</a>');
      const { default: Content } = renderMdxish(serverTree, { variables });

      expect(render(<Content />).container.querySelector('a')).toHaveAttribute('title', '{someUnknownThing}');
    });

    it('does not treat a member named user as the user binding', () => {
      const container = renderMd('<a href="#" title={item.user}>link</a>');

      expect(container.querySelector('a')).toHaveAttribute('title', '{item.user}');
    });

    it('does not substitute inside a template-literal interpolation left as text', () => {
      const container = renderMd('<a href="#" title="Cost: ${user.name}">link</a>');

      expect(container.querySelector('a')).toHaveAttribute('title', 'Cost: ${user.name}');
    });

    it('leaves mermaid blocks alone, which variablesCodeResolver deliberately skips', () => {
      const md = '```mermaid\nsequenceDiagram\n  Client <<-->> {user.name}: Bidirectional\n```';
      const container = renderMd(md);

      expect(container.querySelector('pre')).toHaveTextContent('Client <<-->> {user.name}');
    });

    it('still resolves variables inside fenced code at parse time', () => {
      const container = renderMd('```js\nconst key = "<<name>>";\n```');

      expect(container.querySelector('pre')).toHaveTextContent('const key = "Dimas"');
    });
  });
});
