/**
 * Get a stable, content-agnostic signature for a DOM node based on its type.
 */
function nodeSignature(node) {
  if (!node) return '';

  if (node.nodeType === Node.ELEMENT_NODE) {
    const attributes = Array.from(node.attributes).map(attr => `${attr.name}=${attr.value}`);
    const attributeString = attributes.length ? `[${attributes.join(',')}]` : '';
    return `${node.nodeName.toLowerCase()}${attributeString}`;
  }

  return node && node.nodeName ? node.nodeName.toLowerCase() : '';
}

/**
 * Get a stable, content-agnostic signature for a list of DOM nodes.
 *
 * @example
 * <div id="example">
 *   <!-- Comment -->
 *   Text <span class="beep">Text</span> Text<br />
 *   <h1 id="boop">Hi</h1>
 * </div>
 *
 * nodeListSignature(document.getElementById('example').childNodes);
 * -> ["#text", "#comment", "#text", "span[class=beep]", "#text", "br", "#text", "h1[id=boop]", "#text"]
 */
export function nodeListSignature(nodeList) {
  return Array.from(nodeList).map(nodeSignature);
}

/**
 * Compare the structural equality of two DOM node lists,
 * ignoring any text content changes.
 */
export function compareNodeListSignatures(a, b) {
  try {
    const isEqual = JSON.stringify(nodeListSignature(a)) === JSON.stringify(nodeListSignature(b));
    return isEqual;
  } catch (error) {
    return false;
  }
}
