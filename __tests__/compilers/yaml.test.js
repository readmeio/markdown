import { mdast, mdx } from '../../index';

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
