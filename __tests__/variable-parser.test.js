const unified = require('unified');
const remarkParse = require('remark-parse');
const parser = require('../processor/parse/variable-parser');

test('should output a variable node', () => {
  const markdown = 'This is a test <<apiKey>>.';
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a test ' },
          {
            type: 'readme-variable',
            text: 'apiKey',
            data: {
              hName: 'readme-variable',
              hProperties: {
                variable: 'apiKey',
              },
            },
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast
  );
});

test('should output a glossary node', () => {
  const markdown = 'This is a test <<glossary:item>>.';
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a test ' },
          {
            type: 'readme-glossary-item',
            data: {
              hName: 'readme-glossary-item',
              hProperties: {
                term: 'item',
              },
            },
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast
  );
});

test('should allow whitespace in glossary names', () => {
  const markdown = 'This is a test <<glossary:item name>>.';
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a test ' },
          {
            type: 'readme-glossary-item',
            data: {
              hName: 'readme-glossary-item',
              hProperties: {
                term: 'item name',
              },
            },
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast
  );
});

test('should allow underscored glossary terms', () => {
  const markdown = 'This is a test <<glossary:underscored_term>>.';
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a test ' },
          {
            type: 'readme-glossary-item',
            data: {
              hName: 'readme-glossary-item',
              hProperties: {
                term: 'underscored_term',
              },
            },
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast
  );
});

test('should allow non-english glossary terms', () => {
  const markdown = 'This is a test <<glossary:ラベル>>.';
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a test ' },
          {
            type: 'readme-glossary-item',
            data: {
              hName: 'readme-glossary-item',
              hProperties: {
                term: 'ラベル',
              },
            },
          },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast
  );
});

test('should allow escape variables to remain', () => {
  const markdown = 'This is a test escaped key \\<<apiKey\\>>.';
  const ast = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'This is a test escaped key ' },
          { type: 'text', value: '<<apiKey>>' },
          { type: 'text', value: '.' },
        ],
      },
    ],
  };

  expect(unified().use(remarkParse).use(parser).data('settings', { position: false }).parse(markdown)).toStrictEqual(
    ast
  );
});
