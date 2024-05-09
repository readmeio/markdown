import gemoji from './gemoji';
import codeTabs from './code-tabs';
import image from './image';
import htmlBlock from './html-block';
import { NodeTypes } from '../../enums';

const compilers = {
  handlers: {
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
    [NodeTypes.image]: image,
    [NodeTypes.htmlBlock]: htmlBlock,
  },
};

export default compilers;
