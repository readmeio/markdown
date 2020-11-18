const consoleStubHandler = {
  get: (target, prop) => {
    if (!(prop in target) && prop in console) {
      const spy = jest.spyOn(console, prop).mockImplementation(() => {});
      target[prop] = spy;
    }

    return target[prop];
  },
};

module.exports.silenceConsole = fn => {
  const potentialSpies = new Proxy({}, consoleStubHandler);

  try {
    return fn(potentialSpies);
  } finally {
    Object.values(potentialSpies).forEach(spy => spy.mockRestore());
  }
};
