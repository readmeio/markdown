import gemoji from './gemoji';
import codeTabs from './code-tabs';
import { NodeTypes } from '../../enums';
import table from './table';

const handlers = {
  [NodeTypes.emoji]: gemoji,
  [NodeTypes.codeTabs]: codeTabs,
  table,
};

function compilers() {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);

  debugger;
  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export default compilers;
