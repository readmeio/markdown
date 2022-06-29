const { defaultSchema } = require('hast-util-sanitize/lib/schema');

const createSchema = ({ safeMode } = {}) => {
  const schema = JSON.parse(JSON.stringify(defaultSchema));

  // Sanitization Schema Defaults
  schema.clobberPrefix = '';

  schema.tagNames.push('span');
  schema.attributes['*'].push('class', 'className', 'align');
  if (!safeMode) {
    schema.attributes['*'] = ['style'];
  }

  schema.tagNames.push('rdme-pin');

  schema.tagNames.push('rdme-embed');
  schema.attributes['rdme-embed'] = [
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

  schema.attributes.a = ['href', 'title', 'class', 'className', 'download'];

  schema.tagNames.push('figure');
  schema.tagNames.push('figcaption');

  schema.tagNames.push('input'); // allow GitHub-style todo lists
  schema.ancestors.input = ['li'];

  return schema;
};

module.exports = createSchema;
