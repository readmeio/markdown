interface Default {
  name: string;
  default: string;
}

export interface Variables {
  user: Record<string, string>;
  defaults: Default[];
}

const User = (variables?: Variables) => {
  const { user = {}, defaults = [] } = variables || {};

  return new Proxy(user, {
    get(target, attribute) {
      if (typeof attribute === 'symbol') {
        return '';
      }

      if (attribute in target) {
        return target[attribute];
      }

      const def = defaults.find((d: Default) => d.name === attribute);

      return def ? def.default : attribute.toUpperCase();
    },
  });
};

export default User;
