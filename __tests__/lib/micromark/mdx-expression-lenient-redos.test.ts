import { describe, it, expect } from 'vitest';

import { mix } from '../../../lib';

/**
 * ReDoS regression vectors migrated from the former brace-escaping
 * preprocessing. Those pathological template-literal strings targeted the
 * backtracking-prone regexes that carved out HTML/code before escaping braces.
 * That preprocessing is gone; the lenient tokenizer is a single linear scan, so
 * the whole pipeline stays linear. Each vector must render well under budget.
 */
const htmlBlock = (body: string) => `<HTMLBlock>{\`${body}\`}</HTMLBlock>`;

const VECTORS: [string, string][] = [
  ['repeated escape triples', htmlBlock(`${'\\lock\\lock\\'.repeat(100)  }lock`)],
  ['nested quantifier bait', htmlBlock(`${'\\x\\y'.repeat(300)  }z`)],
  ['many consecutive backslashes', htmlBlock(`${'\\'.repeat(1000)  }a`)],
  ['alternating escapes', htmlBlock(`${'\\a\\b'.repeat(200)  }x`)],
  ['complex nested escapes', htmlBlock(`${'\\x\\y\\z\\w'.repeat(150)  }end`)],
  ['very long plain content', htmlBlock('a'.repeat(50000))],
  ['very long escaped content', htmlBlock('\\a'.repeat(10000))],
  ['escaped backticks', htmlBlock(`${'\\`\\`\\`'.repeat(100)  }end`)],
  ['all escape sequences', htmlBlock(`${'\\n\\t\\r\\v\\f\\b\\0\\x00\\u0000'.repeat(500)  }end`)],
  ['unicode escapes', htmlBlock(`${'\\u0041\\u0042'.repeat(300)  }end`)],
  ['mixed valid/invalid escapes', htmlBlock(`${'\\n\\invalid\\t\\also-invalid\\r'.repeat(400)  }end`)],
  ['tabs and newlines', htmlBlock(`${'\\t\\n\\r'.repeat(500)  }end`)],
  ['backslash at every position', htmlBlock(`${'a\\b\\c\\d'.repeat(400)  }end`)],
  ['maximal backtracking bait', htmlBlock(`${'\\x\\y\\z'.repeat(600)  }end`)],
  ['double backslashes', htmlBlock(`${'\\\\'.repeat(1000)  }end`)],
  ['triple backslashes', htmlBlock(`${'\\\\\\'.repeat(800)  }end`)],
  ['alternating escape and long string', htmlBlock(`${`${'\\a'}${'x'.repeat(100)}`.repeat(200)  }end`)],
  ['ten blocks', new Array(10).fill(htmlBlock(`${'\\lock\\lock\\'.repeat(50)  }lock`)).join('\n')],
  ['with attributes', `<HTMLBlock id="test" class="example">{\`${'\\lock\\lock\\'.repeat(200)}lock\`}</HTMLBlock>`],
  ['with many attributes', `<HTMLBlock ${'a="1" b="2" c="3" d="4" e="5" '.repeat(10)}>{\`${'\\lock\\lock\\'.repeat(100)}lock\`}</HTMLBlock>`],
  ['extra inner whitespace', `<HTMLBlock>{   \`${'\\lock\\lock\\'.repeat(100)}lock\`   }</HTMLBlock>`],
  ['inner newlines', `<HTMLBlock>{\n  \`${'\\lock\\lock\\'.repeat(100)}lock\`\n}</HTMLBlock>`],
  ['blank lines around content', `<HTMLBlock>{\n\n\n\`${'\\lock\\lock\\'.repeat(100)}lock\`\n\n\n}</HTMLBlock>`],
  ['long leading whitespace', `<HTMLBlock>{${' '.repeat(10000)}\`${'\\lock\\lock\\'.repeat(50)}lock\`}</HTMLBlock>`],
];

describe('lenient tokenizer ReDoS resistance', () => {
  it.each(VECTORS)('renders under budget: %s', (_name, attack) => {
    const start = Date.now();
    const result = mix(attack);
    const duration = Date.now() - start;

    expect(result).toBeDefined();
    expect(duration).toBeLessThan(10000);
  });
});
