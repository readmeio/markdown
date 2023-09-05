import magicBlock from './magic-block';

export default function HtmlBlockCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors['html-block'] = node => {
    const html = node.data.hProperties.html;

    return magicBlock('html', { html });
  };
}
