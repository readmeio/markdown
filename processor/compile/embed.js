import magicBlock from './magic-block';

function EmbedCompiler(node) {
  const data = node.data.hProperties;
  let { provider = 'embed' } = data;
  provider = provider.replace(/^@/, '');

  return magicBlock('embed', { ...data, provider });
}

export default function EmbedCompilerPlugin() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  visitors.embed = EmbedCompiler;
}
