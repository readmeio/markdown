import type { Blockquote, Paragraph, Root, Text } from 'mdast';
import type { Node, Position } from 'unist';

import { collectNodes, parseMdxishWithSlices } from '../../../helpers';

import { findPositionViolations } from './position-invariant';

const violationsOf = (doc: string, breakTree: (tree: Root) => void = () => {}) => {
  const { tree, source } = parseMdxishWithSlices(doc);
  breakTree(tree);
  return findPositionViolations(tree, () => source);
};

const requirePosition = (node: Node): Position => {
  if (!node.position) throw new Error(`${node.type} has no position`);
  return node.position;
};

const firstParagraph = (tree: Root) => collectNodes<Paragraph>(tree, 'paragraph')[0];
const firstText = (tree: Root) => collectNodes<Text>(tree, 'text')[0];

describe('findPositionViolations', () => {
  it.each([
    ['plain text', 'Hello *world*'],
    ['blockquote continuation lines', '> one\n> two'],
    ['list continuation lines', '- one\n  two'],
    ['backslash escapes and entities', 'Esc \\* &amp; &copy;'],
    ['CRLF line endings', 'one\r\ntwo\r\n\r\n- item'],
    ['tab indentation', '-\tone\n\n\tmore'],
    ['an orphan void closer', '<table>\n<tr><td>a </br>b</td></tr>\n</table>'],
  ])('accepts %s', (_, doc) => {
    expect(violationsOf(doc)).toStrictEqual([]);
  });

  it('reports a node with no position', () => {
    const violations = violationsOf('Hello', tree => {
      delete firstText(tree).position;
    });
    expect(violations).toStrictEqual([{ kind: 'missing-position', node: 'text', path: 'root / paragraph' }]);
  });

  it('reports a shifted offset whose points and slice no longer match', () => {
    const violations = violationsOf('Hello world', tree => {
      const position = requirePosition(firstText(tree));
      position.start = { ...position.start, offset: 6 };
    });
    expect(violations).toStrictEqual([
      { kind: 'point-mismatch', node: 'text', path: 'root / paragraph' },
      { kind: 'slice-mismatch', node: 'text', path: 'root / paragraph', slice: 'world' },
    ]);
  });

  it('reports a container whose slice starts at whitespace', () => {
    const violations = violationsOf('> quote', tree => {
      requirePosition(tree.children[0]).start = { line: 1, column: 2, offset: 1 };
    });
    expect(violations).toStrictEqual([{ kind: 'slice-mismatch', node: 'blockquote', path: 'root', slice: ' quote' }]);
  });

  it('reports a child outside its parent range', () => {
    const violations = violationsOf('one\n\ntwo', tree => {
      requirePosition(firstParagraph(tree)).end = { line: 1, column: 2, offset: 1 };
    });
    expect(violations).toStrictEqual([{ kind: 'outside-parent', node: 'text', path: 'root / paragraph' }]);
  });

  it('reports point objects shared between nodes', () => {
    const violations = violationsOf('Hello', tree => {
      requirePosition(firstText(tree)).start = requirePosition(firstParagraph(tree)).start;
    });
    expect(violations).toStrictEqual([{ kind: 'shared-point', node: 'text', path: 'root / paragraph' }]);
  });

  it('reports overlapping siblings', () => {
    const violations = violationsOf('one\n\ntwo', tree => {
      requirePosition(tree.children[1]).start = { line: 1, column: 3, offset: 2 };
    });
    expect(violations).toStrictEqual([{ kind: 'sibling-overlap', node: 'paragraph', path: 'root' }]);
  });

  it('holds a synthesized node that takes its parent range to containment only', () => {
    const violations = violationsOf('> quote', tree => {
      const [blockquote] = collectNodes<Blockquote>(tree, 'blockquote');
      const synthesized: Paragraph = {
        type: 'paragraph',
        children: [{ type: 'text', value: 'built from JSON', position: structuredClone(blockquote.position) }],
        position: structuredClone(blockquote.position),
      };
      blockquote.children.push(synthesized);
    });
    expect(violations).toStrictEqual([]);
  });
});
