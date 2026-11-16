import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';

type CellAlign = 'center' | 'left' | 'right' | null;

/** `left` is the browser default, so it's omitted. Lowercase tables get the HTML string form. */
export const cellStyle = (
  align: CellAlign,
  width: string | null = null,
  { html = false } = {},
): MdxJsxAttribute | null => {
  if (html) {
    if (!width) return null;
    return { type: 'mdxJsxAttribute', name: 'style', value: `width: ${width}` };
  }

  const declarations: string[] = [];
  if (align && align !== 'left') declarations.push(`textAlign: ${JSON.stringify(align)}`);
  if (width) declarations.push(`width: ${JSON.stringify(width)}`);
  if (declarations.length === 0) return null;

  return {
    type: 'mdxJsxAttribute',
    name: 'style',
    value: { type: 'mdxJsxAttributeValueExpression', value: `{ ${declarations.join(', ')} }` },
  };
};
