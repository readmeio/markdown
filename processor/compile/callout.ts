import { NodeTypes } from '../../enums';
import { Callout } from '../../types';

const callout = (node: Callout, _, state, info) => {
  const tracker = state.createTracker(info);
  const exit = state.enter(NodeTypes.callout);

  state.join.push(() => 0);
  const value = state.containerFlow(node, tracker.current());
  state.join.pop();

  exit();

  const [first, ...rest] = value.split('\n');
  const blocks = [first, '', ...rest]
    .map((line: string, index) => (index > 0 ? `>${line.length > 0 ? ' ' : ''}${line}` : line))
    .join('\n');

  const block = `> ${node.data.hProperties.icon} ${blocks}`;

  return block;
};

export default callout;
