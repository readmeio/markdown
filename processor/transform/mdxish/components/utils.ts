import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { emptyTaskListItemFromMarkdown } from '../../../../lib/mdast-util/empty-task-list-item';
import { legacyVariableFromMarkdown } from '../../../../lib/mdast-util/legacy-variable';
import { mdxComponentFromMarkdown } from '../../../../lib/mdast-util/mdx-component';
import { legacyVariable } from '../../../../lib/micromark/legacy-variable';
import { mdxComponent } from '../../../../lib/micromark/mdx-component';

/**
 * Shared unified processor for re-parsing the body of an MDX-ish component.
 * Used by both the block and inline-block transformers so a nested component
 * (e.g. `<Anchor>text with <b>bold</b></Anchor>`) goes through the same
 * tokenizer chain as the top-level parse.
 */
export const inlineMdProcessor = unified()
  .data('micromarkExtensions', [mdxComponent(), legacyVariable()])
  .data('fromMarkdownExtensions', [mdxComponentFromMarkdown(), legacyVariableFromMarkdown(), emptyTaskListItemFromMarkdown()])
  .use(remarkParse)
  .use(remarkGfm);
