import gemoji from './gemoji';
import codeTabs from './code-tabs';
import { NodeTypes } from '../../enums';
import table from './table';

function compilers() {
  const data = this.data();

  const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);
  let originalTable;
  toMarkdownExtensions.find(plugin =>
    plugin.extensions.find(extension => {
      console.log(extension);
      if (extension.handlers?.table) {
        originalTable = extension.handlers.table;
        return true;
      }
    }),
  );

  const handlers = {
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
    table: table(originalTable),
  };

  toMarkdownExtensions.push({ extensions: [{ handlers }] });
}

export default compilers;
