import gemoji from './gemoji';
import codeTabs from './code-tabs';
import { NodeTypes } from '../../enums';

const compilers = {
  handlers: {
    [NodeTypes.emoji]: gemoji,
    [NodeTypes.codeTabs]: codeTabs,
  },
};

export default compilers;
