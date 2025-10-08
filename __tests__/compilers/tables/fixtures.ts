export const tableWithInlineCodeWithPipe = {
  type: 'root',
  children: [
    {
      type: 'table',
      children: [
        {
          type: 'tableRow',
          children: [
            {
              type: 'tableHead',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableHead',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'tableRow',
          children: [
            {
              type: 'tableCell',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '`foo | bar`',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableCell',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      align: ['left', 'left'],
    },
  ],
};

export const tableWithPipe = {
  type: 'root',
  children: [
    {
      type: 'table',
      children: [
        {
          type: 'tableRow',
          children: [
            {
              type: 'tableHead',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableHead',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'tableRow',
          children: [
            {
              type: 'tableCell',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: 'foo | bar',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableCell',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      align: ['left', 'left'],
    },
  ],
};

export const jsxTableWithInlineCodeWithPipe = {
  type: 'root',
  children: [
    {
      type: 'table',
      children: [
        {
          type: 'tableRow',
          children: [
            {
              type: 'tableHead',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: 'force\njsx',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableHead',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'tableRow',
          children: [
            {
              type: 'tableCell',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '`foo | bar`',
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableCell',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    {
                      type: 'plain',
                      value: '',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      align: ['left', 'left'],
    },
  ],
};
