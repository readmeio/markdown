/**
 * PascalCase component names that {@link readmeComponentsTransformer} coerces
 * into non-MDX mdast nodes. RMDX `tags()` must omit these so it only reports
 * custom/user components that remain as `mdxJsx*Element` after runSync.
 *
 * Keep in sync with the `types` map and special-cased branches in
 * `processor/transform/readme-components.ts` (`Image`, `Embed`).
 */
export const RMDX_BUILTIN_COMPONENT_TAGS = new Set([
  'Anchor',
  'Callout',
  'Code',
  'CodeTabs',
  'Embed',
  'EmbedBlock',
  'HTMLBlock',
  'Image',
  'ImageBlock',
  'Recipe',
  'Table',
  'TutorialTile',
  'Variable',
]);
