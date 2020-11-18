module.exports.silenceConsole = fn => {
  const handlers = {
    get: (target, prop) => {
      if (!(prop in target) && prop in console) {
        const spy = jest.spyOn(console, prop).mockImplementation(() => {});
        target[prop] = spy;
      }

      return target[prop];
    },
  };
  const potentialSpies = new Proxy({}, handlers);

  try {
    return fn(potentialSpies);
  } finally {
    Object.values(potentialSpies).forEach(spy => spy.mockRestore());
  }
};
