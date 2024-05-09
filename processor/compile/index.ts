import gemoji from './gemoji';
import codeTabs from './code-tabs';
import image from './image';
import { NodeTypes } from '../../enums';

function compilers() {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  const handlers = {
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
    [NodeTypes.image]: image,
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export default compilers;
