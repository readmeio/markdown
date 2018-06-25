const React = require('react');
const remark = require('remark');
const reactRenderer = require('remark-react');

const variableParser = require('./variable-parser');
const sanitizeSchema = require('hast-util-sanitize/lib/github.json');

sanitizeSchema.tagNames.push('readme-variable');
sanitizeSchema.attributes['readme-variable'] = ['variable'];

sanitizeSchema.tagNames.push('input');
sanitizeSchema.ancestors.input = ['li'];

const marked = require('marked');
const Emoji = require('./emojis.js').emoji;
const syntaxHighlighter = require('@readme/syntax-highlighter');
const sanitizer = require('./sanitizer');
const renderer = require('./renderer');

const emojis = new Emoji();

const Variable = require('../../Variable');

module.exports = function markdown(text, opts = {}) {
  marked.setOptions({
    sanitize: true,
    preserveNumbering: true,
    renderer,
    emoji(emojiText) {
      const emoji = emojiText.replace(/[^-_+a-zA-Z0-9]/g, '').toLowerCase();
      if (emoji.substr(0, 3) === 'fa-') {
        return `<i class="fa ${emoji}"></i>`;
      }
      if (emojis.is(emoji)) {
        return `<img src="/img/emojis/${emoji}.png" alt=":${emoji}+:" title=":${emoji}:" class="emoji" align="absmiddle" height="20" width="20">`;
      }
      return `:${emoji}:`;
    },
    highlight: syntaxHighlighter,
    gfm: true,
    breaks: !opts.correctnewlines,
    // By default we don't wanna strip any tags
    // so we use our sanitizer and not the built in
    // which just calls `escape()`
    sanitizer: opts.stripHtml ? undefined : sanitizer,
  });

  function heading(level) {
    return function (props) {
      const id = `section-${props.children[0].toLowerCase().replace(/[^\w]+/g, '-')}`
      return React.createElement(level, Object.assign({ className: 'header-scroll' }, props), [
        React.createElement('div', { className: 'anchor waypoint', id, key: `anchor-${id}` }),
        ...props.children,
        React.createElement('a', { className: 'fa fa-anchor', href: `#${id}`, key: `anchor-icon-${id}` })
      ]);
    }
  }

  return remark()
    .use(variableParser)
    .use(reactRenderer, {
      sanitize: sanitizeSchema,
      remarkReactComponents: {
        'readme-variable': function({ variable }) {
          return React.createElement(Variable, {
            k: variable,
            value: [{ name: 'project1', apiKey: '123' }, { name: 'project2', apiKey: '456' }],
            defaults: [],
            oauth: false,
          });
        },
        table: function({ children }) {
          return React.createElement('div', { className: 'marked-table' }, React.createElement('table', null, children));
        },
        h1: heading('h1'),
        h2: heading('h2'),
        h3: heading('h3'),
        h4: heading('h4'),
        h5: heading('h5'),
        h6: heading('h6'),
      },
    })
    .processSync(text).contents;

  return marked(text);
};
