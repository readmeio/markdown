/* eslint-disable consistent-return */
const { insertBlockTokenizerBefore } = require('./utils');

const RGXP = /^\s*\[block:([^\]]*)\]([^]+?)\[\/block\]/;

const WrapPinnedBlocks = (node, json) => {
  if (!json.sidebar) return node;
  return {
    children: [node],
    type: 'rdme-pin',
    data: {
      hName: 'rdme-pin',
      className: 'pin',
    },
  };
};

const imgSizeValues = {
  full: '100%',
  original: 'auto',
};

const imgWidthBySize = new Proxy(imgSizeValues, {
  get: (widths, size) => (size?.match(/^\d+$/) ? `${size}%` : size in widths ? widths[size] : size),
});

const imgSizeByWidth = new Proxy(new Map(Array.from(imgSizeValues).reverse()), {
  get: (sizes, width) => {
    const match = width?.match(/^(\d+)%$/);
    return match ? match[1] : width in sizes ? sizes[width] : width;
  },
});

function tokenize({ compatibilityMode, safeMode, alwaysThrow }) {
  return function (eat, value) {
    let [match, type, json] = RGXP.exec(value) || [];

    if (!type) return;

    const originalMatch = match;
    match = match.trim();
    type = type.trim();

    try {
      json = JSON.parse(json);
    } catch (err) {
      json = {};
      // eslint-disable-next-line no-console
      console.error('Invalid Magic Block JSON:', err);

      if (alwaysThrow) {
        throw new Error('Invalid Magic Block JSON');
      }
    }

    if (Object.keys(json).length < 1) return eat(originalMatch);

    switch (type) {
      case 'code': {
        const children = json.codes.map(obj => ({
          type: 'code',
          value: obj.code.trim(),
          meta: obj.name || null,
          lang: obj.language,
          className: 'tab-panel',
          data: {
            hName: 'code',
            hProperties: {
              meta: obj.name || null,
              lang: obj.language,
            },
          },
        }));
        if (children.length === 1) {
          if (!children[0].value) return eat(originalMatch); // skip empty code tabs
          if (children[0].name) return eat(originalMatch)(WrapPinnedBlocks(children[0], json));
        }
        return eat(originalMatch)(
          WrapPinnedBlocks(
            {
              children,
              className: 'tabs',
              data: { hName: 'code-tabs' },
              type: 'code-tabs',
            },
            json,
          ),
        );
      }
      case 'api-header': {
        const depth = json.level || (compatibilityMode ? 1 : 2);
        return eat(originalMatch)(
          WrapPinnedBlocks(
            {
              type: 'heading',
              depth,
              children: 'title' in json ? this.tokenizeInline(json.title, eat.now()) : [],
            },
            json,
          ),
        );
      }
      case 'image': {
        const imgs = json.images
          .map(img => {
            if (!('image' in img)) return null;
            const [url, title, alt] = img.image;

            const block = {
              type: 'image',
              url,
              title,
              alt: alt || ('caption' in img ? img.caption : ''),
              data: {
                hProperties: {
                  ...(img.align && { align: img.align }),
                  className: img.border ? 'border' : '',
                  ...(img.sizing && { width: imgWidthBySize[img.sizing] }),
                },
              },
            };

            if (!img.caption) return block;
            return {
              type: 'figure',
              url,
              data: { hName: 'figure' },
              children: [
                block,
                {
                  type: 'figcaption',
                  data: { hName: 'figcaption' },
                  children: this.tokenizeBlock(img.caption, eat.now()),
                },
              ],
            };
          })
          .filter(e => e); // eslint-disable-line unicorn/prefer-array-find
        const img = imgs[0];

        if (!img || !img.url) return eat(originalMatch);
        return eat(originalMatch)(WrapPinnedBlocks(img, json));
      }
      case 'callout': {
        const types = {
          info: ['📘', 'info'],
          success: ['👍', 'okay'],
          warning: ['🚧', 'warn'],
          danger: ['❗️', 'error'],
        };
        json.type = json.type in types ? types[json.type] : [json.icon || '👍', json.type];
        const [icon, theme] = json.type;
        if (!(json.title || json.body)) return eat(originalMatch);
        return eat(originalMatch)(
          WrapPinnedBlocks(
            {
              type: 'rdme-callout',
              data: {
                hName: 'rdme-callout',
                hProperties: {
                  theme: theme || 'default',
                  icon,
                  title: json.title,
                  value: json.body,
                },
              },
              children: [...this.tokenizeBlock(json.title, eat.now()), ...this.tokenizeBlock(json.body, eat.now())],
            },
            json,
          ),
        );
      }
      case 'parameters': {
        const { data, rows, cols } = json;
        const tokenizeCell = this[compatibilityMode ? 'tokenizeBlock' : 'tokenizeInline'].bind(this);

        if (!Object.keys(data).length) return eat(originalMatch); // skip empty tables

        const sparseData = Object.entries(data).reduce((mapped, [key, v]) => {
          let [row, col] = key.split('-');
          row = row === 'h' ? 0 : parseInt(row, 10) + 1;
          col = parseInt(col, 10);

          mapped[row] ||= [];
          mapped[row][col] = v;

          return mapped;
        }, []);

        // The header row is not counted in the rows
        const children = Array.from({ length: rows + 1 }, (_, y) => {
          return {
            type: 'tableRow',
            children: Array.from({ length: cols }, (__, x) => ({
              type: y === 0 ? 'tableHead' : 'tableCell',
              children: sparseData[y]?.[x] ? tokenizeCell(sparseData[y][x], eat.now()) : [{ type: 'text', value: '' }],
            })),
          };
        });

        const table = {
          type: 'table',
          align: 'align' in json ? json.align : new Array(json.cols).fill('left'),
          children,
        };
        return eat(originalMatch)(WrapPinnedBlocks(table, json));
      }
      case 'embed': {
        const { title, url, html } = json;
        try {
          json.provider = new URL(url).hostname
            .split(/(?:www)?\./)
            .filter(i => i)
            .join('.');
        } catch {
          json.provider = url;
        }
        const data = {
          ...json,
          url,
          html,
          title,
        };
        return eat(originalMatch)(
          WrapPinnedBlocks(
            {
              type: 'embed',
              children: [
                {
                  type: 'link',
                  url,
                  title: json.provider,
                  children: [{ type: 'text', value: title }],
                },
              ],
              data: {
                hProperties: {
                  ...data,
                  href: url,
                },
                hName: 'rdme-embed',
              },
            },
            json,
          ),
        );
      }
      case 'html': {
        return eat(originalMatch)(
          WrapPinnedBlocks(
            {
              type: 'html-block',
              data: {
                hName: 'html-block',
                hProperties: {
                  html: json.html,
                  runScripts: compatibilityMode,
                  safeMode,
                },
              },
            },
            json,
          ),
        );
      }
      default: {
        return eat(originalMatch)(
          WrapPinnedBlocks(
            {
              type: 'div',
              children: this.tokenizeBlock(json.text || json.html, eat.now()),
              data: {
                hName: type || 'div',
                hProperties: json,
                ...json,
              },
            },
            json,
          ),
        );
      }
    }
  };
}

function parser() {
  const tokenizer = tokenize({
    compatibilityMode: this.data('compatibilityMode'),
    safeMode: this.data('safeMode'),
    alwaysThrow: this.data('alwaysThrow'),
  });

  insertBlockTokenizerBefore.call(this, {
    name: 'magicBlocks',
    before: 'blankLine',
    tokenizer,
  });
}

module.exports = parser;

module.exports.sanitize = sanitizeSchema => {
  // const tags = sanitizeSchema.tagNames;
  const attr = sanitizeSchema.attributes;
  attr.li = ['className', 'checked'];
  attr.pre = ['className', 'lang', 'meta'];
  attr.code = ['className', 'lang', 'meta'];
  attr.table = ['align'];

  return parser;
};

module.exports.imgSizeByWidth = imgSizeByWidth;
