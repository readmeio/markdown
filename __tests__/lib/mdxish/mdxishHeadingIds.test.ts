import type { Element } from 'hast';
import type { Heading, Root } from 'mdast';

import { mdxish, mdxishAstProcessor, mdxishHeadingIds } from '../../../lib';
import { collectNodes } from '../../helpers';

const parse = (doc: string): Root => {
  const { parserReadyContent, processor } = mdxishAstProcessor(doc);
  return processor.runSync(processor.parse(parserReadyContent)) as Root;
};

const headingIds = (doc: string) => {
  const tree = parse(doc);
  const ids = mdxishHeadingIds(tree);
  return ids && collectNodes<Heading>(tree, 'heading').map(heading => ids.get(heading));
};

const hubIds = (doc: string) =>
  collectNodes<Element>(mdxish(doc), node => /^h[1-6]$/.test((node as Element).tagName ?? '')).map(
    node => node.properties.id,
  );

describe('mdxishHeadingIds (RM-18626)', () => {
  it.each([
    ['repeated headings', '## Setup\n\n## Setup', ['setup', 'setup-1']],
    ['a variable', '## Hello {user.name}', ['hello-username']],
    ['an explicit id', '## Prérequis {#prerequisites}\n\n## Prerequisites', ['prerequisites', 'prerequisites-1']],
    ['a literal expression', '## Setup {1+1}\n\n## Setup 2', ['setup-2', 'setup-2-1']],
    ['a string literal', '## Release {"v" + 2}', ['release-v2']],
    ['a comment in a heading', '## Setup {/* note */}', ['setup']],
    [
      'a heading in a component',
      '<Callout icon="📘" theme="info">\n  ### Setup\n</Callout>\n\n## Setup',
      ['setup', 'setup-1'],
    ],
    ['a non-literal expression in a sentence', 'Price: {price} per seat\n\n## Setup', ['setup']],
    ['a legacy magic block heading', '[block:api-header]\n{"title":"Magic","level":2}\n[/block]', ['magic']],
  ])('matches the hub for %s', (_, doc, expected) => {
    expect(headingIds(doc)).toStrictEqual(expected);
    expect(hubIds(doc)).toStrictEqual(expected);
  });

  it('counts raw HTML headings toward repeats without returning an id for them', () => {
    const doc = '{/*\n  multi-line\n*/}\n## Setup\n\n<h2>Setup</h2>\n\n## Setup';

    expect(headingIds(doc)).toStrictEqual(['setup', 'setup-2']);
    expect(hubIds(doc)).toStrictEqual(['setup', 'setup-1', 'setup-2']);
  });

  it.each([
    ['a non-literal expression in a heading', '## Digest {timeDescription}'],
    ['a non-literal expression on its own line', '{renderHeading()}\n\n## Setup'],
    ['a non-literal expression with JSX', 'Before {<h2>Setup</h2>} after\n\n## Setup'],
    ['an export', 'export const Title = () => <h2>Setup</h2>;\n\n## Setup'],
  ])('returns null for %s, which only running code could settle', (_, doc) => {
    expect(mdxishHeadingIds(parse(doc))).toBeNull();
  });

  it('leaves the tree it was given unchanged', () => {
    const tree = parse('## Setup {1+1} {/* note */}\n\n## Setup');
    const before = structuredClone(tree);

    mdxishHeadingIds(tree);

    expect(tree).toStrictEqual(before);
  });
});
