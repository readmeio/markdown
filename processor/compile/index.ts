import gemoji from './gemoji';
import codeTabs from './code-tabs';
import embed from './embed';
import htmlBlock from './html-block';
import image from './image';
import { NodeTypes } from '../../enums';

function compilers() {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  const handlers = {
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
    [NodeTypes.embed]: embed,
    [NodeTypes.htmlBlock]: htmlBlock,
    [NodeTypes.image]: image,
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
};

export default compilers;
