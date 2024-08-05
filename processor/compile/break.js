module.exports = function BreakCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  // @note: We could save this as just '\n' when `correctnewlines: false`, but
  // this is more portable.
  visitors.break = function compile() {
    return '  \n';
  };
};
