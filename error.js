const runtimeError = async () => {
  return new Promise(() => {
    console.log('hi!');
    setTimeout(() => {
      throw new Error('bye!');
    }, 0);
  });
};

try {
  runtimeError();
} catch (e) {
  console.log("wait, don't go");
}
