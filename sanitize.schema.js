const { defaultSchema: sanitize } = require('hast-util-sanitize/lib/schema.js');

// Sanitization Schema Defaults
sanitize.clobberPrefix = '';

sanitize.tagNames.push('span', 'style');
sanitize.attributes['*'].push('class', 'className', 'align', 'style');

/**
 * @todo don't manually whitelist custom component attributes
 *       within the engine!
 * @todo change `link` to `href`
 */
sanitize.attributes['tutorial-tile'] = ['backgroundColor', 'emoji', 'link', 'slug'];

sanitize.tagNames.push('rdme-pin');

sanitize.tagNames.push('rdme-embed');
sanitize.attributes['rdme-embed'] = [
  'url',
  'provider',
  'html',
  'title',
  'href',
  'iframe',
  'width',
  'height',
  'image',
  'favicon',
];

sanitize.attributes.a = ['href', 'title', 'class', 'className', 'download'];

sanitize.tagNames.push('figure');
sanitize.tagNames.push('figcaption');

sanitize.tagNames.push('input'); // allow GitHub-style todo lists
sanitize.ancestors.input = ['li'];

module.exports = sanitize;
