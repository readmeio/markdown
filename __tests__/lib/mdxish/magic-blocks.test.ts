import type { Element } from 'hast';

import { mdxish } from '../../../lib';

describe('mdxish magic blocks', () => {
  describe('image block', () => {
    it('should restore image block', () => {
      const md = `[block:image]
{
"images": [
  {
    "image": [
      "https://files.readme.io/327e65d-image.png",
      null,
      null
    ],
    "align": "left",
    "sizing": "50%"
  }
]
}
[/block]`;

      const ast = mdxish(md);
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('element');

      const imgElement = ast.children[0] as Element;
      expect(imgElement.tagName).toBe('img');
      expect(imgElement.properties.src).toBe('https://files.readme.io/327e65d-image.png');
      expect(imgElement.properties.alt).toBe('');
      expect(imgElement.properties.align).toBe('left');
      expect(imgElement.properties.width).toBe('50%');
    });
  });

  describe('table block', () => {
    it('should restore parameters block to tables', () => {
      const md = `[block:parameters]
${JSON.stringify(
  {
    data: {
      'h-0': 'Term',
      'h-1': 'Definition',
      '0-0': 'Events',
      '0-1': 'Pseudo-list:  \n● One  \n● Two',
    },
    cols: 2,
    rows: 1,
    align: ['left', 'left'],
  },
  null,
  2,
)}
[/block]`;

      const ast = mdxish(md);

      // Some extra children are added to the AST by the mdxish wrapper
      expect(ast.children).toHaveLength(4);
      expect(ast.children[2].type).toBe('element');

      const element = ast.children[2] as Element;
      expect(element.tagName).toBe('table');
      expect(element.children).toHaveLength(2);
      expect((element.children[0] as Element).tagName).toBe('thead');
      expect((element.children[1] as Element).tagName).toBe('tbody');
    });
  })

  describe('embed block', () => {
    it('should restore embed block', () => {
      const md = `[block:embed]
{
  "url": "https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4",
  "provider": "youtube.com",
  "href": "https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4",
  "typeOfEmbed": "youtube"
}
[/block]`;

      const ast = mdxish(md);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('element');

      const element = ast.children[0] as Element;
      expect(element.tagName).toBe('Embed');
      expect(element.properties.url).toBe('https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4');
      expect(element.properties.provider).toBe('youtube.com');
      expect(element.properties.href).toBe('https://www.youtube.com/watch?v=FVikHLyW500&list=RD3-9V38W00CM&index=4');
      expect(element.properties.typeOfEmbed).toBe('youtube');
    });
  });
});
