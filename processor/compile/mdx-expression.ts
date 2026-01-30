import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx';

type MdxExpression = MdxFlowExpression | MdxTextExpression;

/**
 * Compiles an MDX expression (flow or text) back to markdown/JSX string.
 * Wraps the expression value in curly braces.
 */
const mdxExpression = (node: MdxExpression) => {
  return `{${node.value}}`;
};

export default mdxExpression;
