import callout from './callout';
import codeTabs from './code-tabs';
import embed from './embed';
import gemoji from './gemoji';
import htmlBlock from './html-block';
import image from './image';
import compatibility from './compatibility';
import { NodeTypes } from '../../enums';

function compilers() {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  const handlers = {
    [NodeTypes.callout]: callout,
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
    [NodeTypes.embed]: embed,
    [NodeTypes.htmlBlock]: htmlBlock,
    [NodeTypes.image]: image,
    [NodeTypes.variable]: compatibility,
    [NodeTypes.glossary]: compatibility,
    [NodeTypes.reusableContent]: compatibility,
    html: compatibility,
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export default compilers;
