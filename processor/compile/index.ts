import gemoji from './gemoji';
import codeTabs from './code-tabs';
import image from './image';
import { NodeTypes } from '../../enums';

const compilers = {
  handlers: {
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
    [NodeTypes.image]: image,
  },
};

export default compilers;
