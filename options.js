const options = {
  compatibilityMode: false,
  copyButtons: true,
  correctnewlines: false,
  markdownOptions: {
    fences: true,
    commonmark: true,
    gfm: true,
    ruleSpaces: false,
    listItemIndent: '1',
    spacedTable: true,
    paddedTable: true,
    setext: true,
  },
  normalize: true,
  settings: {
    position: false,
  },
};

// NOTE: disabling newline, paragraph, or text trips remark into an infinite loop!
const blocks = [
  // 'newline',
  'indentedCode',
  'fencedCode',
  'blockquote',
  'atxHeading',
  'thematicBreak',
  'list',
  'setextHeading',
  'html',
  'footnote',
  'definition',
  'table',
  // 'paragraph',
];

const inlines = [
  'escape',
  'autoLink',
  'url',
  'html',
  'link',
  'reference',
  'strong',
  'emphasis',
  'deletion',
  'code',
  'break',
  // 'text',
];

const toBeDecorated = {
  inlines: inlines.filter(i => !['link', 'reference'].includes(i)),
  blocks: [],
};

const disableTokenizers = {
  blocks: {
    disableTokenizers: {
      inline: toBeDecorated.inlines,
      block: toBeDecorated.blocks,
    },
  },
  inlines: {
    disableTokenizers: {
      inline: inlines.filter(i => !toBeDecorated.inlines.includes(i)),
      block: blocks.filter(b => !toBeDecorated.blocks.includes(b)),
    },
  },
};

const parseOptions = (opts = {}) => {
  if (opts.tokenizerSet in disableTokenizers) {
    return { ...disableTokenizers[opts.tokenizerSet], ...opts };
  } else if (opts.tokenizerSet) {
    throw new Error(`opts.tokenizerSet "${opts.tokenizerSet}" not one of "${Object.keys(disableTokenizers)}"`);
  }

  return opts;
};

export { options, parseOptions };
