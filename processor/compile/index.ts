import gemoji from './gemoji';
import codeTabs from './code-tabs';
import image from './image';
import htmlBlock from './html-block';
import callout from './callout';
import { NodeTypes } from '../../enums';

function compilers() {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  const handlers = {
    [NodeTypes.callout]: callout,
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
    [NodeTypes.image]: image,
    [NodeTypes.htmlBlock]: htmlBlock,
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export default compilers;
