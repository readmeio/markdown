import callout from './callout';
import codeTabs from './code-tabs';
import embed from './embed';
import gemoji from './gemoji';
import htmlBlock from './html-block';
import compatibility from './compatibility';
import variable from './variable';
import { NodeTypes } from '../../enums';

function compilers() {
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
    [NodeTypes.variable]: variable,
    embed: compatibility,
    escape: compatibility,
    figure: compatibility,
    html: compatibility,
    i: compatibility,
    yaml: compatibility,
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export default compilers;
