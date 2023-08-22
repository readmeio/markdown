import { SKIP, visit } from 'unist-util-visit';

const rxEscapedPipe = /\\\|/g;

/**
 * HAST Transformer that finds all inline code nodes within table cells and
 * unescapes any escaped pipe chars so that the editor outputs them without
 * escape chars.
 *
 * This appears to be a bug with remark-parse < ~8
 */
const tableCellInlineCode = () => tree => {
  visit(tree, [{ tagName: 'th' }, { tagName: 'td' }], tableCellNode => {
    visit(tableCellNode, { tagName: 'code' }, inlineCodeNode => {
      const textNode = inlineCodeNode.children[0];

      if (textNode && rxEscapedPipe.test(textNode.value)) {
        textNode.value = textNode.value.replace(rxEscapedPipe, '|');
      }
    });

    return SKIP;
  });
};

export default tableCellInlineCode;
