import type { CodeTabs } from '../../types';

import { NodeTypes } from '../../enums';

const codeTabs = (node: CodeTabs, _, state, info) => {
  const exit = state.enter(NodeTypes.codeTabs);
  const tracker = state.createTracker(info);
  state.join.push(() => 0);
  const value = state.containerFlow(node, tracker.current());
  state.join.pop();

  exit();
  return value;
};

export default codeTabs;
