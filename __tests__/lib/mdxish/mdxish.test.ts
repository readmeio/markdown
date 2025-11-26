import { mdxish } from '../../../lib/mdxish';

describe('mdxish', () => {

    describe('table of contents', () => {
        it('should render a table of contents', () => {
            const md = '# Heading 1\n\n# Heading 2';
            const tree = mdxish(md);
            console.log('tree', JSON.stringify(tree, null, 2));
        });
    });
});