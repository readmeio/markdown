import { mdast, md } from '../../index';

describe('yaml compiler', () => {
  it('correctly writes out yaml', () => {
    const txt = `
---
title: This is test
author: A frontmatter test
---

Document content!
    `;

    expect(md(mdast(txt))).toBe(`---
title: This is test
author: A frontmatter test
---

Document content!
`);
  });
});
