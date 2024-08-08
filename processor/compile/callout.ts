import { NodeTypes } from '../../enums';
import { Callout } from '../../types';

const callout = (node: Callout, _, state, info) => {
  const exit = state.enter(NodeTypes.callout);
  const tracker = state.createTracker(info);

  tracker.move('> ');
  tracker.shift(2);

  const map = (line: string, index: number, blank: boolean) => {
    return `>${index === 0 ? ` ${node.data.hProperties.icon}` : ''}${blank ? '' : ' '}${line}`;
  };

  const value = state.indentLines(state.containerFlow(node, tracker.current()), map);
  exit();

  return value;
};

export default callout;
