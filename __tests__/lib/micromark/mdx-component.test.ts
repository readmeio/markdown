import type { Html } from 'mdast';

import { describe, expect, it } from 'vitest';

import { mdxishAstProcessor } from '../../../lib';
import { collectNodes } from '../../helpers';

const htmlValues = (doc: string) => {
  const { processor, parserReadyContent } = mdxishAstProcessor(doc);
  return collectNodes<Html>(processor.parse(parserReadyContent), 'html').map(node => node.value);
};

describe('mdxComponent tokenizer', () => {
  describe('flow: closers hidden in the body', () => {
    it.each([
      ['a code span', '<Box title={a b}>\n`</Box>`\n</Box>'],
      ['a code span spanning lines', '<Box title={a b}>\n`code\n</Box>\nmore`\n</Box>'],
      ['a fence', '<Box title={a b}>\n```\n</Box>\n```\n</Box>'],
      ['an indented fence', '<Box title={a b}>\n  ```\n  </Box>\n  ```\n</Box>'],
      ['a tilde fence', '<Box title={a b}>\n~~~\n</Box>\n~~~\n</Box>'],
      ['an expression', '<Box title={a b}>\n{"</Box>"}\n</Box>'],
      ['an expression spanning lines', '<Box title={a b}>\n{"a\n</Box>\nb"}\n</Box>'],
      // eslint-disable-next-line no-template-curly-in-string
      ['a template literal', '<Box title={a b}>\n{`</Box>${"</Box>"}`}\n</Box>'],
      ['an attribute expression spanning lines', '<Box title={"\n</Box>\n"}>\none\n</Box>'],
    ])('claims the whole block past a closer in %s', (_label, doc) => {
      expect(htmlValues(doc)).toStrictEqual([doc]);
    });

    it('keeps a lone backtick literal, so the closer on its line still counts', () => {
      expect(htmlValues('<Box title={a b}>\n`x </Box>')).toStrictEqual(['<Box title={a b}>\n`x </Box>']);
    });

    it('ends a code span at a blank line, so a closer after it counts', () => {
      expect(htmlValues('<Box title={a b}>\n`a\n\n</Box>\nb`\n</Box>')[0]).toBe('<Box title={a b}>\n`a\n\n</Box>');
    });
  });

  describe('text: inline form', () => {
    it.each([
      ['a code span', 'Hi <Anchor href={x}>a `</Anchor>` b</Anchor> c', '<Anchor href={x}>a `</Anchor>` b</Anchor>'],
      ['a lone backtick', 'Hi <Anchor href={x}>a ` b</Anchor> c', '<Anchor href={x}>a ` b</Anchor>'],
      [
        'an expression',
        'Hi <Anchor href={x}>a {"</Anchor>"} b</Anchor> c',
        '<Anchor href={x}>a {"</Anchor>"} b</Anchor>',
      ],
      ['a brace in an attribute string', 'Hi <Anchor href={"}"}>x</Anchor> c', '<Anchor href={"}"}>x</Anchor>'],
    ])('claims one node past a closer in %s', (_label, doc, value) => {
      expect(htmlValues(doc)).toStrictEqual([value]);
    });

    it('leaves a code span that crosses a line to CommonMark', () => {
      expect(htmlValues('Hi <Anchor href={x}>a `x\n</Anchor>` b</Anchor>')).toStrictEqual([
        '<Anchor href={x}>',
        '</Anchor>',
      ]);
    });
  });
});
