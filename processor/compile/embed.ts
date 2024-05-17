import type { Embed } from "types";

const embed = (node: Embed) => {
  const { image, favicon, iframe, title, url } = node.data?.hProperties || {};
  const complexEmbed: boolean = Boolean(image) || Boolean(favicon) || iframe;
  if (complexEmbed) return `<Embed ${{...node.data?.hProperties}} />`;

  return `[${title}](${url} "@embed")'}`;
}

export default embed;
