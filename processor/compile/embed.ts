import type { Embed } from "types";

const embed = (node: Embed) => {
  const { image, favicon, iframe, title, url } = node.data?.hProperties || {};
  const complexEmbed: boolean = Boolean(image) || Boolean(favicon) || iframe;

  if (complexEmbed) {
    const attributes = Object.keys(node.data?.hProperties).map(key => `${key}="${node.data?.hProperties[key]}"`).join(' ')
    // TODO: make this a util
    return `<Embed ${attributes} />`;
  }

  return `[${title}](${url} "@embed")'`;
}

export default embed;
