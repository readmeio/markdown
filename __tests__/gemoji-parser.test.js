const remarkParse = require('remark-parse');
const unified = require('unified');

const parser = require('../processor/parse/gemoji-parser');

test('should output emoji', () => {
  const emoji = 'joy';
  const markdown = `This is a gemoji :${emoji}:.`;
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a gemoji ' },
          {
            type: 'gemoji',
            value: '😂',
            name: emoji,
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast,
  );
});

test('should output an image node for a custom readme emoji', () => {
  const emoji = 'owlbert';
  const markdown = `This is a gemoji :${emoji}:.`;
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a gemoji ' },
          {
            type: 'image',
            title: `:${emoji}:`,
            alt: `:${emoji}:`,
            url: `/public/img/emojis/${emoji}.png`,
            data: {
              hProperties: {
                align: 'absmiddle',
                className: 'emoji',
                height: '20',
                width: '20',
              },
            },
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast,
  );
});

test('should output an <i> for a font awesome icon', () => {
  const emoji = 'fa-lock';
  const markdown = `This is a gemoji :${emoji}:.`;
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a gemoji ' },
          {
            type: 'i',
            data: {
              hName: 'i',
              hProperties: {
                className: ['fa', emoji],
              },
            },
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast,
  );
});

test('should support legacy dashes', () => {
  const emoji = 'white-check-mark';
  const markdown = `This is a gemoji :${emoji}:.`;
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a gemoji ' },
          {
            type: 'gemoji',
            value: '✅',
            name: emoji,
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast,
  );
});

test('should output nothing for unknown emojis', () => {
  const emoji = 'unknown-emoji';
  const markdown = `This is a gemoji :${emoji}:.`;
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: markdown }],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast,
  );
});
