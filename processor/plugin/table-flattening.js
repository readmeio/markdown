import flatMap from 'unist-util-flatmap';

const collectValues = ({ value, children }) => {
  if (value) return value;
  if (children) return children.flatMap(collectValues);
  return '';
};

const valuesToString = node => {
  const values = collectValues(node);
  return Array.isArray(values) ? values.join(' ') : values;
};

// Flattens table values and adds them as a seperate, easily-accessible key within children
const tableFlattening = () => ast =>
  flatMap(ast, node => {
    if (node.tagName === 'table') {
      const [header, body] = node.children;
      // hAST tables are deeply nested with an innumerable amount of children
      // This is necessary to pullout all the relevant strings
      const newNode = [
        {
          ...node,
          children: [
            {
              ...node.children[0],
              value: valuesToString(header),
            },
            {
              ...node.children[1],
              value: valuesToString(body),
            },
          ],
        },
      ];

      return newNode;
    }

    return [node];
  });

export default tableFlattening;
