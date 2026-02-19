import type { Plugin } from 'unified';
import type { Root, Element, Parent } from 'hast';
import { visit, SKIP } from 'unist-util-visit';

const rehypeFixStrayListPunctuation: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node: Element, index: number | undefined, parent: Parent | undefined) => {
      // We are looking for a <p> tag
      if (node.tagName !== 'p' || index === undefined || !parent) return;

      // Find the previous element sibling, ignoring text nodes (like whitespace)
      let prevSiblingIndex = index - 1;
      let prevSibling = parent.children[prevSiblingIndex];
      
      while (prevSibling && prevSibling.type === 'text' && !prevSibling.value.trim()) {
        prevSiblingIndex--;
        prevSibling = parent.children[prevSiblingIndex];
      }

      if (
        !prevSibling || 
        prevSibling.type !== 'element' || 
        (prevSibling.tagName !== 'ul' && prevSibling.tagName !== 'ol')
      ) {
        return;
      }

      // The <p> must contain ONLY punctuation (like a single ".")
      if (node.children.length === 1 && node.children[0].type === 'text') {
        const text = node.children[0].value.trim();
        
        // Check if the text consists entirely of trailing punctuation
        if (/^[.,;:?!]+$/.test(text)) {
          
          // Find the last <li> in the preceding list
          const listItems = prevSibling.children.filter(
            (c) => c.type === 'element' && c.tagName === 'li'
          ) as Element[];
          
          if (listItems.length > 0) {
            const lastLi = listItems[listItems.length - 1];
            
            // Append the punctuation to the last <li>
            lastLi.children.push({
              type: 'text',
              value: text
            });
            
            // Remove the isolated <p>.</p> entirely
            parent.children.splice(index, 1);
            
            // Adjust the visitor index since we mutated the tree
            return [SKIP, index];
          }
        }
      }
    });
  };
};

export default rehypeFixStrayListPunctuation;
