import { Variables } from '../types';

const VariableProxy = (variables: Variables) => {
  const user = variables?.user || {};
  const defaults = variables?.defaults || [];

  return new Proxy(user, {
    get(target, prop) {
      if (prop in target) return target[prop as string];

      const found = defaults.find(d => d.name === prop);
      if (found) return found.default;

      return prop;
    },
  });
};

export default VariableProxy;
