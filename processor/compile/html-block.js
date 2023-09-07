import magicBlock from './magic-block';

export default function HtmlBlockCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['html-block'] = (node, parent) => {
    const html = node.data.hProperties.html;

    return magicBlock('html', { html }, parent);
  };
}
