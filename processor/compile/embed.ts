import type { Embed } from "types";

const embed = (node: Embed) => {
  // TODO: make this a util
  const attributes = Object.keys(node.data?.hProperties).map(key => `${key}='${node.data?.hProperties[key]}'`).join(' ')
  
  return `<Embed ${attributes} />`;
}

export default embed;
