import type { Processor } from 'unified';

import { NodeTypes } from '../../enums';

import callout from './callout';
import codeTabs from './code-tabs';
import compatibility from './compatibility';
import embed from './embed';
import gemoji from './gemoji';
import htmlBlock from './html-block';
import plain from './plain';
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
    ...(mdxish && { [NodeTypes.variable]: variable }),
    embed: compatibility,
    escape: compatibility,
    figure: compatibility,
    html: compatibility,
    i: compatibility,
    plain,
    yaml: compatibility,
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export function mdxishCompilers(this: Processor) {
  return compilers.call(this, true);
}

export default compilers;
