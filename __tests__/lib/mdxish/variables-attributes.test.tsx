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

    // A bracket reference that stays literal must keep its authored source, not the normalized form
    it.each([
      ['an escape', "\\{user['name']}"],
      ['a closing escape', "{user['name']\\}"],
      ['escapes on both ends', "\\{user['name']\\}"],
      /* eslint-disable-next-line no-template-curly-in-string -- markdown source, not a JS template */
      ['a template literal', "${user['name']}"],
    ])('leaves bracket notation behind %s as authored', (_case, title) => {
      const container = renderMd(`<Accordion title="${title}">\nHi\n</Accordion>`, { safeMode });

      expect(container.querySelector('.Accordion-title')).toHaveTextContent(title);
    });

    it('leaves escaped variables unsubstituted', () => {
      const container = renderMd('<Accordion title="\\{user.name\\}">\nHi\n</Accordion>', { safeMode });

      // Attribute strings are literal, so the escape characters survive as authored
      expect(container.querySelector('.Accordion-title')).toHaveTextContent('\\{user.name\\}');
    });
  });

  // `${user.name}` embeds `{user.name}`; substituting inside it would leave a mangled `` `Hi $Dimas` ``.
  // safeMode keeps an expression as authored, otherwise it evaluates as a whole.
  describe('composite expressions by mode', () => {
    /* eslint-disable no-template-curly-in-string -- markdown source, not a JS template */
    it.each([
      ['a template literal', 'safeMode', true, '`Hi ${user.name}`', '{`Hi ${user.name}`}'],
      ['a template literal', 'unsafeMode', false, '`Hi ${user.name}`', 'Hi Dimas'],
      ['string concatenation', 'safeMode', true, '"Hi " + user.name', '{"Hi " + user.name}'],
      ['string concatenation', 'unsafeMode', false, '"Hi " + user.name', 'Hi Dimas'],
    ])('renders %s in %s', (_label, _mode, safeMode, title, expected) => {
      const container = renderMd(`<Accordion title={${title}}>\nHi\n</Accordion>`, { safeMode });

      expect(container.querySelector('.Accordion-title')?.textContent).toBe(expected);
    });
    /* eslint-enable no-template-curly-in-string */
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
      ['a composite expression', '<Accordion title={"Hi " + user.name}>\nHi\n</Accordion>', '.Accordion-title'],
      [
        'a composite Card title',
        // eslint-disable-next-line no-template-curly-in-string -- markdown source, not a JS template
        '<Cards>\n  <Card title={`Hi ${user.name}`}>\n  Hi\n  </Card>\n</Cards>',
        '.Card-title',
      ],
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

  // RM-10865
  describe('legacy variables in image alt text', () => {
    const altVariables = { ...variables, user: { ...variables.user, label: '<<region>>' } };

    it.each([
      ['a block image', '![<<region>> Domains](https://example.com/a.png)', 'us-east-1 Domains'],
      [
        'an image magic block',
        '[block:image]\n{"images":[{"image":["https://example.com/a.png","a.png","<<region>> Domains"]}]}\n[/block]',
        'us-east-1 Domains',
      ],
      ['an escaped variable', '![\\<<region>> Domains](https://example.com/a.png)', '<<region>> Domains'],
      ['an escaped variable in raw HTML', '<img src="a.png" alt="\\<<region>> Domains" />', '<<region>> Domains'],
      ['a glossary term', '<img src="a.png" alt="<<glossary:API>> diagram" />', 'API diagram'],
      ['a substituted value once', '<img src="a.png" alt="{user.label} <<region>>" />', '<<region>> us-east-1'],
    ])('resolves %s, parsed without variables as the SSR render server does', (_case, md, alt) => {
      const { default: Content } = renderMdxish(mdxish(md), { variables: altVariables });

      expect(render(<Content />).container.querySelector('img')).toHaveAttribute('alt', alt);
    });
  });

  describe('composite expressions', () => {
    const renderTitle = (title: string) =>
      renderMd(`<Accordion title={${title}}>\nHi\n</Accordion>`).querySelector('.Accordion-title');

    it.each([
      ['string concatenation', '"Hi " + user.name', 'Hi Dimas'],
      /* eslint-disable-next-line no-template-curly-in-string -- markdown source, not a JS template */
      ['a template literal', '`${user.name} in ${user.region}`', 'Dimas in us-east-1'],
      ['a ternary', 'user.name ? "Signed in" : "Guest"', 'Signed in'],
      ['a method call', 'user.name.toUpperCase()', 'DIMAS'],
      ['bracket notation', 'user["name"] + "!"', 'Dimas!'],
      ['an unknown variable, which falls back to its uppercased name', '"Hi " + user.missing', 'Hi MISSING'],
    ])('resolves %s', (_label, title, expected) => {
      // Exact match: the literal fallback contains every string the expression could produce
      expect(renderTitle(title)?.textContent).toBe(expected);
    });

    it('resolves a composite expression on a plain HTML attribute', () => {
      const container = renderMd('<a href={"/docs/" + user.region}>link</a>');

      expect(container.querySelector('a')).toHaveAttribute('href', '/docs/us-east-1');
    });

    it('mixes `user` with in-document exports', () => {
      const md = 'export const greeting = "Hello";\n\n<Accordion title={greeting + " " + user.name}>\nHi\n</Accordion>';

      expect(renderMd(md).querySelector('.Accordion-title')).toHaveTextContent('Hello Dimas');
    });

    it('lets an in-document `user` export shadow the variables', () => {
      const md = 'export const user = { name: "Exported" };\n\n<Accordion title={"Hi " + user.name}>\nHi\n</Accordion>';

      expect(renderMd(md).querySelector('.Accordion-title')).toHaveTextContent('Hi Exported');
    });

    it('stays literal in a tree parsed without variables, as the MDX cache path does', () => {
      const serverTree = mdxish('<Accordion title={"Hi " + user.name}>\nHi\n</Accordion>');
      const { default: Content } = renderMdxish(serverTree, { variables });
      const { container } = render(<Content />);

      expect(container.querySelector('.Accordion-title')).toHaveTextContent('{"Hi " + user.name}');
    });
  });

  describe('object-valued variables', () => {
    const structuredVariables: Variables = {
      defaults: [],
      user: { keys: [{ name: 'production', apiKey: 'abc123' }], count: 3 },
    };

    const parseTitle = (title: string) =>
      findElementByTagName(
        mdxish(`<Accordion title={${title}}>\nHi\n</Accordion>`, { variables: structuredVariables }),
        'Accordion',
      )?.properties.title;

    const renderTitle = (title: string) => {
      const tree = mdxish(`<Accordion title={${title}}>\nHi\n</Accordion>`, { variables: structuredVariables });
      const { default: Content } = renderMdxish(tree, { variables: structuredVariables });
      return render(<Content />).container.querySelector('.Accordion-title');
    };

    // Evaluating it would hand the component a raw array, which crashes one rendering it as a child
    it.each([
      ['dot notation', 'user.keys'],
      ['single-quoted bracket notation', "user['keys']"],
      ['double-quoted bracket notation', 'user["keys"]'],
    ])('stringifies a bare reference in %s at render time instead of passing the raw value', (_label, title) => {
      expect(parseTitle(title)).toBe(`{${title}}`);
      expect(renderTitle(title)).toHaveTextContent('[{"name":"production","apiKey":"abc123"}]');
    });

    it('reads into a structured value', () => {
      expect(renderTitle('user.keys[0].name')).toHaveTextContent('production');
      expect(renderTitle('user.keys.map(key => key.name).join(", ")')).toHaveTextContent('production');
    });

    it('keeps a non-string result as a real prop value, as rmdx does', () => {
      expect(parseTitle('user.count + 1')).toBe(4);
      expect(parseTitle('user.keys.slice(0, 1)')).toStrictEqual([{ name: 'production', apiKey: 'abc123' }]);
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

    it('never exposes `user` to an Embed html expression', () => {
      const md = '<Embed url="https://example.com" title="t" html={"<b>" + user.name + "</b>"} />';
      const container = renderMd(md);

      expect(container.querySelector('.embed-media')?.innerHTML).toBe('{"<b>" + user.name + "</b>"}');
      expect(container).not.toHaveTextContent('Dimas');
    });

    it('still evaluates an Embed html expression that does not read `user`', () => {
      const md = '<Embed url="https://example.com" title="t" html={"<b>" + "hi" + "</b>"} />';
      const container = renderMd(md);

      expect(container.querySelector('.embed-media')?.innerHTML).toBe('<b>hi</b>');
    });

    it('leaves an HTMLBlock literal', () => {
      const container = renderMd('<HTMLBlock>{`<div>{user.name}</div>`}</HTMLBlock>');

      expect(container.querySelector('.rdmd-html')?.innerHTML).toBe('<div>{user.name}</div>');
    });
  });
});
