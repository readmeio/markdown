import { NodeTypes } from '../../enums';
import { Callout } from '../../types';

const callout = (node: Callout, _, state, info) => {
  const tracker = state.createTracker(info);
  const exit = state.enter(NodeTypes.callout);

  state.join.push(() => 0);
  const value = state.containerFlow(node, tracker.current());
  state.join.pop();

  exit();

  let lines = value.split('\n');

  if (lines.length > 1) {
    const [first, ...rest] = lines;
    lines = [first, '', ...rest];
  }

  let content = lines
    .map((line: string, index: number) => (index > 0 ? `>${line.length > 0 ? ' ' : ''}${line}` : line))
    .join('\n');

  if (content.match(/^[^\n]/)) content = ' ' + content;

  const block = `> ${node.data.hProperties.icon}${content}`;

  return block;
};

export default callout;
