import { visit } from 'unist-util-visit';

const rxEscapedPipe = /\\\|/g;

/**
 * Finds all inline code nodes within table cells and unescapes any escaped pipe
 * chars so that the editor outputs them without escape chars.
 */
const tableCellInlineCode = () => tree => {
  visit(tree, 'tableCell', tableCellNode => {
    visit(tableCellNode, 'inlineCode', inlineCodeNode => {
      if (rxEscapedPipe.test(inlineCodeNode.value)) {
        inlineCodeNode.value = inlineCodeNode.value.replace(rxEscapedPipe, '|');
      }
    });
  });
};

export default tableCellInlineCode;
