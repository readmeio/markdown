import { mdast, mdx, mix } from '../../index';

describe('yaml compiler', () => {
  it.skip('correctly writes out yaml', () => {
    const txt = `
---
title: This is test
author: A frontmatter test
---

Document content!
    `;

    expect(mdx(mdast(txt))).toBe(`---
title: This is test
author: A frontmatter test
---

Document content!
`);
  });
});

describe('mix yaml compiler', () => {
  it('correctly handles yaml frontmatter', () => {
    // NOTE: the '---' MUST be at the ABSOLUTE BEGINNING of the file, adding a space or newline will break the parser
    const txt = `--- 
title: This is test
author: A frontmatter test
---

Document content!
    `;

    const html = mix(txt);
    expect(html).not.toContain('---');
    expect(html).not.toContain('title: This is test');
    expect(html).toContain('Document content');
  });
});
