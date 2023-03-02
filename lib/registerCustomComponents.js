/* eslint-disable no-param-reassign
 */
import kebabCase from 'lodash.kebabcase';

const registerCustomComponents = (components, sanitize, prefix = 'x') =>
  Object.entries(components).reduce((all, [tag, component]) => {
    /* Sanitize + prefix element names.
     */
    tag = kebabCase(tag);
    const isValidOverride = sanitize.tagNames.includes(tag);
    const isValidElemName = tag.includes('-');
    if (!(isValidElemName || isValidOverride)) tag = `${prefix}-${tag}`;

    /* Safelist custom tag names.
     */
    sanitize.tagNames.push(tag);

    /* Safelist allowed attributes.
     */
    if (component.propTypes)
      sanitize.attributes[tag] = [].concat(sanitize.attributes[tag], Object.keys(component.propTypes)).filter(Boolean);

    /* Add element to custom component store.
     */
    all[tag] = component;

    return all;
  }, {});

export default registerCustomComponents;
