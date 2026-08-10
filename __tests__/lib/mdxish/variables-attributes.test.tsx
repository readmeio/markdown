import type { Variables } from '../../../types';

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';

import { mdxish, renderMdxish } from '../../../lib';
import { execute, findElementByTagName } from '../../helpers';

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

    it('leaves legacy <<>> syntax literal, since attributes resolve {user.*} only', () => {
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

    it('resolves bracket notation, which body text also accepts', () => {
      const container = renderMd('<Accordion title="{user[\'name\']}">\nHi\n</Accordion>', { safeMode });

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('Dimas');
    });

    it('leaves escaped variables unsubstituted', () => {
      const container = renderMd('<Accordion title="\\{user.name\\}">\nHi\n</Accordion>', { safeMode });

      // Attribute strings are literal, so the escape characters survive as authored
      expect(container.querySelector('.Accordion-title')).toHaveTextContent('\\{user.name\\}');
    });

    // CX-3789: `${user.name}` embeds `{user.name}`, so substituting inside it used to leave a
    // mangled `` `Hi $Dimas` ``. Composite expressions aren't resolved yet, so this stays literal.
    it('does not substitute inside a template-literal interpolation', () => {
      /* eslint-disable no-template-curly-in-string -- markdown source, not a JS template */
      const md = '<Accordion title={`Hi ${user.name}`}>\nHi\n</Accordion>';
      const expected = '{`Hi ${user.name}`}';
      /* eslint-enable no-template-curly-in-string */

      expect(renderMd(md, { safeMode }).querySelector('.Accordion-title')).toHaveTextContent(expected);
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

  describe('parity with the rmdx engine', () => {
    const renderWithMdx = (md: string) => {
      const Content = execute(md, {}, { variables }) as React.ComponentType;
      return render(<Content />).container;
    };

    it.each([
      ['a component attribute', '<Accordion title={user.name}>\nHi\n</Accordion>', '.Accordion-title'],
      ['a nested Card title', '<Cards>\n  <Card title={user.name}>\n  Hi\n  </Card>\n</Cards>', '.Card-title'],
    ])('resolves %s identically in rmdx and mdxish', (_label, md, selector) => {
      const expected = renderWithMdx(md).querySelector(selector)?.textContent;

      expect(expected).toContain('Dimas');
      expect(renderMd(md).querySelector(selector)).toHaveTextContent(expected as string);
    });

    it('substitutes in a quoted attribute where rmdx leaves it literal', () => {
      // Deliberate superset, not a parity bug: safeMode turns `title={user.name}` into the plain
      // string `{user.name}`, so quoted values have to resolve for safeMode to work at all
      const md = '<Accordion title="Hi {user.name}">\nHi\n</Accordion>';

      expect(renderWithMdx(md).querySelector('.Accordion-title')).toHaveTextContent('Hi {user.name}');
      expect(renderMd(md).querySelector('.Accordion-title')).toHaveTextContent('Hi Dimas');
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

  describe('non-variable content', () => {
    it('keeps an unevaluatable attribute expression as literal braces', () => {
      const container = renderMd('<a href="#" title={someUnknownThing}>link</a>');

      expect(container.querySelector('a')).toHaveAttribute('title', '{someUnknownThing}');
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

    it('is case-sensitive, matching body text', () => {
      const container = renderMd('<Accordion title="{USER.name} {user.name}">\nHi\n</Accordion>');

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('{USER.name} Dimas');
    });
  });

  // Raw markup reaches `dangerouslySetInnerHTML`, so substituting a reader's values into it would
  // hand them to whatever authored the markup.
  describe('raw HTML props', () => {
    it('leaves an Embed html prop literal', () => {
      const md = '<Embed url="https://example.com" title="t" html="<img src=\'/x?k={user.name}\'/>" />';
      const container = renderMd(md);

      expect(container.querySelector('.embed-media')?.innerHTML).toBe('<img src="/x?k={user.name}">');
    });

    it('leaves an HTMLBlock literal', () => {
      const container = renderMd('<HTMLBlock>{`<div>{user.name}</div>`}</HTMLBlock>');

      expect(container.querySelector('.rdmd-html')?.innerHTML).toBe('<div>{user.name}</div>');
    });
  });
});
