interface Default {
  default: string;
  name: string;
}

export interface Variables {
  defaults: Default[];
  user: Record<string, string>;
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
