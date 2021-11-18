const { defaultSchema: sanitize } = require('hast-util-sanitize/lib/schema');

// Sanitization Schema Defaults
sanitize.clobberPrefix = '';

sanitize.tagNames.push('span', 'style');
sanitize.attributes['*'].push('class', 'className', 'align', 'style');

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
