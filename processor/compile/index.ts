import type { Unsafe } from 'mdast-util-to-markdown';
import type { Processor } from 'unified';

import { NodeTypes } from '../../enums';

import anchor from './anchor';
import callout from './callout';
import codeTabs from './code-tabs';
import compatibility from './compatibility';
import embed from './embed';
import gemoji from './gemoji';
import htmlBlock from './html-block';
import listItem from './list-item';
import plain from './plain';
import text from './text';
import variable from './variable';

function compilers(this: Processor, mdxish = false) {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  const handlers = {
    [NodeTypes.callout]: callout,
    [NodeTypes.codeTabs]: codeTabs,
    [NodeTypes.embedBlock]: embed,
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.glossary]: compatibility,
    [NodeTypes.htmlBlock]: htmlBlock,
    [NodeTypes.reusableContent]: compatibility,
    embed: compatibility,
    escape: compatibility,
    figure: compatibility,
    html: compatibility,
    i: compatibility,
    plain,
    yaml: compatibility,

    // needed only for mdxish
    ...(mdxish && { [NodeTypes.anchor]: anchor }),
    ...(mdxish && { listItem }),
    ...(mdxish && { text }),
    ...(mdxish && { [NodeTypes.variable]: variable }),
  };

  // Escape literal braces in mdxish text so they don't parse as (often
  // unterminated) MDX expressions on the next round trip. Routed through the
  // unsafe list so mdast-util-to-markdown handles backslash ordering.
  const unsafe: Unsafe[] = mdxish
    ? [
        { character: '{', inConstruct: 'phrasing' },
        { character: '}', inConstruct: 'phrasing' },
      ]
    : [];

  toMarkdownExtensions.push({ extensions: [{ handlers, unsafe }] });
}

export function mdxishCompilers(this: Processor) {
  return compilers.call(this, true);
}

export default compilers;
