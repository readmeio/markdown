import gemoji from './gemoji';
import codeTabs from './code-tabs';
import { NodeTypes } from '../../enums';

function compilers() {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  const handlers = {
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export default compilers;
