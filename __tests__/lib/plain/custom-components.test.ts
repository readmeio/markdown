import { hast, plain } from '../../../index';

describe('plain compiler', () => {
  it('should include the title of Accordion', () => {
    const mdx = `
<Accordion title="Title">
  Body
</Accordion>
`;

    expect(plain(hast(mdx))).toContain('Title Body');
  });

  it('should include the title of Card', () => {
    const mdx = `
<Card title="Title">
  Body
</Card>
`;

    expect(plain(hast(mdx))).toContain('Title Body');
  });

  it('should include the title of Tab', () => {
    const mdx = `
<Tab title="Title">
  Body
</Tab>
`;

    expect(plain(hast(mdx))).toContain('Title Body');
  });
});
