import { formatHProps, getHProps } from "../utils";
import type { Embed } from "types";

const embed = (node: Embed) => {
  const attributes = formatHProps<Embed['data']['hProperties']>(node)
  const props = getHProps<Embed['data']['hProperties']>(node);

  if (node.title !== '@embed') {
    return `<Embed ${attributes} />`
  };

  return `[${node.label}](${props.url} "${node.title}")`
}

export default embed;
