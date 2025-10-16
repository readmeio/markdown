import type { Root } from 'mdast';

import { visit } from 'unist-util-visit';

// Add more visits to migrate other HTML tags here
const migrateHtmlTags = () => (tree: Root) => {
  // A common issue is that <br> tags are not properly closed
  visit(tree, 'html', htmlNode => {
    htmlNode.value = htmlNode.value.replaceAll(/<br(?!\s*\/>)([^>]*?)>/g, '<br$1 />');
  });
};

export default migrateHtmlTags;
