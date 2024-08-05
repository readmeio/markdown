module.exports.silenceConsole =
  (prop = 'error', impl = () => {}) =>
  fn => {
    let spy;

    try {
      spy = jest.spyOn(console, prop).mockImplementation(impl);

      return fn(spy);
    } finally {
      spy.mockRestore();
    }
  };
