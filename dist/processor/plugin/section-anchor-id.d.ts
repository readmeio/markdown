declare function _exports(): typeof transformer;
export = _exports;
/** Adds an empty <div id=section-slug> next to all headings
 *  for backwards-compatibility with how we used to do slugs.
 */
declare function transformer(ast: any): any;
