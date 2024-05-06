import type { Image } from "mdast";

export default function ImageCompiler() {
  const { Compiler } = this;
  const { visitors } = Compiler.prototype;

  const originalImageCompiler = visitors.image;

  visitors.image = function compile(node: Image, ...args: any[]): string {
    if (node.data?.hProperties?.className === 'emoji') return node.title;

    const { align, className, width } = node.data?.hProperties || {};
    const complexImage: boolean = Boolean(width) || Boolean(className) || Boolean(align);
    if (complexImage) return `<Image ${{...node.data?.hProperties}} />`;

    return originalImageCompiler.call(this, node, ...args);
  };
};
