import type { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

// gfm only links `[^a]` if the same parse saw `[^a]:`. A component body parses alone,
// so this hands it the doc's labels, spelled as the mdast `identifier` uppercased.
export const footnoteLabels = (labels: readonly string[]): Extension => ({
  flow: {
    null: [
      {
        tokenize(this: TokenizeContext, _effects: Effects, _ok: State, nok: State) {
          this.parser.gfmFootnotes ??= [];
          const defined = this.parser.gfmFootnotes;
          labels.forEach(label => {
            if (!defined.includes(label)) defined.push(label);
          });
          return (code: Code) => nok(code);
        },
      },
    ],
  },
});
