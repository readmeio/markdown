import type { Html } from 'mdast';

/**
 * Writes html as authored; MDX-ish parses and hides `<!-- -->`, so only MDX needs the JSX comment.
 * Html re-parsed from a component body keeps its indent, which the JSX serializer would add again.
 */
const html = (node: Html) => (node.value || '').trimStart();

// Same peek as the default handler, so the character before html is escaped correctly.
html.peek = () => '<';

export default html;
