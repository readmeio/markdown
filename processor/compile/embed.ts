import { formatHProps } from "../utils";
import type { Embed } from "types";

const embed = (node: Embed) => {
  const attributes = formatHProps<Embed['data']['hProperties']>(node)
  return `<Embed ${attributes} />`;
}

export default embed;
